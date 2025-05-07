// frontend/src/components/DSBulkUtility.tsx
import React, { useState, useEffect } from 'react';
import './DSBulkUtility.css';

interface DSBulkProps {
  keyspaces: string[];
  tables: {
    keyspace: string;
    name: string;
    primary_keys: string[];
  }[];
}

const DSBulkUtility: React.FC<DSBulkProps> = ({ keyspaces, tables }) => {
  // State for form inputs
  const [keyspace, setKeyspace] = useState<string>('');
  const [table, setTable] = useState<string>('');
  const [primaryKey, setPrimaryKey] = useState<string>('');
  const [outputPath, setOutputPath] = useState<string>('/tmp/export.csv');
  const [limit, setLimit] = useState<number>(1000000);
  const [operation, setOperation] = useState<'unload' | 'load' | 'count'>('unload');
  
  // State for UI
  const [filteredTables, setFilteredTables] = useState<typeof tables>([]);
  const [availablePrimaryKeys, setAvailablePrimaryKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [commandOutput, setCommandOutput] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  
  // Filter tables when keyspace changes
  useEffect(() => {
    if (keyspace) {
      const filtered = tables.filter(t => t.keyspace === keyspace);
      setFilteredTables(filtered);
      
      // Reset table selection if current selection is not in filtered list
      if (filtered.length > 0 && !filtered.some(t => t.name === table)) {
        setTable('');
      }
    } else {
      setFilteredTables([]);
      setTable('');
    }
  }, [keyspace, tables, table]);
  
  // Update primary keys when table changes
  useEffect(() => {
    if (keyspace && table) {
      const selectedTable = tables.find(t => t.keyspace === keyspace && t.name === table);
      if (selectedTable) {
        setAvailablePrimaryKeys(selectedTable.primary_keys);
        
        // Reset primary key if not in available keys
        if (selectedTable.primary_keys.length > 0 && !selectedTable.primary_keys.includes(primaryKey)) {
          setPrimaryKey('');
        }
      }
    } else {
      setAvailablePrimaryKeys([]);
      setPrimaryKey('');
    }
  }, [keyspace, table, tables, primaryKey]);
  
  const handleOperationChange = (op: 'unload' | 'load' | 'count') => {
    setOperation(op);
    // Clear command output when changing operation
    setCommandOutput('');
  };
  
  const handleGenerateCommand = async () => {
    // Validate inputs
    if (!keyspace || !table) {
      setError('Please select both keyspace and table');
      return;
    }
    
    if (operation === 'unload' && !primaryKey) {
      setError('Please select a primary key column');
      return;
    }
    
    if (operation === 'unload' && !outputPath) {
      setError('Please specify an output path');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Prepare form data for the request
      const formData = new FormData();
      formData.append('keyspace', keyspace);
      formData.append('table', table);
      formData.append('operation', operation);
      
      if (operation === 'unload') {
        formData.append('primary_key', primaryKey);
        formData.append('output_path', outputPath);
        formData.append('limit', limit.toString());
      }
      
      // Make API request
      const response = await fetch('http://localhost:8000/api/dsbulk/generate-commands', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error generating DSBulk command');
      }
      
      const data = await response.json();
      setCommandOutput(data.command);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDownloadScript = async () => {
    // Validate inputs
    if (!keyspace || !table || !primaryKey || !outputPath) {
      setError('Please fill in all required fields');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Prepare form data for the request
      const formData = new FormData();
      formData.append('keyspace', keyspace);
      formData.append('table', table);
      formData.append('primary_key', primaryKey);
      formData.append('output_path', outputPath);
      formData.append('limit', limit.toString());
      
      // Make API request
      const response = await fetch('http://localhost:8000/api/dsbulk/download-script', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Error generating DSBulk script');
      }
      
      // Create a download link
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dsbulk_unload_${keyspace}_${table}.sh`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopyCommand = () => {
    if (commandOutput) {
      navigator.clipboard.writeText(commandOutput)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
        });
    }
  };
  
  return (
    <div className="dsbulk-utility">
      <h3>DSBulk Utility</h3>
      
      <div className="operation-tabs">
        <button 
          className={`operation-tab ${operation === 'unload' ? 'active' : ''}`}
          onClick={() => handleOperationChange('unload')}
        >
          Unload (Export)
        </button>
        <button 
          className={`operation-tab ${operation === 'load' ? 'active' : ''}`}
          onClick={() => handleOperationChange('load')}
        >
          Load (Import)
        </button>
        <button 
          className={`operation-tab ${operation === 'count' ? 'active' : ''}`}
          onClick={() => handleOperationChange('count')}
        >
          Count
        </button>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="dsbulk-keyspace">Keyspace</label>
          <select 
            id="dsbulk-keyspace"
            value={keyspace}
            onChange={(e) => setKeyspace(e.target.value)}
          >
            <option value="">Select a keyspace</option>
            {keyspaces.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="dsbulk-table">Table</label>
          <select 
            id="dsbulk-table"
            value={table}
            onChange={(e) => setTable(e.target.value)}
            disabled={!keyspace}
          >
            <option value="">Select a table</option>
            {filteredTables.map(t => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      {operation === 'unload' && (
        <>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dsbulk-primary-key">Primary Key Column</label>
              <select 
                id="dsbulk-primary-key"
                value={primaryKey}
                onChange={(e) => setPrimaryKey(e.target.value)}
                disabled={!table}
              >
                <option value="">Select a primary key</option>
                {availablePrimaryKeys.map(pk => (
                  <option key={pk} value={pk}>{pk}</option>
                ))}
              </select>
              <div className="help-text">The primary key column to export</div>
            </div>
            
            <div className="form-group">
              <label htmlFor="dsbulk-limit">Row Limit</label>
              <input 
                type="number"
                id="dsbulk-limit"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                min="1"
              />
              <div className="help-text">Maximum number of rows to export</div>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="dsbulk-output-path">Output Path</label>
            <input 
              type="text"
              id="dsbulk-output-path"
              value={outputPath}
              onChange={(e) => setOutputPath(e.target.value)}
              placeholder="/path/to/output.csv"
            />
            <div className="help-text">Path where the exported CSV file will be saved</div>
          </div>
        </>
      )}
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="button-row">
        <button 
          className="generate-button"
          onClick={handleGenerateCommand}
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : 'Generate Command'}
        </button>
        
        {operation === 'unload' && (
          <button 
            className="download-button"
            onClick={handleDownloadScript}
            disabled={isLoading || !keyspace || !table || !primaryKey || !outputPath}
          >
            Download Shell Script
          </button>
        )}
      </div>
      
      {commandOutput && (
        <div className="command-display">
          <div className="command-header">
            <h4>DSBulk Command</h4>
            <button className="copy-button" onClick={handleCopyCommand}>
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
          <pre className="command-content">{commandOutput}</pre>
        </div>
      )}
      
      <div className="info-section">
        <h4>About DSBulk</h4>
        <p>
          DSBulk is a powerful command-line utility for efficient loading and unloading of data
          to and from Apache Cassandra® and DataStax Enterprise databases.
        </p>
        <p>
          This tool helps you generate the correct DSBulk commands based on your schema
          information. You can then run these commands in your terminal to perform data operations.
        </p>
      </div>
    </div>
  );
};

export default DSBulkUtility;