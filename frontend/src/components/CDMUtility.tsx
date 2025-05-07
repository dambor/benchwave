// frontend/src/components/CDMUtility.tsx
import React, { useState, useEffect } from 'react';
import './CDMUtility.css';

interface CDMProps {
  keyspaces: string[];
  tables: {
    keyspace: string;
    name: string;
    primary_keys: string[];
  }[];
}

const CDMUtility: React.FC<CDMProps> = ({ keyspaces, tables }) => {
  // State for form inputs and UI
  const [sourceKeyspace, setSourceKeyspace] = useState<string>('');
  const [sourceTable, setSourceTable] = useState<string>('');
  const [targetKeyspace, setTargetKeyspace] = useState<string>('');
  const [targetTable, setTargetTable] = useState<string>('');
  const [migrationType, setMigrationType] = useState<'full' | 'incremental'>('full');
  const [batchSize, setBatchSize] = useState<number>(1000);
  const [timeoutSecs, setTimeoutSecs] = useState<number>(3600);
  const [filterCondition, setFilterCondition] = useState<string>('');
  
  // State for filtered tables
  const [sourceFilteredTables, setSourceFilteredTables] = useState<typeof tables>([]);
  const [targetFilteredTables, setTargetFilteredTables] = useState<typeof tables>([]);
  
  // State for UI
  const [activeSection, setActiveSection] = useState<'configure' | 'preview' | 'execute'>('configure');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [commandPreview, setCommandPreview] = useState<string>('');
  const [migrationPlan, setMigrationPlan] = useState<any>({
    estimatedRows: 0,
    estimatedTime: '',
    steps: []
  });
  
  // Update filtered tables when keyspace selection changes
  useEffect(() => {
    if (sourceKeyspace) {
      const filtered = tables.filter(t => t.keyspace === sourceKeyspace);
      setSourceFilteredTables(filtered);
      
      // Reset table selection if current selection is not in filtered list
      if (filtered.length > 0 && !filtered.some(t => t.name === sourceTable)) {
        setSourceTable('');
      }
    } else {
      setSourceFilteredTables([]);
      setSourceTable('');
    }
  }, [sourceKeyspace, tables, sourceTable]);
  
  useEffect(() => {
    if (targetKeyspace) {
      const filtered = tables.filter(t => t.keyspace === targetKeyspace);
      setTargetFilteredTables(filtered);
      
      // Reset table selection if current selection is not in filtered list
      if (filtered.length > 0 && !filtered.some(t => t.name === targetTable)) {
        setTargetTable('');
      }
    } else {
      setTargetFilteredTables([]);
      setTargetTable('');
    }
  }, [targetKeyspace, tables, targetTable]);
  
  const handleMigrationTypeChange = (type: 'full' | 'incremental') => {
    setMigrationType(type);
  };
  
  const handleBatchSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setBatchSize(value);
    }
  };
  
  const handleTimeoutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setTimeoutSecs(value);
    }
  };
  
  const handlePreviewMigration = () => {
    // Validate inputs
    if (!sourceKeyspace || !sourceTable || !targetKeyspace || !targetTable) {
      setError('Please select both source and target tables');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    // Mock API call - in real implementation, this would call the backend
    setTimeout(() => {
      // Generate mock migration plan
      const mockPlan = {
        estimatedRows: Math.floor(Math.random() * 1000000) + 1000,
        estimatedTime: `${Math.floor(Math.random() * 60) + 5} minutes`,
        steps: [
          {
            order: 1,
            description: 'Create snapshot of source table',
            estimatedTime: '30 seconds'
          },
          {
            order: 2,
            description: `Export data from ${sourceKeyspace}.${sourceTable}`,
            estimatedTime: '2-3 minutes'
          },
          {
            order: 3,
            description: `Import data to ${targetKeyspace}.${targetTable}`,
            estimatedTime: '3-5 minutes'
          },
          {
            order: 4,
            description: 'Verify row counts',
            estimatedTime: '20 seconds'
          }
        ]
      };
      
      // Generate mock command preview
      const mockCommand = `
cdm migrate \\
  --source-keyspace ${sourceKeyspace} \\
  --source-table ${sourceTable} \\
  --target-keyspace ${targetKeyspace} \\
  --target-table ${targetTable} \\
  --migration-type ${migrationType} \\
  --batch-size ${batchSize} \\
  --timeout ${timeoutSecs}${filterCondition ? ` \\
  --filter "${filterCondition}"` : ''}
`;
      
      setMigrationPlan(mockPlan);
      setCommandPreview(mockCommand);
      setActiveSection('preview');
      setIsLoading(false);
    }, 1500);
  };
  
  const handleExecuteMigration = () => {
    setIsLoading(true);
    setError(null);
    
    // Mock execution - in real implementation, this would call the backend
    setTimeout(() => {
      setActiveSection('execute');
      setIsLoading(false);
    }, 2000);
  };
  
  const handleDownloadScript = () => {
    // Create a blob with the command preview
    const blob = new Blob([commandPreview], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cdm_${sourceKeyspace}_${sourceTable}_to_${targetKeyspace}_${targetTable}.sh`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };
  
  return (
    <div className="cdm-utility">
      <h3>Cassandra Data Migration (CDM)</h3>
      
      <div className="navigation-tabs">
        <button 
          className={`nav-tab ${activeSection === 'configure' ? 'active' : ''}`}
          onClick={() => setActiveSection('configure')}
        >
          1. Configure
        </button>
        <button 
          className={`nav-tab ${activeSection === 'preview' ? 'active' : ''}`}
          onClick={() => activeSection === 'preview' && setActiveSection('preview')}
          disabled={activeSection === 'configure'}
        >
          2. Preview
        </button>
        <button 
          className={`nav-tab ${activeSection === 'execute' ? 'active' : ''}`}
          onClick={() => activeSection === 'execute' && setActiveSection('execute')}
          disabled={activeSection === 'configure' || activeSection === 'preview'}
        >
          3. Execute
        </button>
      </div>
      
      {activeSection === 'configure' && (
        <div className="configure-section">
          <div className="section-header">
            <h4>Migration Configuration</h4>
          </div>
          
          <div className="config-container">
            <div className="source-target-container">
              <div className="config-panel">
                <h5>Source</h5>
                <div className="form-group">
                  <label htmlFor="source-keyspace">Source Keyspace</label>
                  <select 
                    id="source-keyspace"
                    value={sourceKeyspace}
                    onChange={(e) => setSourceKeyspace(e.target.value)}
                  >
                    <option value="">Select a keyspace</option>
                    {keyspaces.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="source-table">Source Table</label>
                  <select 
                    id="source-table"
                    value={sourceTable}
                    onChange={(e) => setSourceTable(e.target.value)}
                    disabled={!sourceKeyspace}
                  >
                    <option value="">Select a table</option>
                    {sourceFilteredTables.map(t => (
                      <option key={t.name} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="direction-arrow">→</div>
              
              <div className="config-panel">
                <h5>Target</h5>
                <div className="form-group">
                  <label htmlFor="target-keyspace">Target Keyspace</label>
                  <select 
                    id="target-keyspace"
                    value={targetKeyspace}
                    onChange={(e) => setTargetKeyspace(e.target.value)}
                  >
                    <option value="">Select a keyspace</option>
                    {keyspaces.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="target-table">Target Table</label>
                  <select 
                    id="target-table"
                    value={targetTable}
                    onChange={(e) => setTargetTable(e.target.value)}
                    disabled={!targetKeyspace}
                  >
                    <option value="">Select a table</option>
                    {targetFilteredTables.map(t => (
                      <option key={t.name} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="options-panel">
              <h5>Migration Options</h5>
              
              <div className="migration-type-selector">
                <div className="type-option">
                  <input 
                    type="radio" 
                    id="full-migration" 
                    name="migration-type"
                    value="full"
                    checked={migrationType === 'full'}
                    onChange={() => handleMigrationTypeChange('full')}
                  />
                  <label htmlFor="full-migration">
                    <div className="option-title">Full Migration</div>
                    <div className="option-description">Migrate all data from source to target table</div>
                  </label>
                </div>
                
                <div className="type-option">
                  <input 
                    type="radio" 
                    id="incremental-migration" 
                    name="migration-type"
                    value="incremental"
                    checked={migrationType === 'incremental'}
                    onChange={() => handleMigrationTypeChange('incremental')}
                  />
                  <label htmlFor="incremental-migration">
                    <div className="option-title">Incremental Migration</div>
                    <div className="option-description">Migrate only data that doesn't exist in target</div>
                  </label>
                </div>
              </div>
              
              <div className="advanced-options">
                <h6>Advanced Options</h6>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="batch-size">Batch Size</label>
                    <input 
                      type="number" 
                      id="batch-size" 
                      value={batchSize}
                      onChange={handleBatchSizeChange}
                      min="1"
                    />
                    <div className="help-text">Number of rows per batch</div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="timeout">Timeout (seconds)</label>
                    <input 
                      type="number" 
                      id="timeout" 
                      value={timeoutSecs}
                      onChange={handleTimeoutChange}
                      min="1"
                    />
                    <div className="help-text">Maximum execution time</div>
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="filter-condition">Filter Condition (Optional)</label>
                  <input 
                    type="text" 
                    id="filter-condition" 
                    value={filterCondition}
                    onChange={(e) => setFilterCondition(e.target.value)}
                    placeholder="timestamp > '2023-01-01'"
                  />
                  <div className="help-text">WHERE clause for filtering source data</div>
                </div>
              </div>
            </div>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="action-buttons">
            <button 
              className="preview-button"
              onClick={handlePreviewMigration}
              disabled={isLoading || !sourceKeyspace || !sourceTable || !targetKeyspace || !targetTable}
            >
              {isLoading ? 'Processing...' : 'Preview Migration'}
            </button>
          </div>
        </div>
      )}
      
      {activeSection === 'preview' && (
        <div className="preview-section">
          <div className="section-header">
            <h4>Migration Preview</h4>
          </div>
          
          <div className="preview-container">
            <div className="migration-summary">
              <div className="summary-box">
                <div className="summary-title">Migration Summary</div>
                <div className="summary-content">
                  <div className="summary-item">
                    <div className="item-label">Source:</div>
                    <div className="item-value">{sourceKeyspace}.{sourceTable}</div>
                  </div>
                  <div className="summary-item">
                    <div className="item-label">Target:</div>
                    <div className="item-value">{targetKeyspace}.{targetTable}</div>
                  </div>
                  <div className="summary-item">
                    <div className="item-label">Type:</div>
                    <div className="item-value">{migrationType === 'full' ? 'Full Migration' : 'Incremental Migration'}</div>
                  </div>
                  <div className="summary-item">
                    <div className="item-label">Estimated Rows:</div>
                    <div className="item-value">{migrationPlan.estimatedRows.toLocaleString()}</div>
                  </div>
                  <div className="summary-item">
                    <div className="item-label">Estimated Time:</div>
                    <div className="item-value">{migrationPlan.estimatedTime}</div>
                  </div>
                </div>
              </div>
              
              <div className="steps-box">
                <div className="steps-title">Migration Steps</div>
                <div className="steps-list">
                  {migrationPlan.steps.map((step: any, index: number) => (
                    <div key={index} className="step-item">
                      <div className="step-number">{step.order}</div>
                      <div className="step-info">
                        <div className="step-description">{step.description}</div>
                        <div className="step-time">Estimated time: {step.estimatedTime}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="command-preview">
              <div className="command-header">
                <h5>Command Preview</h5>
                <button 
                  className="download-command-button"
                  onClick={handleDownloadScript}
                >
                  Download Script
                </button>
              </div>
              <pre className="command-code">{commandPreview}</pre>
            </div>
          </div>
          
          <div className="action-buttons">
            <button 
              className="back-button"
              onClick={() => setActiveSection('configure')}
            >
              Back to Configuration
            </button>
            <button 
              className="execute-button"
              onClick={handleExecuteMigration}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Execute Migration'}
            </button>
          </div>
        </div>
      )}
      
      {activeSection === 'execute' && (
        <div className="execute-section">
          <div className="section-header">
            <h4>Migration Execution</h4>
          </div>
          
          <div className="execution-status">
            <div className="status-icon success"></div>
            <div className="status-message">
              <h5>Migration Job Started</h5>
              <p>Migration from <strong>{sourceKeyspace}.{sourceTable}</strong> to <strong>{targetKeyspace}.{targetTable}</strong> has been started successfully.</p>
            </div>
          </div>
          
          <div className="execution-details">
            <div className="detail-item">
              <div className="detail-label">Job ID:</div>
              <div className="detail-value">cdm_job_{Math.floor(Math.random() * 10000)}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Status:</div>
              <div className="detail-value">
                <span className="status-badge in-progress">In Progress</span>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Start Time:</div>
              <div className="detail-value">{new Date().toLocaleString()}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Estimated Completion:</div>
              <div className="detail-value">{new Date(Date.now() + 15 * 60000).toLocaleString()}</div>
            </div>
          </div>
          
          <div className="progress-container">
            <div className="progress-header">
              <h5>Migration Progress</h5>
              <div className="progress-percentage">15%</div>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '15%' }}></div>
            </div>
            <div className="progress-steps">
              {migrationPlan.steps.map((step: any, index: number) => (
                <div key={index} className={`progress-step ${index === 0 ? 'completed' : index === 1 ? 'active' : ''}`}>
                  <div className="step-indicator"></div>
                  <div className="step-label">{step.description}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="execution-logs">
            <div className="logs-header">
              <h5>Execution Logs</h5>
              <button className="refresh-logs-button">
                Refresh Logs
              </button>
            </div>
            <div className="logs-content">
              <pre className="logs-output">
{`[2023-06-15 14:32:05] INFO: Starting migration job cdm_job_5724
[2023-06-15 14:32:06] INFO: Connecting to source cluster
[2023-06-15 14:32:07] INFO: Source connection established
[2023-06-15 14:32:08] INFO: Connecting to target cluster
[2023-06-15 14:32:09] INFO: Target connection established
[2023-06-15 14:32:10] INFO: Creating snapshot of ${sourceKeyspace}.${sourceTable}
[2023-06-15 14:32:15] INFO: Snapshot created successfully
[2023-06-15 14:32:16] INFO: Starting data export from ${sourceKeyspace}.${sourceTable}
[2023-06-15 14:32:20] INFO: Exported 1,000 rows...
[2023-06-15 14:32:30] INFO: Exported 5,000 rows...
[2023-06-15 14:32:45] INFO: Exported 12,000 rows...
[2023-06-15 14:33:05] INFO: Exported 25,000 rows...`}
              </pre>
            </div>
          </div>
          
          <div className="action-buttons">
            <button 
              className="back-button"
              onClick={() => setActiveSection('preview')}
            >
              Back to Preview
            </button>
            <button 
              className="monitor-button"
            >
              Open in Job Monitor
            </button>
          </div>
        </div>
      )}
      
      <div className="info-section">
        <h4>About Cassandra Data Migration</h4>
        <p>
          CDM is a tool for migrating data between Cassandra tables, either within the same cluster or between different clusters.
          It provides efficient, reliable data transfer with features like incremental migration, data validation, and resumable transfers.
        </p>
        <p>
          Use CDM for database reorganization, schema evolution, cluster scaling, and data synchronization tasks.
        </p>
      </div>
    </div>
  );
};

export default CDMUtility;