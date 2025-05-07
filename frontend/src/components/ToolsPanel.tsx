// frontend/src/components/ToolsPanel.tsx
import React, { useState } from 'react';
import './ToolsPanel.css';
import DSBulkUtility from './DSBulkUtility';
import NB5Executor from './NB5Executor';
//import { GeneratedYamlFile } from '../types'; // Import the type
import './NB5Executor.css';

// Define the GeneratedYamlFile interface here
interface GeneratedYamlFile {
  filename: string;
  content: string;
  table_name: string;
}

interface ToolsPanelProps {
  schema: any;
  generatedYamlFiles?: GeneratedYamlFile[]; // Make it optional with proper typing
}



const ToolsPanel: React.FC<ToolsPanelProps> = ({ 
  schema, 
  generatedYamlFiles = [] // Default to empty array with proper typing
}) => {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  
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
              onClick={() => setActiveTool(null)}
            >
              &larr; Back to Tools
            </button>
          </div>
          
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
        </div>
      ) : (
        // Display the tools grid
        <div className="tools-container">
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
          
          <div className="tool-card">
            <div className="tool-icon performance-icon"></div>
            <h3>Performance Estimator</h3>
            <p>Estimate performance metrics based on your schema and workload</p>
            <button className="tool-button">Coming Soon</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsPanel;