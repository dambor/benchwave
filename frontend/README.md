# NoSQLBench Schema Generator UI

This is a TypeScript React frontend for the NoSQLBench Schema Generator. It allows users to upload Cassandra schema files, parse them, select tables, and generate NoSQLBench YAML configuration files.

## Features

- Upload and parse Cassandra CQL schema files
- Browse keyspaces and tables in the schema
- Select tables for YAML generation
- Configure NoSQLBench parameters (cycles, threads, consistency level)
- Generate and download NoSQLBench YAML files

## Prerequisites

- Node.js (v14+)
- npm or yarn
- Backend server running (Python FastAPI)

## Project Structure

```
nosqlbench-schema-generator/
├── public/              # Static files
├── src/                 # Source code
│   ├── components/      # React components
│   │   ├── KeyspaceList.tsx        # Keyspace navigation
│   │   ├── KeyspaceList.css
│   │   ├── TableList.tsx           # Table selection
│   │   ├── TableList.css
│   │   ├── ConfigurationPanel.tsx  # NoSQLBench config
│   │   └── ConfigurationPanel.css
│   ├── types.ts         # TypeScript interfaces
│   ├── App.tsx          # Main application component
│   ├── App.css
│   ├── index.tsx        # Entry point
│   └── index.css        # Global styles
├── package.json
├── tsconfig.json
└── README.md
```

## Setup and Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/nosqlbench-schema-generator.git
   cd nosqlbench-schema-generator
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npm start
   # or
   yarn start
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Backend Connection

This frontend is designed to work with the NoSQLBench Schema Generator backend. Make sure the backend server is running on `http://localhost:8000`.

If the backend is running on a different URL, update the `proxy` field in `package.json` or modify the fetch URLs in the code.

## Usage

1. Upload a Cassandra schema file (`.cql` or `.txt`)
2. Click "Parse Schema" to analyze the schema
3. Select keyspaces and tables you want to include
4. Configure NoSQLBench parameters (cycles, threads, consistency level)
5. Click "Generate NoSQLBench YAML Files" to download the generated YAML files

## Development

- `npm start` - Start the development server
- `npm build` - Build the production version
- `npm test` - Run tests

## License

This project is licensed under the MIT License.