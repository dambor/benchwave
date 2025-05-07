// src/components/KeyspaceList.tsx
import React from 'react';
import { Keyspace } from '../types';
import './KeyspaceList.css';

interface KeyspaceListProps {
  keyspaces: Keyspace[];
  selectedKeyspace: string;
  onKeyspaceSelect: (keyspace: string) => void;
}

const KeyspaceList: React.FC<KeyspaceListProps> = ({ 
  keyspaces, 
  selectedKeyspace,
  onKeyspaceSelect
}) => {
  return (
    <div className="keyspace-list">
      <h2>Navigation</h2>
      <ul>        
        <li 
          className={selectedKeyspace === 'tools' ? 'selected' : ''}
          onClick={() => onKeyspaceSelect('tools')}
        >
          <span className="tools-icon"></span>
          Tools
        </li>
        
        <li 
          className={selectedKeyspace === 'settings' ? 'selected' : ''}
          onClick={() => onKeyspaceSelect('settings')}
        >
          <span className="settings-icon"></span>
          Settings
        </li>        
      </ul>
    </div>
  );
};

export default KeyspaceList;