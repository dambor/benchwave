// src/components/ConfigurationPanel.tsx - Updated to match the screenshot
import React from 'react';
import { Configuration } from '../types';
import './ConfigurationPanel.css';

interface ConfigurationPanelProps {
  configuration: Configuration;
  onConfigChange: (config: Partial<Configuration>) => void;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  configuration,
  onConfigChange
}) => {
  const handleCyclesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      onConfigChange({ numCycles: value });
    }
  };

  const handleThreadsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      onConfigChange({ numThreads: value });
    }
  };

  const handleConsistencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onConfigChange({ consistencyLevel: e.target.value });
  };

  return (
    <div className="configuration-panel">
      <h2>NoSQLBench Configuration</h2>
      
      <div className="config-grid">
        <div className="config-row">
          <label htmlFor="num-cycles">Number of Cycles</label>
          <input
            type="number"
            id="num-cycles"
            value={configuration.numCycles}
            onChange={handleCyclesChange}
            min="0"
          />
          <div className="help-text">Number of operations to run</div>
        </div>
        
        <div className="config-row">
          <label htmlFor="num-threads">Number of Threads</label>
          <input
            type="number"
            id="num-threads"
            value={configuration.numThreads}
            onChange={handleThreadsChange}
            min="0"
          />
          <div className="help-text">0 means auto (use available cores)</div>
        </div>
        
        <div className="config-row">
          <label htmlFor="consistency-level">Consistency Level</label>
          <div className="select-container">
            <select
              id="consistency-level"
              value={configuration.consistencyLevel}
              onChange={handleConsistencyChange}
            >
              <option value="ONE">ONE</option>
              <option value="LOCAL_ONE">LOCAL_ONE</option>
              <option value="QUORUM">QUORUM</option>
              <option value="LOCAL_QUORUM">LOCAL_QUORUM</option>
              <option value="EACH_QUORUM">EACH_QUORUM</option>
              <option value="ALL">ALL</option>
            </select>
            <div className="select-arrow"></div>
          </div>
          <div className="help-text">Cassandra consistency level for writes</div>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationPanel;