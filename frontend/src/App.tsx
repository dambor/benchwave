// src/App.tsx
import React, { useState, useEffect } from 'react';
import './App.css';
import ToolsPanel from './components/ToolsPanel';
import GeneratedFilesList from './components/GeneratedFilesList';
import { SchemaInfo, Table, Keyspace, Configuration, GeneratedYamlFile } from './types';
import './components/ToolsPanel.css';
import './components/SettingsPanel.css';

// Base API URL - change this if your backend is running on a different port
const API_BASE_URL = 'http://localhost:8000';

function App() {
  // States for schema and tables
  const [schemaInfo, setSchemaInfo] = useState<SchemaInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [configuration, setConfiguration] = useState<Configuration>({
    numCycles: 1000000,
    numThreads: 0, // 0 means auto
    consistencyLevel: 'ONE'
  });
  
  // States for read YAML functionality
  const [selectedIngestFiles, setSelectedIngestFiles] = useState<FileList | null>(null);
  const [readYamlLoading, setReadYamlLoading] = useState<boolean>(false);
  const [csvReadLoading, setCsvReadLoading] = useState<boolean>(false);
  
  // State for generated files
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedYamlFile[]>([]);
  const [showGeneratedFiles, setShowGeneratedFiles] = useState<boolean>(false);

  const handleSetSchemaInfo = (schema: SchemaInfo) => {
    setSchemaInfo(schema);
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
      // Select all tables in the specified keyspace
      const keyspace = "";  // Default to all keyspaces since sidebar is removed
      const tablesInKeyspace = Object.entries(schemaInfo.tables)
        .filter(([_, table]) => !keyspace || table.keyspace === keyspace)
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
        <h1>NoSQLBench Flow</h1>
      </header>
      
      <div className="main-content-full">
        {/* Directly render the ToolsPanel as the main content */}
        <ToolsPanel 
          schema={schemaInfo}
          setSchemaInfo={handleSetSchemaInfo}
          generatedYamlFiles={generatedFiles}
          configuration={configuration}
          onConfigChange={handleConfigChange}
          selectedTables={selectedTables}
          onTableSelect={handleTableSelect}
          onSelectAll={handleSelectAllTables}
          onGenerateYaml={handleGenerateYaml}
          onDownloadTable={handleDownloadTableYaml}
          onGenerateReadYaml={handleGenerateReadYaml}
          onGenerateFromCsv={handleGenerateFromCsv}
          onFilesSelected={handleIngestFilesChange}
          selectedFiles={selectedIngestFiles}
          isLoading={loading}
          readYamlLoading={readYamlLoading}
          csvReadLoading={csvReadLoading}
          setError={setError}
        />

        {error && <div className="error-message">{error}</div>}
      </div>

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