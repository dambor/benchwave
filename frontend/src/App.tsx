// src/App.tsx
import React, { useState } from 'react';
import './App.css';
import KeyspaceList from './components/KeyspaceList';
import TableList from './components/TableList';
import ConfigurationPanel from './components/ConfigurationPanel';
import ReadYamlGenerator from './components/ReadYamlGenerator';
import { SchemaInfo, Configuration } from './types';

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
  const [activeTab, setActiveTab] = useState<'ingest' | 'read'>('ingest');
  
  // States for tracking generated ingest YAMLs and read YAML generation
  const [generatedIngestYamls, setGeneratedIngestYamls] = useState<{ name: string, content: string, tables: string[] }[]>([]);
  const [selectedIngestYaml, setSelectedIngestYaml] = useState<{ name: string, content: string, tables: string[] } | null>(null);
  const [showReadYamlForm, setShowReadYamlForm] = useState<boolean>(false);
  const [dsbulkCsvPath, setDsbulkCsvPath] = useState<string>('');
  const [keyspace, setKeyspace] = useState<string>('baselines');
  const [readYamlLoading, setReadYamlLoading] = useState<boolean>(false);
  const [readYamlError, setReadYamlError] = useState<string | null>(null);
  const [showReadYamlPreview, setShowReadYamlPreview] = useState<boolean>(false);
  const [readYamlPreview, setReadYamlPreview] = useState<string>('');

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

      // Store information about the generated YAML for potential read YAML generation
      const yamlName = `ingest_yaml_${new Date().toISOString().replace(/[:.]/g, '_')}`;
      setGeneratedIngestYamls(prev => [...prev, { 
        name: yamlName, 
        content: 'Generated Ingest YAML', // Placeholder since we don't have the actual content
        tables: [...selectedTables]
      }]);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectIngestYaml = (yamlInfo: { name: string, content: string, tables: string[] }) => {
    setSelectedIngestYaml(yamlInfo);
    setShowReadYamlForm(true);
    // Reset other related states
    setDsbulkCsvPath('');
    setReadYamlError(null);
    setShowReadYamlPreview(false);
  };

  const handleDsbulkPathChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDsbulkCsvPath(event.target.value);
    setReadYamlError(null);
  };

  const handleKeyspaceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setKeyspace(event.target.value);
  };

  const handlePreviewReadYaml = async () => {
    if (!validateReadYamlInputs()) return;
    
    setReadYamlLoading(true);
    setReadYamlError(null);

    try {
      // Create a File object from the selected ingest YAML content
      const ingestYamlFile = new File(
        [selectedIngestYaml!.content], 
        `${selectedIngestYaml!.name}.yaml`, 
        { type: 'application/x-yaml' }
      );

      const formData = new FormData();
      formData.append('ingest_yaml_file', ingestYamlFile);
      formData.append('dsbulk_csv_path', dsbulkCsvPath);
      formData.append('keyspace', keyspace);

      const response = await fetch('http://localhost:8000/api/generate-read-yaml', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate read YAML file');
      }

      // Get the YAML content as text for preview
      const yamlContent = await response.text();
      setReadYamlPreview(yamlContent);
      setShowReadYamlPreview(true);
    } catch (error) {
      setReadYamlError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setReadYamlLoading(false);
    }
  };

  const handleGenerateReadYaml = async () => {
    // If preview is visible, we can download from the preview
    if (showReadYamlPreview) {
      downloadReadYamlFromPreview();
      return;
    }
    
    if (!validateReadYamlInputs()) return;
    
    setReadYamlLoading(true);
    setReadYamlError(null);

    try {
      // Create a File object from the selected ingest YAML content
      const ingestYamlFile = new File(
        [selectedIngestYaml!.content], 
        `${selectedIngestYaml!.name}.yaml`, 
        { type: 'application/x-yaml' }
      );

      const formData = new FormData();
      formData.append('ingest_yaml_file', ingestYamlFile);
      formData.append('dsbulk_csv_path', dsbulkCsvPath);
      formData.append('keyspace', keyspace);

      const response = await fetch('http://localhost:8000/api/generate-read-yaml', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate read YAML file');
      }

      // Get the YAML file from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create a download link and trigger it
      const a = document.createElement('a');
      a.href = url;
      a.download = `read_${selectedIngestYaml!.name}.yaml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setReadYamlError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setReadYamlLoading(false);
    }
  };

  const downloadReadYamlFromPreview = () => {
    // Create a blob from the preview content
    const blob = new Blob([readYamlPreview], { type: 'application/x-yaml' });
    const url = window.URL.createObjectURL(blob);
    
    // Create a download link and trigger it
    const a = document.createElement('a');
    a.href = url;
    a.download = `read_${selectedIngestYaml!.name}.yaml`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const validateReadYamlInputs = () => {
    if (!selectedIngestYaml) {
      setReadYamlError('Please select an ingest YAML file');
      return false;
    }
    
    if (!dsbulkCsvPath.trim()) {
      setReadYamlError('Please enter the path to the DSBulk CSV file');
      return false;
    }
    
    return true;
  };

  const closeReadYamlPreview = () => {
    setShowReadYamlPreview(false);
    setReadYamlPreview('');
  };

  const cancelReadYamlGeneration = () => {
    setShowReadYamlForm(false);
    setSelectedIngestYaml(null);
    setDsbulkCsvPath('');
    setReadYamlError(null);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>NoSQLBench Schema Generator</h1>
      </header>
      
      {/* Tab Navigation */}
      <div className="tabs">
        <button 
          className={`tab-button ${activeTab === 'ingest' ? 'active' : ''}`}
          onClick={() => setActiveTab('ingest')}
        >
          Generate Ingest YAML
        </button>
        <button 
          className={`tab-button ${activeTab === 'read' ? 'active' : ''}`}
          onClick={() => setActiveTab('read')}
        >
          Generate Read YAML
        </button>
      </div>
      
      {/* Ingest YAML Generator Tab */}
      {activeTab === 'ingest' && (
        <>
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

                {/* Display Generated Ingest YAMLs if any */}
                {generatedIngestYamls.length > 0 && (
                  <div className="generated-yamls-section">
                    <h3>Generated Ingest YAMLs</h3>
                    <div className="generated-yamls-list">
                      {generatedIngestYamls.map((yaml, index) => (
                        <div 
                          key={index} 
                          className={`yaml-item ${selectedIngestYaml === yaml ? 'selected' : ''}`}
                          onClick={() => handleSelectIngestYaml(yaml)}
                        >
                          <span className="yaml-icon"></span>
                          <div className="yaml-details">
                            <span className="yaml-name">{yaml.name}</span>
                            <span className="yaml-tables">{yaml.tables.length} tables</span>
                          </div>
                          <button className="action-button">Generate Read YAML</button>
                        </div>
                      ))}
                    </div>

                    {/* Read YAML Generation Form */}
                    {showReadYamlForm && selectedIngestYaml && (
                      <div className="read-yaml-form">
                        <div className="form-header">
                          <h3>Generate Read YAML from {selectedIngestYaml.name}</h3>
                          <button className="close-button" onClick={cancelReadYamlGeneration}>×</button>
                        </div>
                        
                        <div className="form-body">
                          <div className="form-group">
                            <label htmlFor="dsbulk-csv-path">DSBulk CSV File Path</label>
                            <input 
                              type="text" 
                              id="dsbulk-csv-path" 
                              value={dsbulkCsvPath}
                              onChange={handleDsbulkPathChange}
                              placeholder="/path/to/dsbulk/export.csv"
                              className="text-input"
                            />
                            <div className="help-text">Full path to the DSBulk CSV file containing the primary key values</div>
                          </div>
                          
                          <div className="form-group">
                            <label htmlFor="keyspace">Keyspace (Optional)</label>
                            <input 
                              type="text" 
                              id="keyspace" 
                              value={keyspace}
                              onChange={handleKeyspaceChange}
                              placeholder="baselines"
                              className="text-input"
                            />
                            <div className="help-text">Defaults to 'baselines' if not specified</div>
                          </div>
                        </div>
                        
                        {readYamlError && <div className="error-message">{readYamlError}</div>}
                        
                        <div className="form-actions">
                          <button 
                            className="preview-button"
                            onClick={handlePreviewReadYaml}
                            disabled={readYamlLoading || !dsbulkCsvPath.trim()}
                          >
                            {readYamlLoading ? 'Generating...' : 'Preview YAML'}
                          </button>
                          
                          <button 
                            className="generate-button"
                            onClick={handleGenerateReadYaml}
                            disabled={readYamlLoading || !dsbulkCsvPath.trim()}
                          >
                            {readYamlLoading ? 'Generating...' : 'Generate & Download'}
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Read YAML Preview Modal */}
                    {showReadYamlPreview && (
                      <div className="yaml-preview-overlay">
                        <div className="yaml-preview-container">
                          <div className="yaml-preview-header">
                            <h3>Read YAML Preview</h3>
                            <button className="close-button" onClick={closeReadYamlPreview}>×</button>
                          </div>
                          <div className="yaml-preview-content">
                            <pre>{readYamlPreview}</pre>
                          </div>
                          <div className="yaml-preview-footer">
                            <button 
                              className="download-button"
                              onClick={downloadReadYamlFromPreview}
                            >
                              Download YAML
                            </button>
                            <button 
                              className="cancel-button"
                              onClick={closeReadYamlPreview}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Read YAML Generator Tab */}
      {activeTab === 'read' && (
        <ReadYamlGenerator />
      )}
    </div>
  );
}

export default App;