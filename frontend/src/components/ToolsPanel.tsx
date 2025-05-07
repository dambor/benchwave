// frontend/src/components/ToolsPanel.tsx
import React, { useState } from 'react';
import './ToolsPanel.css';
import DSBulkUtility from './DSBulkUtility';
import NB5Executor from './NB5Executor';
import CDMUtility from './CDMUtility';
import TableList from './TableList';
import ConfigurationPanel from './ConfigurationPanel';
import ReadYamlPanel from './ReadYamlPanel';
import { Configuration, SchemaInfo } from '../types';

// Define the GeneratedYamlFile interface here
interface GeneratedYamlFile {
  filename: string;
  content: string;
  table_name: string;
}

interface ToolsPanelProps {
  schema: SchemaInfo | null;
  setSchemaInfo: (schema: SchemaInfo) => void;
  generatedYamlFiles?: GeneratedYamlFile[]; // Make it optional with proper typing
  configuration: Configuration;
  onConfigChange: (config: Partial<Configuration>) => void;
  selectedTables: string[];
  onTableSelect: (tableName: string, isSelected: boolean) => void;
  onSelectAll: (isSelected: boolean) => void;
  onGenerateYaml: () => void;
  onDownloadTable: (tableName: string) => void;
  onGenerateReadYaml: () => void;
  onGenerateFromCsv: (writeYamlFile: File, csvPath: string, primaryKeyColumns: string, readCycles?: number) => Promise<void>;
  onFilesSelected: (files: FileList) => void;
  selectedFiles: FileList | null;
  isLoading: boolean;
  readYamlLoading: boolean;
  csvReadLoading: boolean;
  setError: (error: string | null) => void;
}

