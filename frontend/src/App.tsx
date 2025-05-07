// src/App.tsx
import React, { useState, useEffect } from 'react';
import './App.css';
import KeyspaceList from './components/KeyspaceList';
import TableList from './components/TableList';
import ConfigurationPanel from './components/ConfigurationPanel';
import ReadYamlPanel from './components/ReadYamlPanel';
import ToolsPanel from './components/ToolsPanel'; // Import the ToolsPanel component
import GeneratedFilesList from './components/GeneratedFilesList';
import { SchemaInfo, Table, Keyspace, Configuration, GeneratedYamlFile } from './types';
import './components/ToolsPanel.css';
import './components/SettingsPanel.css';

// Base API URL - change this if your backend is running on a different port
const API_BASE_URL = 'http://localhost:8000';

function App() {
  // Existing states
  const [schemaFile, setSchemaFile] = useState<File | null>(null);
  const [schemaInfo, setSchemaInfo] = useState<SchemaInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKeyspace, setSelectedKeyspace] = useState<string>('');
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [configuration, setConfiguration] = useState<Configuration>({
    numCycles: 1000000,
    numThreads: 0, // 0 means auto
    consistencyLevel: 'ONE'
  });
  
  // States for the read mode
  const [activeMode, setActiveMode] = useState<'write' | 'read'>('write');
  const [selectedIngestFiles, setSelectedIngestFiles] = useState<FileList | null>(null);
  const [readYamlLoading, setReadYamlLoading] = useState<boolean>(false);
  const [csvReadLoading, setCsvReadLoading] = useState<boolean>(false);
  
  // State for generated files
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedYamlFile[]>([]);
  const [showGeneratedFiles, setShowGeneratedFiles] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSchemaFile(event.target.files[0]);
      setError(null);
    }
  };

  const handleParseSchema = async () => {
    if (!schemaFile) {
      setError('Please select a schema file first');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('schema_file', schemaFile);

    try {
      // Using the correct endpoint for parsing schema
      const response = await fetch(`${API_BASE_URL}/api/parse-schema`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to parse schema');
      }

      const data = await response.json();
      setSchemaInfo(data);
      
      // If there's only one keyspace, select it automatically
      const keyspaces = Object.keys(data.keyspaces);
      if (keyspaces.length === 1) {
        setSelectedKeyspace(keyspaces[0]);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyspaceSelect = (keyspace: string) => {
    setSelectedKeyspace(keyspace);
    setSelectedTables([]);
    
    // Clear table selections when switching to tools section
    if (keyspace === 'tools') {
      // You can add any tool-specific initialization here if needed
    }
  };  

  const handleTableSelect = (tableName: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedTables(prev => [...prev, tableName]);
    } else {
      setSelectedTables(prev => prev.filter(t => t !== tableName));
    }
  };

  const handleSelectAllTables = (isSelected: boolean) => {
    if (!schemaInfo) return;
    
    if (isSelected) {
      // Select all tables in the current keyspace
      const tablesInKeyspace = Object.entries(schemaInfo.tables)
        .filter(([_, table]) => !selectedKeyspace || table.keyspace === selectedKeyspace)
        .map(([fullName, _]) => fullName);
      
      setSelectedTables(tablesInKeyspace);
    } else {
      setSelectedTables([]);
    }
  };

  const handleConfigChange = (config: Partial<Configuration>) => {
    setConfiguration(prev => ({ ...prev, ...config }));
  };

  const handleGenerateYaml = async () => {
    if (!schemaInfo || selectedTables.length === 0) {
      setError('Please select at least one table');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedFiles([]);

    const formData = new FormData();
    formData.append('schema_json', JSON.stringify(schemaInfo));
    formData.append('table_selection', JSON.stringify(selectedTables));
    
    // Add configuration parameters
    formData.append('num_cycles', configuration.numCycles.toString());
    formData.append('num_threads', configuration.numThreads.toString());
    formData.append('consistency_level', configuration.consistencyLevel);

    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-yaml`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate YAML files');
      }

      // Parse the JSON response
      const data = await response.json();
      
      // Update the state with generated files
      setGeneratedFiles(data.files || []);
      setShowGeneratedFiles(true);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handler for downloading a single file
  const handleDownloadSingleFile = (file: GeneratedYamlFile) => {
    const blob = new Blob([file.content], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Handler for downloading all files as individual files
  const handleDownloadAllFiles = () => {
    generatedFiles.forEach(file => {
      handleDownloadSingleFile(file);
    });
  };

  // Handler for directly downloading a single table YAML using the correct endpoint
  const handleDownloadTableYaml = async (tableName: string) => {
    if (!schemaInfo) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('schema_json', JSON.stringify(schemaInfo));
      formData.append('table_name', tableName);
      
      // Add configuration parameters
      formData.append('num_cycles', configuration.numCycles.toString());
      formData.append('num_threads', configuration.numThreads.toString());
      formData.append('consistency_level', configuration.consistencyLevel);
      
      const response = await fetch(`${API_BASE_URL}/api/generate-yaml-single`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to generate YAML file');
      }
      
      // Get the file name from the content-disposition header or use a default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `${tableName.split('.').pop() || 'table'}.yaml`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      // Get the blob and create a download link
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handler for multiple ingest files
  const handleIngestFilesChange = (files: FileList) => {
    setSelectedIngestFiles(files);
    setError(null);
  };

  // Handler for generating read YAML from multiple files
  const handleGenerateReadYaml = async () => {
    if (!selectedIngestFiles || selectedIngestFiles.length === 0) {
      setError('Please select ingestion YAML files');
      return;
    }

    setReadYamlLoading(true);
    setError(null);
    setGeneratedFiles([]);

    const formData = new FormData();
    
    // Add each selected file to the form data with the field name 'files'
    for (let i = 0; i < selectedIngestFiles.length; i++) {
      formData.append('files', selectedIngestFiles[i]);
    }
    
    // Add configuration parameters
    formData.append('num_cycles', configuration.numCycles.toString());
    formData.append('num_threads', configuration.numThreads.toString());
    formData.append('consistency_level', configuration.consistencyLevel);

    try {
      const response = await fetch(`${API_BASE_URL}/api/process-multiple-files`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process ingestion files');
      }

      // Parse the JSON response
      const data = await response.json();
      
      // Update the state with generated files
      setGeneratedFiles(data.files || []);
      setShowGeneratedFiles(true);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setReadYamlLoading(false);
    }
  };

  // Generate read YAML locally to avoid server issues
  const generateReadYamlLocally = (
    writeYamlFile: File, 
    csvPath: string, 
    primaryKeyColumns: string,
    readCycles: number = 1000
  ): Promise<{filename: string, content: string, table_name: string}> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const writeYamlContent = event.target?.result as string;
          
          // Extract keyspace and table name from the write YAML
          let keyspace = 'baselines'; // Default keyspace
          let tableName = '';
          
          // Try to extract table name from CREATE TABLE statement
          const createTableMatch = writeYamlContent.match(/CREATE\s+TABLE\s+if\s+not\s+exists\s+<<keyspace:([^>]+)>>\.(\w+)/i);
          if (createTableMatch) {
            keyspace = createTableMatch[1];
            tableName = createTableMatch[2];
          } else {
            // Try alternative pattern
            const altMatch = writeYamlContent.match(/CREATE\s+TABLE\s+if\s+not\s+exists\s+(\w+)\.(\w+)/i);
            if (altMatch) {
              keyspace = altMatch[1];
              tableName = altMatch[2];
            }
          }
          
          // If still no table name, try to extract from INSERT statement
          if (!tableName) {
            const insertMatch = writeYamlContent.match(/insert\s+into\s+<<keyspace:([^>]+)>>\.(\w+)/i);
            if (insertMatch) {
              keyspace = insertMatch[1];
              tableName = insertMatch[2];
            } else {
              // Try alternative pattern
              const altInsertMatch = writeYamlContent.match(/insert\s+into\s+(\w+)\.(\w+)/i);
              if (altInsertMatch) {
                keyspace = altInsertMatch[1];
                tableName = altInsertMatch[2];
              }
            }
          }
          
          // If still no table name, use the file name
          if (!tableName) {
            const fileName = writeYamlFile.name;
            tableName = fileName.split('.')[0].replace('_write', '');
          }
          
          // Parse primary key columns
          const pkColumns = primaryKeyColumns.split(',').map(col => col.trim());
          
          if (pkColumns.length === 0) {
            reject(new Error('At least one primary key column must be specified'));
            return;
          }
          
          // Generate the read YAML content
          const primaryKeyColumn = pkColumns[0]; // Use the first column for the CSVSampler
          const selectedColumns = [...pkColumns, 'insertedtimestamp'].join(', ');
          
          const readYamlContent = `scenarios:
  default:
    read1: run driver=cql tags='block:read1' cycles==TEMPLATE(read-cycles,${readCycles}) threads=auto

bindings:
  ${primaryKeyColumn}: CSVSampler('${primaryKeyColumn}','${primaryKeyColumn}-weight','${csvPath}');

blocks:
  read1:
    params:
      cl: TEMPLATE(read_cl,LOCAL_QUORUM)
      instrument: true
      prepared: true
    ops:
      read_by_${primaryKeyColumn}: |
        SELECT ${selectedColumns}
        FROM <<keyspace:${keyspace}>>.${tableName}
        WHERE ${primaryKeyColumn} = {${primaryKeyColumn}}
        LIMIT 1;
`;

          // Create the filename
          const baseName = writeYamlFile.name.replace('.yaml', '').replace('.yml', '');
          const filename = `${baseName}_read.yaml`;
          
          resolve({
            filename,
            content: readYamlContent,
            table_name: tableName
          });
          
        } catch (error) {
          reject(new Error(`Failed to generate read YAML: ${error}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading the file'));
      };
      
      reader.readAsText(writeYamlFile);
    });
  };

  // Handler for generating read YAML from CSV
  const handleGenerateFromCsv = async (writeYamlFile: File, csvPath: string, primaryKeyColumns: string, readCycles?: number) => {
    setCsvReadLoading(true);
    setError(null);
    setGeneratedFiles([]);

    try {
      // Use the local generator instead of making a backend request
      const generatedYaml = await generateReadYamlLocally(
        writeYamlFile, 
        csvPath, 
        primaryKeyColumns,
        readCycles || configuration.numCycles
      );
      
      // Update the state with the generated file
      setGeneratedFiles([generatedYaml]);
      setShowGeneratedFiles(true);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setCsvReadLoading(false);
    }
  };

  // Handler for closing the generated files view
  const handleCloseGeneratedFiles = () => {
    setShowGeneratedFiles(false);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>NoSQLBench Schema Generator</h1>
      </header>
      
      <div className="upload-section">
        <div className="file-upload">
          <label htmlFor="schema-file">
            <i className="document-icon"></i>
            Upload Cassandra Schema
          </label>
          <input 
            type="file" 
            id="schema-file" 
            accept=".cql,.txt,.zip"
            onChange={handleFileChange}
          />
          {schemaFile && <span className="file-name">{schemaFile.name}</span>}
        </div>
        
        <button 
          className="parse-button"
          onClick={handleParseSchema}
          disabled={!schemaFile || loading}
        >
          {loading ? 'Parsing...' : 'Parse Schema'}
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}


      {schemaInfo && (
        <div className="main-content">
          <div className="left-panel">
            <KeyspaceList 
              keyspaces={Object.entries(schemaInfo.keyspaces).map(([name, details]) => ({ 
                name, 
                ...details 
              }))}
              selectedKeyspace={selectedKeyspace}
              onKeyspaceSelect={handleKeyspaceSelect}
            />
          </div>
          
          <div className="right-panel">
          
          {selectedKeyspace === 'tools' ? (
              // Tools panel content - pass the schema info to ToolsPanel
              <ToolsPanel 
                schema={schemaInfo} 
                generatedYamlFiles={generatedFiles}
              />
            ) : selectedKeyspace === 'settings' ? (
              // Settings panel content
              <div className="settings-panel">
                <h2>Application Settings</h2>
                <div className="settings-container">
                  <div className="settings-section">
                    <h3>Connection Settings</h3>
                    <div className="settings-row">
                      <label htmlFor="cassandra-host">Cassandra Host</label>
                      <input type="text" id="cassandra-host" placeholder="localhost" />
                    </div>
                    <div className="settings-row">
                      <label htmlFor="cassandra-port">Cassandra Port</label>
                      <input type="number" id="cassandra-port" placeholder="9042" />
                    </div>
                    <div className="settings-row">
                      <label htmlFor="cassandra-username">Username</label>
                      <input type="text" id="cassandra-username" placeholder="cassandra" />
                    </div>
                    <div className="settings-row">
                      <label htmlFor="cassandra-password">Password</label>
                      <input type="password" id="cassandra-password" />
                    </div>
                  </div>
                  
                  <div className="settings-section">
                    <h3>Application Settings</h3>
                    <div className="settings-row">
                      <label htmlFor="theme-select">Theme</label>
                      <select id="theme-select">
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="system">System Default</option>
                      </select>
                    </div>
                    <div className="settings-row">
                      <label htmlFor="yaml-path">Default YAML Export Path</label>
                      <div className="input-with-button">
                        <input type="text" id="yaml-path" placeholder="/path/to/yamls" />
                        <button className="browse-button">Browse</button>
                      </div>
                    </div>
                    <div className="settings-row checkbox-row">
                      <input type="checkbox" id="auto-select" />
                      <label htmlFor="auto-select">Auto-select tables when keyspace is selected</label>
                    </div>
                  </div>
                </div>
                
                <div className="settings-actions">
                  <button className="save-settings-button">Save Settings</button>
                  <button className="reset-settings-button">Reset to Defaults</button>
                </div>
              </div>
            ) : (
              // Regular keyspace/table view          
              <>
                <TableList 
                  tables={Object.entries(schemaInfo.tables)
                    .filter(([_, table]) => !selectedKeyspace || table.keyspace === selectedKeyspace)
                    .map(([fullName, details]) => ({ 
                      fullName,
                      ...details 
                    }))}
                  selectedTables={selectedTables}
                  onTableSelect={handleTableSelect}
                  onSelectAll={handleSelectAllTables}
                  keyspace={selectedKeyspace}
                />
                
                <ConfigurationPanel 
                  configuration={configuration}
                  onConfigChange={handleConfigChange}
                />
                
                <button 
                  className="generate-button"
                  onClick={handleGenerateYaml}
                  disabled={selectedTables.length === 0 || loading}
                >
                  {loading ? 'Generating...' : 'Generate NoSQLBench YAML Files'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Show generated files overlay when files are ready */}
      {showGeneratedFiles && (
        <div className="generated-files-overlay">
          <GeneratedFilesList 
            files={generatedFiles}
            onDownloadFile={handleDownloadSingleFile}
            onDownloadAll={handleDownloadAllFiles}
            onClose={handleCloseGeneratedFiles}
          />
        </div>
      )}
    </div>
  );
}

export default App;