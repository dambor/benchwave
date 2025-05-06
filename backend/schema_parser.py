from typing import Dict, List, Tuple, Optional, Any, Set
import re


class CQLParser:
    def __init__(self):
        # Regular expressions for parsing CQL
        self.keyspace_pattern = re.compile(
            r"CREATE\s+KEYSPACE\s+(\w+)\s+WITH\s+replication\s*=\s*({[^}]+})\s*(?:AND\s+durable_writes\s*=\s*(true|false))?",
            re.IGNORECASE | re.DOTALL
        )
        
        self.table_pattern = re.compile(
            r"CREATE\s+TABLE\s+(?:if\s+not\s+exists\s+)?(?:(\w+)\.)?(\w+)\s*\(\s*([^;]+?)\s*\)\s*(?:WITH[^;]+)?;",
            re.IGNORECASE | re.DOTALL
        )
        
        self.type_pattern = re.compile(
            r"CREATE\s+TYPE\s+(?:if\s+not\s+exists\s+)?(?:(\w+)\.)?(\w+)\s*\(\s*([^;]+?)\s*\)\s*;",
            re.IGNORECASE | re.DOTALL
        )
        
        self.index_pattern = re.compile(
            r"CREATE\s+INDEX\s+(?:if\s+not\s+exists\s+)?(\w+)\s+ON\s+(?:(\w+)\.)?(\w+)\s*\(([^)]+)\);",
            re.IGNORECASE | re.DOTALL
        )
        
        self.primary_key_pattern = re.compile(
            r"PRIMARY\s+KEY\s*\(\s*([^)]+)\s*\)",
            re.IGNORECASE
        )
        
        self.clustering_order_pattern = re.compile(
            r"CLUSTERING\s+ORDER\s+BY\s*\(\s*([^)]+)\s*\)",
            re.IGNORECASE
        )

    def parse_cql(self, cql_content: str) -> Dict[str, Any]:
        """Parse CQL content and return structured schema information"""
        result = {
            "keyspaces": {},
            "tables": {},
            "types": {},
            "indices": []
        }
        
        # Extract keyspaces
        keyspace_matches = self.keyspace_pattern.finditer(cql_content)
        for match in keyspace_matches:
            keyspace_name = match.group(1)
            replication = match.group(2)
            durable_writes = match.group(3) if match.group(3) else "true"
            
            result["keyspaces"][keyspace_name] = {
                "replication": replication,
                "durable_writes": durable_writes == "true"
            }
        
        # Extract UDTs
        type_matches = self.type_pattern.finditer(cql_content)
        for match in type_matches:
            keyspace_name = match.group(1) if match.group(1) else None
            type_name = match.group(2)
            fields_str = match.group(3)
            
            fields = {}
            for field_def in re.split(r',\s*(?=\w+\s+\w+)', fields_str):
                field_parts = field_def.strip().split(None, 1)
                if len(field_parts) == 2:
                    field_name, field_type = field_parts
                    fields[field_name.strip()] = field_type.strip()
            
            if keyspace_name:
                full_type_name = f"{keyspace_name}.{type_name}"
            else:
                full_type_name = type_name
                
            result["types"][full_type_name] = {
                "keyspace": keyspace_name,
                "name": type_name,
                "fields": fields
            }
        
        # Extract tables
        table_matches = self.table_pattern.finditer(cql_content)
        for match in table_matches:
            keyspace_name = match.group(1) if match.group(1) else None
            table_name = match.group(2)
            column_definitions = match.group(3)
            
            # Find the WITH clause for this table
            table_with_clause = self._extract_with_clause(cql_content, keyspace_name, table_name)
            
            # Parse columns, primary key, and clustering order
            columns, primary_key, clustering_order = self._parse_column_definitions(column_definitions)
            
            if keyspace_name:
                full_table_name = f"{keyspace_name}.{table_name}"
            else:
                full_table_name = table_name
                
            result["tables"][full_table_name] = {
                "keyspace": keyspace_name,
                "name": table_name,
                "columns": columns,
                "primary_key": primary_key,
                "clustering_order": clustering_order,
                "with_options": table_with_clause
            }
        
        # Extract indices
        index_matches = self.index_pattern.finditer(cql_content)
        for match in index_matches:
            index_name = match.group(1)
            keyspace_name = match.group(2) if match.group(2) else None
            table_name = match.group(3)
            indexed_columns = match.group(4).strip()
            
            if keyspace_name:
                full_table_name = f"{keyspace_name}.{table_name}"
            else:
                full_table_name = table_name
                
            result["indices"].append({
                "name": index_name,
                "table": full_table_name,
                "columns": indexed_columns
            })
        
        return result

    def _extract_with_clause(self, cql_content: str, keyspace_name: Optional[str], table_name: str) -> Dict[str, Any]:
        """Extract the WITH clause for a table"""
        pattern = rf"CREATE\s+TABLE\s+(?:if\s+not\s+exists\s+)?(?:{keyspace_name}\.)?\s*{table_name}[^;]+?WITH\s+([^;]+)"
        match = re.search(pattern, cql_content, re.IGNORECASE | re.DOTALL)
        
        if not match:
            return {}
        
        with_content = match.group(1)
        options = {}
        
        # Handle nested structures like maps in options
        current_option = ""
        brace_level = 0
        
        for char in with_content + " AND ":  # Add a separator at the end
            if char == '{':
                brace_level += 1
                current_option += char
            elif char == '}':
                brace_level -= 1
                current_option += char
            elif char == "'" and brace_level > 0:
                current_option += char
            elif brace_level == 0 and re.match(r'\s+AND\s+', char + with_content[with_content.index(char)+1:], re.IGNORECASE):
                # Found the end of an option
                if current_option.strip():
                    key_value = current_option.strip().split('=', 1)
                    if len(key_value) == 2:
                        key, value = key_value
                        options[key.strip()] = value.strip()
                current_option = ""
            else:
                current_option += char
        
        return options

    def _parse_column_definitions(self, column_defs: str) -> Tuple[Dict[str, str], List[List[str]], Dict[str, str]]:
        """Parse column definitions, extract primary key and clustering order"""
        # Extract PRIMARY KEY, if present
        primary_key_match = self.primary_key_pattern.search(column_defs)
        primary_key = []
        if primary_key_match:
            pk_str = primary_key_match.group(1)
            # Handle composite partition keys
            if '(' in pk_str:
                partition_key = re.findall(r'\(([^)]+)\)', pk_str)
                if partition_key:
                    primary_key.append([col.strip() for col in partition_key[0].split(',')])
                    
                # Extract clustering keys
                clustering_keys = re.sub(r'\([^)]+\),\s*', '', pk_str)
                if clustering_keys:
                    for col in clustering_keys.split(','):
                        if col.strip():
                            primary_key.append([col.strip()])
            else:
                # Simple primary key
                primary_key = [[col.strip()] for col in pk_str.split(',')]
        
        # Extract CLUSTERING ORDER, if present
        clustering_order = {}
        clustering_order_match = self.clustering_order_pattern.search(column_defs)
        if clustering_order_match:
            clustering_str = clustering_order_match.group(1)
            for part in clustering_str.split(','):
                if ' ' in part:
                    col, order = part.strip().rsplit(' ', 1)
                    clustering_order[col.strip()] = order.strip()
        
        # Remove PRIMARY KEY and CLUSTERING ORDER from column definitions
        clean_column_defs = re.sub(self.primary_key_pattern, '', column_defs)
        clean_column_defs = re.sub(self.clustering_order_pattern, '', clean_column_defs)
        
        # Extract column names and types
        columns = {}
        for col_def in re.split(r',\s*(?=\w+\s+\w+)', clean_column_defs):
            col_def = col_def.strip()
            if col_def:
                parts = col_def.split(None, 1)
                if len(parts) == 2:
                    col_name, col_type = parts
                    columns[col_name.strip()] = col_type.strip()
        
        return columns, primary_key, clustering_order

    def map_cql_to_nosqlbench_type(self, cql_type: str) -> str:
        """Map CQL data types to NoSQLBench binding types"""
        cql_type = cql_type.lower()
        
        if cql_type == 'uuid':
            return 'ToHashedUUID()'
        elif cql_type == 'timestamp':
            return "AddHashRange(0,2419200000L); StartingEpochMillis('2025-01-01 05:00:00'); ToJavaInstant()"
        elif cql_type == 'boolean':
            return 'AddCycleRange(0,1); ToBoolean()'
        elif cql_type == 'text' or cql_type == 'varchar':
            return 'AlphaNumericString(36)'
        elif cql_type == 'decimal':
            return 'AddHashRange(0,99999); ToBigDecimal()'
        elif cql_type == 'int':
            return 'AddHashRange(0,99999); ToInt()'
        elif cql_type == 'bigint':
            return 'AddHashRange(287854000L,4493779500L)'
        elif cql_type == 'double':
            return 'AddHashRange(1,10); ToDouble()'
        elif cql_type.startswith('map<'):
            # Extract key and value types from map definition
            map_types = re.match(r'map<\s*([^,]+)\s*,\s*([^>]+)\s*>', cql_type)
            if map_types:
                return 'MapSizedStepped(Mod(7), NumberNameToString(), NumberNameToString())'
            return 'MapSizedStepped(Mod(7), NumberNameToString(), NumberNameToString())'
        elif cql_type.startswith('list<'):
            return 'ListSizedStepped(Mod(7), NumberNameToString())'
        else:
            # Default for other types
            return 'AlphaNumericString(36)'

    def generate_nosqlbench_yaml(self, cql_schema: Dict[str, Any], table_name: str) -> str:
        """Generate NoSQLBench YAML for a specific table"""
        # Find the table in the schema
        table_info = None
        for full_name, info in cql_schema["tables"].items():
            if full_name == table_name or info["name"] == table_name:
                table_info = info
                break
        
        if not table_info:
            return f"# Table {table_name} not found in the schema"
        
        # Determine the keyspace
        keyspace_name = table_info["keyspace"]
        
        # Start building the YAML
        yaml_content = [
            "scenarios:",
            "  default:",
            "    schema1: run driver=cql tags=block:\"schema.*\" threads===UNDEF cycles==UNDEF",
            "    rampup1: run driver=cql tags='block:rampup1' cycles===TEMPLATE(rampup-cycles,1000000) threads=auto",
            "",
            "bindings:"
        ]
        
        # Generate bindings based on column types
        for col_name, col_type in table_info["columns"].items():
            binding_type = self.map_cql_to_nosqlbench_type(col_type)
            yaml_content.append(f"  {col_name} : {binding_type};")
        
        yaml_content.append("")
        yaml_content.append("blocks:")
        yaml_content.append("  schema1:")
        yaml_content.append("    params:")
        yaml_content.append("      prepared: false")
        yaml_content.append("    ops:")
        
        # Generate the CREATE TABLE statement
        table_name_only = table_info["name"]
        full_keyspace_table = f"{keyspace_name}.{table_name_only}" if keyspace_name else table_name_only
        
        # Create the schema block
        yaml_content.append("      create_table1: | ")
        yaml_content.append(f"        CREATE TABLE if not exists <<keyspace:{keyspace_name or 'baselines'}>>.{table_name_only} (")
        
        # Add column definitions
        columns_lines = []
        for col_name, col_type in table_info["columns"].items():
            columns_lines.append(f"        {col_name} {col_type},")
        
        # Add primary key
        if table_info["primary_key"]:
            pk_parts = []
            for part in table_info["primary_key"]:
                if len(part) > 1:  # Composite partition key
                    pk_parts.append(f"({', '.join(part)})")
                else:
                    pk_parts.append(part[0])
            
            pk_definition = f"        PRIMARY KEY ({', '.join(pk_parts)})"
            columns_lines.append(pk_definition)
        
        yaml_content.extend(columns_lines)
        yaml_content.append("        )")
        
        # Add clustering order if present
        if table_info["clustering_order"]:
            clustering_parts = []
            for col, order in table_info["clustering_order"].items():
                clustering_parts.append(f"{col} {order}")
            
            yaml_content.append(f"        WITH CLUSTERING ORDER BY ({', '.join(clustering_parts)});")
        else:
            yaml_content.append(";")
        
        # Add the rampup block
        yaml_content.append("  rampup1:")
        yaml_content.append("   params:")
        yaml_content.append("     cl: ONE #TEMPLATE(write_cl,LOCAL_QUORUM)")
        yaml_content.append("     instrument: true")
        yaml_content.append("     prepared: true")
        yaml_content.append("   ops:")
        yaml_content.append("     insert_rampup1: |")
        
        # Generate insert statement
        insert_columns = ", ".join(table_info["columns"].keys())
        yaml_content.append(f"          insert into <<keyspace:{keyspace_name or 'baselines'}>>.{table_name_only} (")
        
        # Add column names for insert
        for col_name in table_info["columns"].keys():
            yaml_content.append(f"          {col_name},")
        
        yaml_content.append("          ) values ")
        yaml_content.append("          (")
        
        # Add parameter bindings for insert values
        for col_name in table_info["columns"].keys():
            yaml_content.append(f"          {{{col_name}}},")
        
        yaml_content.append("          );")
        
        return "\n".join(yaml_content)


# Example usage
if __name__ == "__main__":
    parser = CQLParser()
    with open('schema.cql', 'r') as f:
        cql_content = f.read()
    
    schema = parser.parse_cql(cql_content)
    yaml = parser.generate_nosqlbench_yaml(schema, "example_table")
    print(yaml)