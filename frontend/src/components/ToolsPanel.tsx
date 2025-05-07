// frontend/src/components/ToolsPanel.tsx
import React, { useState } from 'react';
import './ToolsPanel.css';
import DSBulkUtility from './DSBulkUtility';
import NB5Executor from './NB5Executor';
import CDMUtility from './CDMUtility';
import TableList from './TableList';
import ConfigurationPanel from './ConfigurationPanel';
import ReadYamlPanel from './ReadYamlPanel';
import { Configuration } from '../types';

// Define the GeneratedYamlFile interface here
interface GeneratedYamlFile {
  filename: string;
  content: string;
  table_name: string;
}

interface ToolsPanelProps {
  schema: any;
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
}

const ToolsPanel: React.FC<ToolsPanelProps> = ({ 
  schema, 
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
  csvReadLoading
}) => {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [selectedKeyspace, setSelectedKeyspace] = useState<string>('');
  
  // Extract keyspaces and tables from schema
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
    if (toolName !== activeTool) {
      onSelectAll(false); // Clear table selection when switching tools
    }
  };
  
  const handleKeyspaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newKeyspace = e.target.value;
    setSelectedKeyspace(newKeyspace);
    onSelectAll(false); // Clear table selection when changing keyspace
  };
  
  return (
    <div className="tools-panel">
      <h2>NoSQLBench Tools</h2>
      
      {activeTool ? (
        // Display the active tool
        <div className="active-tool-container">
          <div className="tool-header">
            <button 
              className="back-button"
              onClick={() => handleToolSelect('null')}
            >
              &larr; Back to Tools
            </button>
          </div>
          
          {activeTool === 'yaml-generator' && (
            <div className="write-yaml-tool">
              <h3>Write YAML Generator</h3>
              <p className="tool-description">
                Generate NoSQLBench YAML files for selected tables in your Cassandra schema.
                These files can be used to create ingestion workloads for performance testing.
              </p>
              
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
                {isLoading ? 'Generating...' : 'Generate NoSQLBench YAML Files'}
              </button>
            </div>
          )}
          
          {activeTool === 'read-yaml-generator' && (
            <div className="read-yaml-tool">
              <h3>Read YAML Generator</h3>
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
          
          {activeTool === 'dsbulk' && (
            <DSBulkUtility 
              keyspaces={keyspaces} 
              tables={tablesList} 
            />
          )}
          
          {activeTool === 'nb5' && (
            <NB5Executor
              generatedYamlFiles={generatedYamlFiles}
              schemaInfo={schema}
            />
          )}
          
          {activeTool === 'cdm' && (
            <CDMUtility
              keyspaces={keyspaces}
              tables={tablesList}
            />
          )}
        </div>
      ) : (
        // Display the tools grid
        <div className="tools-container">
          <div 
            className="tool-card"
            onClick={() => handleToolSelect('yaml-generator')}
          >
            <div className="tool-icon yaml-generator-icon"></div>
            <h3>Write YAML Generator</h3>
            <p>Generate NoSQLBench write workload YAML files from your Cassandra schema</p>
            <button className="tool-button">Launch Tool</button>
          </div>

          <div 
            className="tool-card"
            onClick={() => handleToolSelect('read-yaml-generator')}
          >
            <div className="tool-icon read-yaml-icon"></div>
            <h3>Read YAML Generator</h3>
            <p>Create read workload YAML files from write YAMLs and CSV data</p>
            <button className="tool-button">Launch Tool</button>
          </div>
          
          <div 
            className="tool-card"
            onClick={() => handleToolSelect('nb5')}
          >
            <div className="tool-icon nb5-icon"></div>
            <h3>NB5 Executor</h3>
            <p>Execute and monitor NoSQLBench 5 workloads directly from the UI</p>
            <button className="tool-button">Launch Tool</button>
          </div>
          
          <div 
            className="tool-card"
            onClick={() => handleToolSelect('dsbulk')}
          >
            <div className="tool-icon dsbulk-icon"></div>
            <h3>DSBulk Utility</h3>
            <p>Generate DSBulk commands for high-performance data loading and unloading</p>
            <button className="tool-button">Launch Tool</button>
          </div>
          
          <div 
            className="tool-card"
            onClick={() => handleToolSelect('cdm')}
          >
            <div className="tool-icon cdm-icon"></div>
            <h3>Cassandra Data Migration</h3>
            <p>Migrate data between tables with validation and monitoring features</p>
            <button className="tool-button">Launch Tool</button>
          </div>
          
          <div className="tool-card">
            <div className="tool-icon analyzer-icon"></div>
            <h3>Schema Analyzer</h3>
            <p>Analyze your Cassandra schema and get optimization recommendations</p>
            <button className="tool-button">Coming Soon</button>
          </div>
          
          <div className="tool-card">
            <div className="tool-icon validator-icon"></div>
            <h3>YAML Validator</h3>
            <p>Validate your NoSQLBench YAML files for syntax and logic errors</p>
            <button className="tool-button">Coming Soon</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsPanel;