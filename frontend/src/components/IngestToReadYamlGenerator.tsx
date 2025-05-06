// src/components/IngestToReadYamlGenerator.tsx
import React, { useState } from 'react';
import FileUploader from './FileUploader';
import './IngestToReadYamlGenerator.css';

interface IngestToReadYamlGeneratorProps {
  // No props needed for now, but we maintain the interface for future extensibility
}

const IngestToReadYamlGenerator: React.FC<IngestToReadYamlGeneratorProps> = () => {
  const [ingestYamlFile, setIngestYamlFile] = useState<File | null>(null);
  const [dsbulkCsvPath, setDsbulkCsvPath] = useState<string>('');
  const [keyspace, setKeyspace] = useState<string>('baselines');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [ingestYamls, setIngestYamls] = useState<File[]>([]);
  const [selectedIngestYaml, setSelectedIngestYaml] = useState<File | null>(null);

  const handleFileChange = (file: File) => {
    setIngestYamlFile(file);
    // Add to our list of ingest YAMLs if not already present
    if (!ingestYamls.some(f => f.name === file.name && f.size === file.size)) {
      setIngestYamls(prev => [...prev, file]);
    }
    setSelectedIngestYaml(file);
    setError(null);
  };

  const handleDsbulkPathChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDsbulkCsvPath(event.target.value);
    setError(null);
  };

  const handleKeyspaceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setKeyspace(event.target.value);
  };

  const handleSelectedIngestYaml = (file: File) => {
    setSelectedIngestYaml(file);
    setIngestYamlFile(file);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handlePreview = async () => {
    // Validate inputs
    if (!validateInputs()) return;
    
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('ingest_yaml_file', ingestYamlFile!);
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
      setPreviewContent(yamlContent);
      setShowPreview(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReadYaml = async () => {
    // If preview is visible, we can download the already generated content
    if (showPreview) {
      downloadYamlFromPreview();
      return;
    }
    
    // Otherwise, validate and generate new YAML
    if (!validateInputs()) return;
    
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('ingest_yaml_file', ingestYamlFile!);
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
      a.download = `read_${ingestYamlFile!.name}`;
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

  const downloadYamlFromPreview = () => {
    // Create a blob from the preview content
    const blob = new Blob([previewContent], { type: 'application/x-yaml' });
    const url = window.URL.createObjectURL(blob);
    
    // Create a download link and trigger it
    const a = document.createElement('a');
    a.href = url;
    a.download = `read_${ingestYamlFile!.name}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const validateInputs = () => {
    if (!ingestYamlFile) {
      setError('Please select an ingest YAML file');
      return false;
    }
    
    if (!dsbulkCsvPath.trim()) {
      setError('Please enter the path to the DSBulk CSV file');
      return false;
    }
    
    return true;
  };

  const closePreview = () => {
    setShowPreview(false);
    setPreviewContent('');
  };

  return (
    <div className="ingest-to-read-yaml-generator">
      <div className="section-header" onClick={toggleExpand}>
        <h3>Generate Read YAML from Ingest File</h3>
        <span className={`toggle-icon ${isExpanded ? 'expanded' : 'collapsed'}`}></span>
      </div>
      
      {isExpanded && (
        <div className="section-content">
          {ingestYamls.length > 0 && (
            <div className="ingest-yaml-list">
              <h4>Previously Uploaded Ingest YAMLs</h4>
              <div className="file-list">
                {ingestYamls.map((file, index) => (
                  <div 
                    key={index} 
                    className={`file-item ${selectedIngestYaml === file ? 'selected' : ''}`}
                    onClick={() => handleSelectedIngestYaml(file)}
                  >
                    <span className="file-icon"></span>
                    <span className="file-name">{file.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <FileUploader
                id="ingest-yaml-file-upload"
                label="Upload Ingest YAML File"
                accept=".yaml,.yml"
                onChange={handleFileChange}
                selectedFile={ingestYamlFile}
              />
            </div>
          </div>

          <div className="form-row">
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
          </div>

          <div className="form-row">
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

          {error && <div className="error-message">{error}</div>}

          <div className="button-group">
            <button 
              className="preview-button"
              onClick={handlePreview}
              disabled={loading || !ingestYamlFile || !dsbulkCsvPath.trim()}
            >
              {loading ? 'Generating...' : 'Preview YAML'}
            </button>
            
            <button 
              className="generate-button"
              onClick={handleGenerateReadYaml}
              disabled={loading || !ingestYamlFile || !dsbulkCsvPath.trim()}
            >
              {loading ? 'Generating...' : 'Generate & Download'}
            </button>
          </div>
          
          {/* Preview Modal */}
          {showPreview && (
            <div className="yaml-preview-overlay">
              <div className="yaml-preview-container">
                <div className="yaml-preview-header">
                  <h3>Read YAML Preview</h3>
                  <button className="close-button" onClick={closePreview}>×</button>
                </div>
                <div className="yaml-preview-content">
                  <pre>{previewContent}</pre>
                </div>
                <div className="yaml-preview-footer">
                  <button 
                    className="download-button"
                    onClick={downloadYamlFromPreview}
                  >
                    Download YAML
                  </button>
                  <button 
                    className="cancel-button"
                    onClick={closePreview}
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
  );
};

export default IngestToReadYamlGenerator;