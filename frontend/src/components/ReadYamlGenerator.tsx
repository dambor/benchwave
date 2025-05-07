// src/components/CsvReadGenerator.tsx
import React, { useState } from 'react';
import './CsvReadGenerator.css';

interface CsvReadGeneratorProps {
  onGenerateFromCsv: (writeYamlFile: File, csvPath: string, primaryKeyColumns: string) => Promise<void>;
  isLoading: boolean;
}

const CsvReadGenerator: React.FC<CsvReadGeneratorProps> = ({
  onGenerateFromCsv,
  isLoading
}) => {
  const [writeYamlFile, setWriteYamlFile] = useState<File | null>(null);
  const [csvPath, setCsvPath] = useState<string>('');
  const [primaryKeyColumns, setPrimaryKeyColumns] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

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

  const handleSubmit = async (event: React.FormEvent) => {
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
    <div className="csv-read-generator">
      <div className="panel-header">
        <h2>Generate Read YAML from Write YAML and CSV</h2>
      </div>
      
      <div className="panel-content">
        <form onSubmit={handleSubmit}>
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
            <label htmlFor="csv-path">DSBulk CSV File Path</label>
            <input 
              type="text" 
              id="csv-path" 
              value={csvPath}
              onChange={handleCsvPathChange}
              placeholder="/path/to/dsbulk/export.csv"
              className="text-input"
            />
            <div className="help-text">Full path to the CSV file on the server</div>
          </div>
          
          <div className="form-group">
            <label htmlFor="primary-key-columns">Primary Key Columns</label>
            <input 
              type="text" 
              id="primary-key-columns" 
              value={primaryKeyColumns}
              onChange={handlePrimaryKeyColumnsChange}
              placeholder="id,timestamp,etc"
              className="text-input"
            />
            <div className="help-text">Comma-separated list of primary key column names</div>
          </div>
          
          {validationError && (
            <div className="validation-error">{validationError}</div>
          )}
          
          <button 
            type="submit"
            className="generate-button"
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Generate Read YAML'}
          </button>
        </form>
        
        <div className="info-section">
          <h3>How it works</h3>
          <p>
            This tool generates a read YAML file based on a write YAML file and a CSV file exported from DSBulk.
            It analyzes the write YAML to extract table structure, then creates read operations using the 
            primary key columns you specify in the WHERE clause.
          </p>
          <p>
            The CSV file must exist on the server at the path you specify and must contain all the 
            primary key columns you list.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CsvReadGenerator;