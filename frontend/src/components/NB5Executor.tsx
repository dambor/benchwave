// frontend/src/components/NB5Executor.tsx
import React, { useState, useEffect, useRef } from 'react';
import './NB5Executor.css';

interface GeneratedYamlFile {
    filename: string;
    content: string;
    table_name: string;
  }

interface NB5ExecutorProps {
  generatedYamlFiles: GeneratedYamlFile[];
  schemaInfo: any;
}

interface Execution {
  execution_id: string;
  status: string;
  is_running: boolean;
  command: string;
  start_time: number;
  log_size: number;
}

interface ExecutionDetails {
  execution_id: string;
  status: string;
  command: string;
  is_running: boolean;
  stdout: string[];
  stderr: string[];
}

const NB5Executor: React.FC<NB5ExecutorProps> = ({ generatedYamlFiles, schemaInfo }) => {
  // State for the form
  const [activeTab, setActiveTab] = useState<'execute' | 'history'>('execute');
  const [yamlContent, setYamlContent] = useState<string>('');
  const [selectedYamlFile, setSelectedYamlFile] = useState<string>('');
  const [host, setHost] = useState<string>('localhost');
  const [datacenter, setDatacenter] = useState<string>('datacenter1');
  const [keyspace, setKeyspace] = useState<string>('');
  const [additionalParams, setAdditionalParams] = useState<string>('');
  
  // State for execution
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const [executionDetails, setExecutionDetails] = useState<ExecutionDetails | null>(null);
  const [activeDetailsTab, setActiveDetailsTab] = useState<'command' | 'stdout' | 'stderr'>('command');
  
  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [useCustomYaml, setUseCustomYaml] = useState<boolean>(false);
  
  // Reference for automatic refresh interval
  const refreshIntervalRef = useRef<number | null>(null);
  
  // Extract keyspaces from schema info
  const keyspaces = schemaInfo ? Object.keys(schemaInfo.keyspaces) : [];
  
  // Load executions when component mounts or tab changes
  useEffect(() => {
    if (activeTab === 'history') {
      loadExecutions();
      
      // Set up automatic refresh for running executions
      refreshIntervalRef.current = window.setInterval(() => {
        loadExecutions(true);
        
        // If there's a selected execution and it's running, refresh its details too
        if (selectedExecution && 
            executions.some(e => e.execution_id === selectedExecution && e.is_running)) {
          loadExecutionDetails(selectedExecution, true);
        }
      }, 5000) as unknown as number; // Refresh every 5 seconds
      
      return () => {
        if (refreshIntervalRef.current !== null) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    }
  }, [activeTab, selectedExecution]);
  
  // Set keyspace when schema info changes and there's only one keyspace
  useEffect(() => {
    if (schemaInfo && keyspaces.length === 1) {
      setKeyspace(keyspaces[0]);
    }
  }, [schemaInfo]);
  
  // Update YAML content when a file is selected
  useEffect(() => {
    if (selectedYamlFile && !useCustomYaml) {
      const selectedFile = generatedYamlFiles.find(f => f.filename === selectedYamlFile);
      if (selectedFile) {
        setYamlContent(selectedFile.content);
      }
    }
  }, [selectedYamlFile, useCustomYaml, generatedYamlFiles]);
  
  const loadExecutions = async (isRefresh = false) => {
    if (!isRefresh) {
      setIsLoading(true);
    } else {
      setRefreshing(true);
    }
    
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/api/nb5/list');
      
      if (!response.ok) {
        throw new Error('Failed to load executions');
      }
      
      const data = await response.json();
      setExecutions(data.executions || []);
      
    } catch (error) {
      setError(`Error loading executions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };
  
  const loadExecutionDetails = async (executionId: string, isRefresh = false) => {
    if (!isRefresh) {
      setIsLoading(true);
    }
    
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:8000/api/nb5/status/${executionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load execution details');
      }
      
      const data = await response.json();
      setExecutionDetails(data);
      
    } catch (error) {
      setError(`Error loading execution details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExecutionClick = (executionId: string) => {
    setSelectedExecution(executionId);
    loadExecutionDetails(executionId);
    setActiveDetailsTab('command');
  };
  
  const handleTerminateExecution = async (executionId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:8000/api/nb5/terminate/${executionId}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to terminate execution');
      }
      
      // Refresh the execution list and details if this is the selected execution
      loadExecutions();
      if (selectedExecution === executionId) {
        loadExecutionDetails(executionId);
      }
      
    } catch (error) {
      setError(`Error terminating execution: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExecute = async () => {
    // Validate form inputs
    if (!yamlContent) {
      setError('Please select or enter a YAML file content');
      return;
    }
    
    if (!host) {
      setError('Please enter a host');
      return;
    }
    
    if (!datacenter) {
      setError('Please enter a datacenter');
      return;
    }
    
    if (!keyspace) {
      setError('Please select a keyspace');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('yaml_content', yamlContent);
      formData.append('host', host);
      formData.append('datacenter', datacenter);
      formData.append('keyspace', keyspace);
      
      if (additionalParams) {
        formData.append('additional_params', additionalParams);
      }
      
      const response = await fetch('http://localhost:8000/api/nb5/execute', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to execute workload');
      }
      
      const data = await response.json();
      
      // Switch to the history tab and select the new execution
      setActiveTab('history');
      loadExecutions();
      setSelectedExecution(data.execution_id);
      loadExecutionDetails(data.execution_id);
      
    } catch (error) {
      setError(`Error executing workload: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDownloadScript = async () => {
    // Validate form inputs
    if (!selectedYamlFile && !useCustomYaml) {
      setError('Please select a YAML file');
      return;
    }
    
    if (!host) {
      setError('Please enter a host');
      return;
    }
    
    if (!datacenter) {
      setError('Please enter a datacenter');
      return;
    }
    
    if (!keyspace) {
      setError('Please select a keyspace');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      
      // Use the filename if a file is selected, or "custom.yaml" for custom content
      const yaml_file = selectedYamlFile || 'custom.yaml';
      
      formData.append('yaml_file', yaml_file);
      formData.append('host', host);
      formData.append('datacenter', datacenter);
      formData.append('keyspace', keyspace);
      
      if (additionalParams) {
        formData.append('additional_params', additionalParams);
      }
      
      const response = await fetch('http://localhost:8000/api/nb5/download-script', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate script');
      }
      
      // Create a download link for the script
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nb5_execute_${yaml_file.replace('.yaml', '')}.sh`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      setError(`Error generating script: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format the date from timestamp
  const formatDate = (timestamp: number): string => {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };
  
  // Calculate the duration of an execution
  const calculateDuration = (startTime: number): string => {
    if (!startTime) return 'N/A';
    
    const now = Date.now() / 1000;
    const duration = now - startTime;
    
    if (duration < 60) {
      return `${Math.floor(duration)} seconds`;
    } else if (duration < 3600) {
      return `${Math.floor(duration / 60)} minutes`;
    } else {
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      return `${hours} hours, ${minutes} minutes`;
    }
  };
  
  return (
    <div className="nb5-executor">
      <h3>NoSQLBench 5 Executor</h3>
      
      <div className="tab-container">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'execute' ? 'active' : ''}`}
            onClick={() => setActiveTab('execute')}
          >
            Execute Workload
          </button>
          <button 
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Execution History
          </button>
        </div>
      </div>
      
      {activeTab === 'execute' && (
        <div className="execute-tab">
          <div className="form-container">
          <div className="yaml-select-container">
            <div className="form-group">
                <label htmlFor="yaml-file-select">Select YAML File</label>
                <select
                id="yaml-file-select"
                value={selectedYamlFile}
                onChange={(e) => {
                    if (e.target.value === "custom") {
                    setUseCustomYaml(true);
                    setSelectedYamlFile("");
                    } else {
                    setUseCustomYaml(false);
                    setSelectedYamlFile(e.target.value);
                    }
                }}
                className="form-select"
                >
                <option value="">-- Select a YAML file --</option>
                {generatedYamlFiles.map((file, index) => (
                    <option key={index} value={file.filename}>
                    {file.filename}
                    </option>
                ))}
                <option value="custom">Use custom YAML content</option>
                </select>
                <div className="help-text">Select a generated YAML file or use custom content</div>
            </div>
            </div>
            
            {useCustomYaml && (
              <div className="form-group">
                <label htmlFor="yaml-content">YAML Content</label>
                <textarea 
                  id="yaml-content"
                  value={yamlContent}
                  onChange={(e) => setYamlContent(e.target.value)}
                  placeholder="Paste your NoSQLBench YAML content here..."
                />
                <div className="help-text">Paste the YAML content for your NoSQLBench workload</div>
              </div>
            )}
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="host">Host</label>
                <input 
                  type="text"
                  id="host"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="localhost"
                />
                <div className="help-text">Cassandra host to connect to</div>
              </div>
              
              <div className="form-group">
                <label htmlFor="datacenter">Datacenter</label>
                <input 
                  type="text"
                  id="datacenter"
                  value={datacenter}
                  onChange={(e) => setDatacenter(e.target.value)}
                  placeholder="datacenter1"
                />
                <div className="help-text">Cassandra datacenter to use</div>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="keyspace">Keyspace</label>
              <select 
                id="keyspace"
                value={keyspace}
                onChange={(e) => setKeyspace(e.target.value)}
              >
                <option value="">Select a keyspace</option>
                {keyspaces.map((ks) => (
                  <option key={ks} value={ks}>{ks}</option>
                ))}
              </select>
              <div className="help-text">Keyspace to use for the workload</div>
            </div>
            
            <div className="form-group">
              <label htmlFor="additional-params">Additional Parameters (Optional)</label>
              <input 
                type="text"
                id="additional-params"
                value={additionalParams}
                onChange={(e) => setAdditionalParams(e.target.value)}
                placeholder="param1=value1 param2=value2"
              />
              <div className="help-text">Additional parameters to pass to NoSQLBench</div>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="buttons-row">
              <button 
                className="execute-button"
                onClick={handleExecute}
                disabled={isLoading}
              >
                {isLoading ? 'Executing...' : 'Execute Workload'}
              </button>
              
              <button 
                className="download-button"
                onClick={handleDownloadScript}
                disabled={isLoading}
              >
                Download Shell Script
              </button>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'history' && (
        <div className="history-tab">
          <div className="executions-container">
            <div className="executions-header">
              <div>Execution ID</div>
              <div>Status</div>
              <div>Start Time</div>
              <div>
                <button 
                  className="refresh-button"
                  onClick={() => loadExecutions()}
                  disabled={isLoading || refreshing}
                >
                  {refreshing ? <span className="spinner"></span> : 'Refresh'}
                </button>
              </div>
            </div>
            
            {executions.length === 0 ? (
              <div className="no-executions">
                No executions found. Run a workload to see execution history.
              </div>
            ) : (
              <div className="executions-list">
                {executions.map((execution) => (
                  <div 
                    key={execution.execution_id}
                    className={`execution-item ${selectedExecution === execution.execution_id ? 'selected' : ''}`}
                    onClick={() => handleExecutionClick(execution.execution_id)}
                  >
                    <div className="execution-id">{execution.execution_id}</div>
                    <div className={`execution-status status-${execution.status}`}>
                      {execution.status} {execution.is_running && <span className="spinner"></span>}
                    </div>
                    <div className="execution-time">{calculateDuration(execution.start_time)}</div>
                    <div className="execution-actions">
                      {execution.is_running && (
                        <button 
                          className="action-button terminate"
                          onClick={(e) => handleTerminateExecution(execution.execution_id, e)}
                        >
                          Terminate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {selectedExecution && executionDetails && (
            <div className="execution-details">
              <div className="details-header">
                <h4>Execution Details: {executionDetails.execution_id}</h4>
                
                <div className={`execution-status status-${executionDetails.status}`}>
                  {executionDetails.status} {executionDetails.is_running && <span className="spinner"></span>}
                </div>
              </div>
              
              <div className="details-tabs">
                <button 
                  className={`details-tab ${activeDetailsTab === 'command' ? 'active' : ''}`}
                  onClick={() => setActiveDetailsTab('command')}
                >
                  Command
                </button>
                <button 
                  className={`details-tab ${activeDetailsTab === 'stdout' ? 'active' : ''}`}
                  onClick={() => setActiveDetailsTab('stdout')}
                >
                  Standard Output
                </button>
                <button 
                  className={`details-tab ${activeDetailsTab === 'stderr' ? 'active' : ''}`}
                  onClick={() => setActiveDetailsTab('stderr')}
                >
                  Standard Error
                </button>
              </div>
              
              <div className="details-content">
                {activeDetailsTab === 'command' && (
                  <div className="command-display">
                    {executionDetails.command}
                  </div>
                )}
                
                {activeDetailsTab === 'stdout' && (
                  <div className="log-display">
                    {executionDetails.stdout.length === 0 ? (
                      <p>No standard output available.</p>
                    ) : (
                      executionDetails.stdout.map((line, index) => (
                        <p key={index} className="log-line">{line}</p>
                      ))
                    )}
                  </div>
                )}
                
                {activeDetailsTab === 'stderr' && (
                  <div className="log-display">
                    {executionDetails.stderr.length === 0 ? (
                      <p>No error output available.</p>
                    ) : (
                      executionDetails.stderr.map((line, index) => (
                        <p key={index} className="log-line log-error">{line}</p>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NB5Executor;