// src/components/ReadYamlPanel.tsx - Updated with CSV support
import React, { useState } from 'react';
import './ReadYamlPanel.css';

interface ReadYamlPanelProps {
  onFilesSelected: (files: FileList) => void;
  onGenerateReadYaml: () => void;
  onGenerateFromCsv: (writeYamlFile: File, csvPath: string, primaryKeyColumns: string) => Promise<void>;
  selectedFiles: FileList | null;
  isLoading: boolean;
  csvReadLoading: boolean;
}

const ReadYamlPanel: React.FC<ReadYamlPanelProps> = ({
  onFilesSelected,
  onGenerateReadYaml,
  onGenerateFromCsv,
  selectedFiles,
  isLoading,
  csvReadLoading
}) => {
  // State for the tab selection within the Read panel
  const [readTab, setReadTab] = useState<'files' | 'csv'>('files');
  
  // State for CSV read functionality
  const [writeYamlFile, setWriteYamlFile] = useState<File | null>(null);
  const [csvPath, setCsvPath] = useState<string>('');
  const [primaryKeyColumns, setPrimaryKeyColumns] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Handlers for the YAML files tab
  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onFilesSelected(event.target.files);
    }
  };

  // Handlers for the CSV tab
  const handleWriteYamlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setWriteYamlFile(event.target.files[0]);
      setValidationError(null);
    }
  };

  const handleCsvPathChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCsvPath(event.target.value);
    setValidationError(null);
  };

  const handlePrimaryKeyColumnsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPrimaryKeyColumns(event.target.value);
    setValidationError(null);
  };

  const handleSubmitCsv = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validate inputs
    if (!writeYamlFile) {
      setValidationError('Please select a write YAML file');
      return;
    }

    if (!csvPath.trim()) {
      setValidationError('Please provide the CSV file path');
      return;
    }

    if (!primaryKeyColumns.trim()) {
      setValidationError('Please provide at least one primary key column');
      return;
    }

    // All validation passed, call the parent handler
    try {
      await onGenerateFromCsv(writeYamlFile, csvPath, primaryKeyColumns);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  };

  return (
    <div className="read-yaml-panel">
      <div className="panel-header">
        <h2>Generate Read YAML</h2>
      </div>
      
      <div className="read-mode-tabs">
        <button 
          className={`read-mode-tab ${readTab === 'files' ? 'active' : ''}`}
          onClick={() => setReadTab('files')}
        >
          From YAML Files
        </button>
        <button 
          className={`read-mode-tab ${readTab === 'csv' ? 'active' : ''}`}
          onClick={() => setReadTab('csv')}
        >
          From CSV
        </button>
      </div>
      
      <div className="panel-content">
        {/* Content for YAML files tab */}
        {readTab === 'files' && (
          <div className="files-tab-content">
            <div className="file-upload-section">
              <label htmlFor="ingest-files" className="file-upload-label">
                <div className="upload-icon"></div>
                <div className="upload-text">
                  <strong>Upload Ingestion Files</strong>
                  <span>Select multiple YAML files or a ZIP file</span>
                </div>
              </label>
              <input 
                type="file" 
                id="ingest-files" 
                accept=".yaml,.yml,.zip"
                onChange={handleFilesChange}
                className="file-input"
                multiple
              />
              
              {selectedFiles && selectedFiles.length > 0 && (
                <div className="selected-files">
                  <div className="files-count">{selectedFiles.length} file(s) selected:</div>
                  <ul className="files-list">
                    {Array.from(selectedFiles).map((file, index) => (
                      <li key={index} className="selected-file-item">
                        <div className="file-icon">📄</div>
                        <div className="file-details">
                          <div className="file-name">{file.name}</div>
                          <div className="file-size">{formatFileSize(file.size)}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <button 
              className="generate-read-button"
              onClick={onGenerateReadYaml}
              disabled={!selectedFiles || selectedFiles.length === 0 || isLoading}
            >
              {isLoading ? 'Generating...' : 'Generate Read YAML Files'}
            </button>
            
            <div className="note-section">
              <h3>How it works</h3>
              <p>
                Upload one or more NoSQLBench ingestion YAML files, or a ZIP file containing them. 
                The system will analyze these files and generate corresponding read YAML files 
                for each table defined in your ingestion files.
              </p>
            </div>
          </div>
        )}
        
        {/* Content for CSV tab */}
        {readTab === 'csv' && (
          <div className="csv-tab-content">
            <form onSubmit={handleSubmitCsv}>
              <div className="form-group">
                <label htmlFor="write-yaml-file">Upload Write YAML File</label>
                <div className="file-input-wrapper">
                  <input 
                    type="file" 
                    id="write-yaml-file" 
                    accept=".yaml,.yml"
                    onChange={handleWriteYamlChange}
                    className="file-input"
                  />
                  <div className="custom-file-upload">
                    <div className="upload-icon"></div>
                    <div className="upload-text">
                      <span>Select write YAML file</span>
                    </div>
                  </div>
                  {writeYamlFile && (
                    <div className="selected-file">
                      <span className="file-name">{writeYamlFile.name}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="csv-path">CSV File Path</label>
                <input 
                  type="text" 
                  id="csv-path" 
                  value={csvPath}
                  onChange={handleCsvPathChange}
                  placeholder="/path/to/csv/file.csv"
                  className="text-input"
                />
                <div className="help-text">Full path to the CSV file on the server</div>
              </div>
              
              <div className="form-group">
                <label htmlFor="primary-key-columns">Primary Key Column</label>
                <input 
                  type="text" 
                  id="primary-key-columns" 
                  value={primaryKeyColumns}
                  onChange={handlePrimaryKeyColumnsChange}
                  placeholder="sessionid"
                  className="text-input"
                />
                <div className="help-text">Primary key column for the WHERE clause (e.g., sessionid)</div>
              </div>
              
              {validationError && (
                <div className="validation-error">{validationError}</div>
              )}
              
              <button 
                type="submit"
                className="generate-read-button"
                disabled={csvReadLoading}
              >
                {csvReadLoading ? 'Generating...' : 'Generate Read YAML from CSV'}
              </button>
            </form>
            
            <div className="note-section">
              <h3>How it works</h3>
              <p>
                This mode generates a read YAML file that uses a CSV file with your test data.
                Upload a write YAML file, specify the path to your CSV file on the server,
                and provide the primary key column to be used in the WHERE clause.
              </p>
              <p>
                The generated read YAML will use CSVSampler to select values from your 
                data file when running read operations, creating realistic query patterns.
              </p>
              <div className="code-example">
                <pre>
{`scenarios:
  default:
    read1: run driver=cql tags='block:read1' cycles==TEMPLATE(read-cycles,1000) threads=auto

bindings:
  sessionid: CSVSampler('sessionid','sessionid-weight','/path/to/csv/file.csv');

blocks:
  read1:
    params:
      cl: TEMPLATE(read_cl,LOCAL_QUORUM)
      instrument: true
      prepared: true
    ops:
      read_by_sessionid: |
        SELECT sessionid, insertedtimestamp
        FROM <<keyspace:baselines>>.table_name
        WHERE sessionid = {sessionid}
        LIMIT 1;`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return bytes + ' bytes';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  } else {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}

export default ReadYamlPanel;