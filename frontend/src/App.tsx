// src/App.tsx - Updated to integrate CSV functionality into Read mode
import React, { useState, useEffect } from 'react';
import './App.css';
import KeyspaceList from './components/KeyspaceList';
import TableList from './components/TableList';
import ConfigurationPanel from './components/ConfigurationPanel';
import ReadYamlPanel from './components/ReadYamlPanel';
import GeneratedFilesList from './components/GeneratedFilesList';
import { SchemaInfo, Table, Keyspace, Configuration, GeneratedYamlFile } from './types';

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

  // Handler for generating read YAML from CSV
  const handleGenerateFromCsv = async (writeYamlFile: File, csvPath: string, primaryKeyColumns: string) => {
    setCsvReadLoading(true);
    setError(null);
    setGeneratedFiles([]);

    const formData = new FormData();
    formData.append('write_yaml_file', writeYamlFile);
    formData.append('csv_path', csvPath);
    formData.append('primary_key_columns', primaryKeyColumns);
    
    // Add configuration parameters
    formData.append('num_cycles', configuration.numCycles.toString());
    formData.append('num_threads', configuration.numThreads.toString());
    formData.append('consistency_level', configuration.consistencyLevel);

    try {
      // Using the JSON endpoint to get the generated YAML content
      const response = await fetch(`${API_BASE_URL}/api/generate-read-from-write-csv-json`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate read YAML from CSV');
      }

      // Parse the JSON response
      const data = await response.json();
      
      // Create a standard format for the generated files list
      const formattedFiles: GeneratedYamlFile[] = [
        {
          filename: data.filename || 'read.yaml',
          content: data.content || '',
          table_name: data.table_name || 'unknown_table'
        }
      ];
      
      // Update the state with generated files
      setGeneratedFiles(formattedFiles);
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
            {/* Mode Selection Tabs */}
            <div className="mode-tabs">
              <button 
                className={`mode-tab ${activeMode === 'write' ? 'active' : ''}`}
                onClick={() => setActiveMode('write')}
              >
                Write Mode
              </button>
              <button 
                className={`mode-tab ${activeMode === 'read' ? 'active' : ''}`}
                onClick={() => setActiveMode('read')}
              >
                Read Mode
              </button>
            </div>
            
            {/* Generated Files Overlay */}
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
            
            {/* Write Mode Content */}
            {activeMode === 'write' && !showGeneratedFiles && (
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
                  onDownloadTable={handleDownloadTableYaml}
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
            
            {/* Read Mode Content - Updated with internal tabs for YAML files and CSV */}
            {activeMode === 'read' && !showGeneratedFiles && (
              <ReadYamlPanel 
                onFilesSelected={handleIngestFilesChange}
                onGenerateReadYaml={handleGenerateReadYaml}
                onGenerateFromCsv={handleGenerateFromCsv}
                selectedFiles={selectedIngestFiles}
                isLoading={readYamlLoading}
                csvReadLoading={csvReadLoading}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;