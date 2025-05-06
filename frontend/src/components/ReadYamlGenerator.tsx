// src/components/ReadYamlGenerator.tsx
import React, { useState } from 'react';
import './ReadYamlGenerator.css';

interface ReadYamlGeneratorProps {
  // No props needed for now, but we maintain the interface for future extensibility
}

const ReadYamlGenerator: React.FC<ReadYamlGeneratorProps> = () => {
  const [ingestYamlFile, setIngestYamlFile] = useState<File | null>(null);
  const [dsbulkCsvPath, setDsbulkCsvPath] = useState<string>('');
  const [keyspace, setKeyspace] = useState<string>('baselines');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setIngestYamlFile(event.target.files[0]);
      setError(null);
    }
  };

  const handleDsbulkPathChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDsbulkCsvPath(event.target.value);
    setError(null);
  };

  const handleKeyspaceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setKeyspace(event.target.value);
  };

  const handleGenerateReadYaml = async () => {
    // Validate inputs
    if (!ingestYamlFile) {
      setError('Please select an ingest YAML file');
      return;
    }
    
    if (!dsbulkCsvPath.trim()) {
      setError('Please enter the path to the DSBulk CSV file');
      return;
    }
    
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('ingest_yaml_file', ingestYamlFile);
    formData.append('dsbulk_csv_path', dsbulkCsvPath);
    formData.append('keyspace', keyspace);

    try {
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
      a.download = `read_${ingestYamlFile.name}`;
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
    <div className="read-yaml-generator">
      <h2>Generate Read YAML</h2>
      <p className="description">
        Create a NoSQLBench read YAML file from an existing ingest YAML and DSBulk CSV file.
      </p>

      <div className="form-container">
        <div className="form-group">
          <label htmlFor="ingest-yaml-file">
            <span className="file-icon"></span>
            Upload Ingest YAML File
          </label>
          <input 
            type="file" 
            id="ingest-yaml-file" 
            accept=".yaml,.yml"
            onChange={handleFileChange}
            className="file-input"
          />
          {ingestYamlFile && (
            <div className="file-info">
              <span className="file-name">{ingestYamlFile.name}</span>
              <span className="file-size">
                ({Math.round(ingestYamlFile.size / 1024)} KB)
              </span>
            </div>
          )}
        </div>

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

        {error && <div className="error-message">{error}</div>}

        <button 
          className="generate-button"
          onClick={handleGenerateReadYaml}
          disabled={loading || !ingestYamlFile || !dsbulkCsvPath.trim()}
        >
          {loading ? 'Generating...' : 'Generate Read YAML'}
        </button>
      </div>
    </div>
  );
};

export default ReadYamlGenerator;