// src/types.ts - Updated with GeneratedYamlFile type
export interface Keyspace {
  name: string;
  replication: string;
  durable_writes: boolean;
}

export interface Column {
  [columnName: string]: string; // column name -> column type
}

export interface Table {
  keyspace: string | null;
  name: string;
  fullName: string;
  columns: Column;
  primary_key: string[][];
  clustering_order: Record<string, string>;
  with_options: Record<string, string>;
}

export interface UserDefinedType {
  keyspace: string | null;
  name: string;
  fields: Record<string, string>;
}

export interface Index {
  name: string;
  table: string;
  columns: string;
}

export interface SchemaInfo {
  keyspaces: Record<string, Omit<Keyspace, 'name'>>;
  tables: Record<string, Omit<Table, 'fullName'>>;
  types: Record<string, UserDefinedType>;
  indices: Index[];
}

export interface Configuration {
  numCycles: number;
  numThreads: number;
  consistencyLevel: string;
}

// New type for generated YAML files
export interface GeneratedYamlFile {
  filename: string;
  content: string;
  table_name: string;
}

// Types for Read YAML support
export interface IngestFile {
  fileName: string;
  content: string;
}

export interface ReadYamlConfig {
  zipFile: File | null;
  operations: ReadOperation[];
}

export interface ReadOperation {
  name: string;
  statement: string;
  prepared: boolean;
  consistency: string;
}