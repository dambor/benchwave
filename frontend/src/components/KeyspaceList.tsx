// src/components/KeyspaceList.tsx
import React from 'react';
import { Keyspace } from '../types';
import './KeyspaceList.css';

interface KeyspaceListProps {
  keyspaces: Keyspace[];
  selectedKeyspace: string;
  onKeyspaceSelect: (keyspace: string) => void;
}

// Use a constant for the Bench Flow key for consistency
const BENCH_FLOW_KEY = 'benchflow';

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
          className={selectedKeyspace === BENCH_FLOW_KEY ? 'selected' : ''}
          onClick={() => onKeyspaceSelect(BENCH_FLOW_KEY)}
        >
          <span className="tools-icon"></span>
          Bench Flow
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