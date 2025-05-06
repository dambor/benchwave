// src/components/TableList.tsx
import React from 'react';
import { Table } from '../types';
import './TableList.css';

interface TableListProps {
  tables: Table[];
  selectedTables: string[];
  onTableSelect: (tableName: string, isSelected: boolean) => void;
  onSelectAll: (isSelected: boolean) => void;
  keyspace: string;
}

const TableList: React.FC<TableListProps> = ({ 
  tables, 
  selectedTables, 
  onTableSelect,
  onSelectAll,
  keyspace
}) => {
  const isAllSelected = tables.length > 0 && 
    tables.every(table => selectedTables.includes(table.fullName));
  
  const handleSelectAll = () => {
    onSelectAll(!isAllSelected);
  };

  return (
    <div className="table-list">
      <div className="table-header">
        <h2>
          <span className="table-icon"></span>
          Tables {keyspace ? `(${keyspace})` : ''}
        </h2>
        <div className="select-all">
          <input
            type="checkbox"
            id="select-all"
            checked={isAllSelected}
            onChange={handleSelectAll}
          />
          <label htmlFor="select-all">Select All</label>
        </div>
      </div>
      
      <div className="tables-count">{tables.length} tables selected</div>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="checkbox-column"></th>
              <th>Table Name</th>
              <th>Keyspace</th>
              <th>Columns</th>
              <th>Primary Key</th>
            </tr>
          </thead>
          <tbody>
            {tables.map((table) => {
              const isSelected = selectedTables.includes(table.fullName);
              const primaryKeyColumns = table.primary_key.flat().join(', ');
              
              return (
                <tr key={table.fullName} className={isSelected ? 'selected' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => onTableSelect(table.fullName, e.target.checked)}
                    />
                  </td>
                  <td>{table.name}</td>
                  <td>{table.keyspace}</td>
                  <td>{Object.keys(table.columns).length}</td>
                  <td className="primary-key">{primaryKeyColumns}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableList;