// src/components/KeyspaceList.tsx - Updated to match the screenshot
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
      <h2>Keyspaces</h2>
      <ul>
        <li 
          className={!selectedKeyspace ? 'selected' : ''}
          onClick={() => onKeyspaceSelect('')}
        >
          All Keyspaces
        </li>
        
        {keyspaces.map((keyspace) => (
          <li 
            key={keyspace.name}
            className={selectedKeyspace === keyspace.name ? 'selected' : ''}
            onClick={() => onKeyspaceSelect(keyspace.name)}
          >
            <span className="keyspace-icon"></span>
            {keyspace.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default KeyspaceList;