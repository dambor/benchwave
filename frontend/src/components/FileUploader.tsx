// src/components/FileUploader.tsx
import React, { useState } from 'react';
import './FileUploader.css';

interface FileUploaderProps {
  id: string;
  label: string;
  accept: string;
  onChange: (file: File) => void;
  selectedFile: File | null;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  id,
  label,
  accept,
  onChange,
  selectedFile
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onChange(event.target.files[0]);
    }
  };

  return (
    <div className="file-uploader">
      <label htmlFor={id} className="file-uploader-label">
        <span className="file-icon"></span>
        {label}
      </label>
      <input 
        type="file" 
        id={id} 
        accept={accept}
        onChange={handleFileChange}
        className="file-input"
      />
      {selectedFile && (
        <div className="file-info">
          <span className="file-name">{selectedFile.name}</span>
          <span className="file-size">({Math.round(selectedFile.size / 1024)} KB)</span>
        </div>
      )}
    </div>
  );
};

export default FileUploader;