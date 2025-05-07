// Add this component for the Tools section
import React from 'react';
import './ToolsPanel.css'; // We'll create this CSS file

interface ToolsPanelProps {
  // You can add props as needed
}

const ToolsPanel: React.FC<ToolsPanelProps> = () => {
  return (
    <div className="tools-panel">
      <h2>Tools</h2>
      <div className="tool-item">
        <div className="tool-icon">🔧</div>
        <div className="tool-details">
          <div className="tool-name">DSBulk</div>
          <div className="tool-description">CSV Export/Import Tool</div>
        </div>
      </div>
      {/* You can add more tools here in the future */}
    </div>
  );
};

export default ToolsPanel;