const ToolsPanel: React.FC<ToolsPanelProps> = ({ 
  schema, 
  setSchemaInfo,
  generatedYamlFiles = [], // Default to empty array with proper typing
  configuration,
  onConfigChange,
  selectedTables,
  onTableSelect,
  onSelectAll,
  onGenerateYaml,
  onDownloadTable,
  onGenerateReadYaml,
  onGenerateFromCsv,
  onFilesSelected,
  selectedFiles,
  isLoading,
  readYamlLoading,
  csvReadLoading,
  setError
}) => {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [selectedKeyspace, setSelectedKeyspace] = useState<string>('');
  const [schemaFile, setSchemaFile] = useState<File | null>(null);
  const [schemaLoading, setSchemaLoading] = useState<boolean>(false);
  const [nbExecutionMode, setNbExecutionMode] = useState<'write' | 'read'>('write');
  
  // Base API URL - change this if your backend is running on a different port
  const API_BASE_URL = 'http://localhost:8000';
  
  // Extract keyspaces and tables from schema if it exists
  const keyspaces = schema ? Object.keys(schema.keyspaces) : [];
  
  // Transform tables data for the tool components
  const tablesList = schema ? Object.entries(schema.tables).map(([fullName, details]: [string, any]) => {
    // Extract primary key columns
    const primaryKeys: string[] = [];
    if (details.primary_key && details.primary_key.length > 0) {
      details.primary_key.forEach((group: string[]) => {
        group.forEach((key: string) => {
          primaryKeys.push(key);
        });
      });
    }
    
    return {
      keyspace: details.keyspace,
      name: details.name,
      primary_keys: primaryKeys
    };
  }) : [];
  
  const handleToolSelect = (toolName: string) => {
    setActiveTool(toolName === activeTool ? null : toolName);
    setSelectedKeyspace(''); // Reset keyspace selection when changing tools

    // Set the NB5 execution mode based on the selected tool
    if (toolName === 'nb5-loader') {
      setNbExecutionMode('write');
    } else if (toolName === 'nb5-reader') {
      setNbExecutionMode('read');
    }

    if (toolName !== activeTool) {
      onSelectAll(false); // Clear table selection when switching tools
    }
  };
  
  const handleKeyspaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newKeyspace = e.target.value;
    setSelectedKeyspace(newKeyspace);
    onSelectAll(false); // Clear table selection when changing keyspace
  };

  // File upload handlers
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

    setSchemaLoading(true);
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
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setSchemaLoading(false);
    }
  };
  
  return (
    <div className="tools-panel">
      <h2>Migration Flow</h2>
      
      {activeTool ? (
        // Display the active tool
        <div className="active-tool-container">
          <div className="tool-header-container">
            <div className="tool-header">
              <button 
                className="back-button"
                onClick={() => {
                  // Logic to navigate to previous step
                  if (activeTool === 'write-yaml-generator') {
                    // First step, go back to tools overview
                    handleToolSelect('null');
                  } else if (activeTool === 'nb5-loader') {
                    handleToolSelect('write-yaml-generator');
                  } else if (activeTool === 'dsbulk') {
                    handleToolSelect('nb5-loader');
                  } else if (activeTool === 'read-yaml-generator') {
                    handleToolSelect('dsbulk');
                  } else if (activeTool === 'nb5-reader') {
                    handleToolSelect('read-yaml-generator');
                  } else if (activeTool === 'cdm') {
                    handleToolSelect('nb5-reader');
                  }
                }}
              >
                &larr; Previous Step
              </button>
              
              <div className="step-title">
                <div className="step-number">
                  Step {activeTool === 'write-yaml-generator' ? '1' : 
                        activeTool === 'nb5-loader' ? '2' : 
                        activeTool === 'dsbulk' ? '3' : 
                        activeTool === 'read-yaml-generator' ? '4' : 
                        activeTool === 'nb5-reader' ? '5' : '6'} of 6:
                </div>
                <h2>
                  {activeTool === 'write-yaml-generator' ? 'Generate Write YAML Files' : 
                  activeTool === 'nb5-loader' ? 'Run NB5 Loader' : 
                  activeTool === 'dsbulk' ? 'DSBulk Unload' : 
                  activeTool === 'read-yaml-generator' ? 'Generate Read YAML Files' : 
                  activeTool === 'nb5-reader' ? 'Run NB5 Reader' : 'Migrate Data with CDM'}
                </h2>
              </div>
              
              <button 
                className="next-button"
                onClick={() => {
                  // Logic to navigate to next step
                  if (activeTool === 'write-yaml-generator') {
                    handleToolSelect('nb5-loader');
                  } else if (activeTool === 'nb5-loader') {
                    handleToolSelect('dsbulk');
                  } else if (activeTool === 'dsbulk') {
                    handleToolSelect('read-yaml-generator');
                  } else if (activeTool === 'read-yaml-generator') {
                    handleToolSelect('nb5-reader');
                  } else if (activeTool === 'nb5-reader') {
                    handleToolSelect('cdm');
                  } else if (activeTool === 'cdm') {
                    // Last step, go back to tools overview
                    handleToolSelect('null');
                  }
                }}
              >
                {activeTool === 'cdm' ? 'Finish' : 'Next Step'} &rarr;
              </button>
            </div>
          </div>
          
          {activeTool === 'write-yaml-generator' && (
            <div className="write-yaml-tool">
              <h3>Generate Write YAML Files</h3>
              <p className="tool-description">
                Generate NoSQLBench YAML files for selected tables in your Cassandra schema.
                These files can be used to create ingestion workloads for performance testing.
              </p>
              
              {!schema ? (
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
                    disabled={!schemaFile || schemaLoading}
                  >
                    {schemaLoading ? 'Parsing...' : 'Parse Schema'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="keyspace-selector">
                    <label htmlFor="keyspace-dropdown">Select Keyspace:</label>
                    <select 
                      id="keyspace-dropdown"
                      value={selectedKeyspace}
                      onChange={handleKeyspaceChange}
                      className="keyspace-dropdown"
                    >
                      <option value="">All Keyspaces</option>
                      {keyspaces.map(keyspace => (
                        <option key={keyspace} value={keyspace}>{keyspace}</option>
                      ))}
                    </select>
                  </div>
                  
                  <TableList 
                    tables={Object.entries(schema.tables)
                      .filter(([_, table]: [string, any]) => {
                        return !selectedKeyspace || table.keyspace === selectedKeyspace;
                      })
                      .map(([fullName, details]: [string, any]) => ({ 
                        fullName,
                        ...details 
                      }))}
                    selectedTables={selectedTables}
                    onTableSelect={onTableSelect}
                    onSelectAll={onSelectAll}
                    keyspace={selectedKeyspace}
                    onDownloadTable={onDownloadTable}
                  />
                  
                  <ConfigurationPanel 
                    configuration={configuration}
                    onConfigChange={onConfigChange}
                  />
                  
                  <button 
                    className="generate-button"
                    onClick={onGenerateYaml}
                    disabled={selectedTables.length === 0 || isLoading}
                  >
                    {isLoading ? 'Generating...' : 'Generate Write YAML Files'}
                  </button>
                </>
              )}
            </div>
          )}
          
          {activeTool === 'nb5-loader' && (
            <div className="nb5-loader-tool">
              <h3>Run NB5 Loader</h3>
              <p className="tool-description">
                Execute NoSQLBench write workloads to load data into your Cassandra database.
              </p>
              
              <NB5Executor
                generatedYamlFiles={generatedYamlFiles}
                schemaInfo={schema}
                executionMode="write"
              />
            </div>
          )}
          
          {activeTool === 'dsbulk' && (
            <div className="dsbulk-tool">
              <h3>DSBulk Unload</h3>
              <p className="tool-description">
                Export data from your Cassandra database using DSBulk to prepare for read testing.
              </p>
              
              <DSBulkUtility 
                keyspaces={keyspaces} 
                tables={tablesList} 
              />
            </div>
          )}
          
          {activeTool === 'read-yaml-generator' && (
            <div className="read-yaml-tool">
              <h3>Generate Read YAML Files</h3>
              <p className="tool-description">
                Create read workload YAML files from existing write YAML files and CSV data.
                These files can be used for read performance testing with realistic data patterns.
              </p>
              
              <ReadYamlPanel 
                onFilesSelected={onFilesSelected}
                onGenerateReadYaml={onGenerateReadYaml}
                onGenerateFromCsv={onGenerateFromCsv}
                selectedFiles={selectedFiles}
                isLoading={readYamlLoading}
                csvReadLoading={csvReadLoading}
              />
            </div>
          )}
          
          {activeTool === 'nb5-reader' && (
            <div className="nb5-reader-tool">
              <h3>Run NB5 Reader</h3>
              <p className="tool-description">
                Execute NoSQLBench read workloads to test performance with realistic data access patterns.
              </p>
              
              <NB5Executor
                generatedYamlFiles={generatedYamlFiles.filter(file => file.filename.includes('read'))}
                schemaInfo={schema}
                executionMode="read"
              />
            </div>
          )}
          
          {activeTool === 'cdm' && (
            <div className="cdm-tool">
              <h3>Migrate Data with CDM</h3>
              <p className="tool-description">
                Transfer data between Cassandra tables with validation and comprehensive monitoring.
              </p>
              
              <CDMUtility
                keyspaces={keyspaces}
                tables={tablesList}
              />
            </div>
          )}
        </div>
      ) : (
        // Display the tools grid in the new order
                  <div className="tools-container">
          <div 
            className="tool-card"
            onClick={() => handleToolSelect('write-yaml-generator')}
          >
            <div className="tool-icon yaml-generator-icon"></div>
            <h3>1. Generate Write YAML Files</h3>
            <p>Create NoSQLBench write workload YAML files from your Cassandra schema</p>
            <button className="tool-button">Launch Tool</button>
          </div>

          <div 
            className="tool-card"
            onClick={() => handleToolSelect('nb5-loader')}
          >
            <div className="tool-icon nb5-icon"></div>
            <h3>2. Run NB5 Loader</h3>
            <p>Execute NoSQLBench write workloads to load data into your database</p>
            <button className="tool-button">Launch Tool</button>
          </div>
          
          <div 
            className="tool-card"
            onClick={() => handleToolSelect('dsbulk')}
          >
            <div className="tool-icon dsbulk-icon"></div>
            <h3>3. DSBulk Unload</h3>
            <p>Export data from your database to prepare for read testing</p>
            <button className="tool-button">Launch Tool</button>
          </div>
          
          <div 
            className="tool-card"
            onClick={() => handleToolSelect('read-yaml-generator')}
          >
            <div className="tool-icon read-yaml-icon"></div>
            <h3>4. Generate Read YAML Files</h3>
            <p>Create read workload YAML files from write YAMLs and CSV data</p>
            <button className="tool-button">Launch Tool</button>
          </div>

          <div 
            className="tool-card"
            onClick={() => handleToolSelect('nb5-reader')}
          >
            <div className="tool-icon nb5-reader-icon"></div>
            <h3>5. Run NB5 Reader</h3>
            <p>Execute NoSQLBench read workloads to test performance</p>
            <button className="tool-button">Launch Tool</button>
          </div>
          
          <div 
            className="tool-card"
            onClick={() => handleToolSelect('cdm')}
          >
            <div className="tool-icon cdm-icon"></div>
            <h3>6. Migrate Data with CDM</h3>
            <p>Transfer data between tables with validation and monitoring</p>
            <button className="tool-button">Launch Tool</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsPanel;