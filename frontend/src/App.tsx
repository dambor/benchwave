// src/App.tsx
import React, { useState, useEffect } from 'react';
import './App.css';
import KeyspaceList from './components/KeyspaceList';
import TableList from './components/TableList';
import ConfigurationPanel from './components/ConfigurationPanel';
import { SchemaInfo, Table, Keyspace, Configuration } from './types';

function App() {
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
      const response = await fetch('http://localhost:8000/api/parse-schema', {
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
        .filter(([_, table]) => table.keyspace === selectedKeyspace)
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

    const formData = new FormData();
    formData.append('schema_json', JSON.stringify(schemaInfo));
    formData.append('table_selection', JSON.stringify(selectedTables));

    try {
      const response = await fetch('http://localhost:8000/api/generate-yaml', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate YAML files');
      }

      // Get the zip file from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create a download link and trigger it
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nosqlbench_yamls.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
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
            accept=".cql,.txt"
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
          </div>
        </div>
      )}
    </div>
  );
}

export default App;