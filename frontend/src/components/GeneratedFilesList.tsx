// src/components/GeneratedFilesList.tsx
import React, { useState } from 'react';
import { GeneratedYamlFile } from '../types';
import './GeneratedFilesList.css';

interface GeneratedFilesListProps {
  files: GeneratedYamlFile[];
  onDownloadFile: (file: GeneratedYamlFile) => void;
  onDownloadAll: () => void;
  onClose: () => void;
}

const GeneratedFilesList: React.FC<GeneratedFilesListProps> = ({
  files,
  onDownloadFile,
  onDownloadAll,
  onClose
}) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(
    files.length > 0 ? 0 : null
  );

  const handleFileSelect = (index: number) => {
    setSelectedFileIndex(index);
  };

  return (
    <div className="generated-files-container">
      <div className="generated-files-header">
        <h2>Generated YAML Files</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="generated-files-content">
        <div className="files-list">
          <div className="files-list-header">
            <h3>Files ({files.length})</h3>
            <button 
              className="download-all-button"
              onClick={onDownloadAll}
            >
              Download All
            </button>
          </div>
          
          <ul>
            {files.map((file, index) => (
              <li 
                key={index} 
                className={selectedFileIndex === index ? 'selected' : ''}
                onClick={() => handleFileSelect(index)}
              >
                <span className="file-icon">📄</span>
                <span className="file-name">{file.filename}</span>
                <button 
                  className="download-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownloadFile(file);
                  }}
                >
                  ⬇️
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="file-preview">
          {selectedFileIndex !== null && files[selectedFileIndex] ? (
            <>
              <div className="file-preview-header">
                <h3>{files[selectedFileIndex].filename}</h3>
                <button 
                  className="download-button"
                  onClick={() => onDownloadFile(files[selectedFileIndex])}
                >
                  Download
                </button>
              </div>
              <pre className="yaml-content">
                {files[selectedFileIndex].content}
              </pre>
            </>
          ) : (
            <div className="no-file-selected">
              <p>Select a file to preview its contents</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneratedFilesList;