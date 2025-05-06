# read_yaml_generator.py

import yaml

def extract_primary_key_from_ingest_yaml(yaml_text: str) -> dict:
    data = yaml.safe_load(yaml_text)
    create_stmt = data['blocks']['schema1']['ops']['create_table1']
    lines = create_stmt.strip().splitlines()

    table_name = None
    primary_key = None
    for line in lines:
        if "CREATE TABLE" in line:
            table_name = line.split('.')[-1].split('(')[0].strip()
        elif "PRIMARY KEY" in line:
            pk_line = line.strip().replace("PRIMARY KEY", "").strip(" (),")
            pk_parts = [part.strip().strip("()") for part in pk_line.split(',')]
            if len(pk_parts) > 0:
                primary_key = pk_parts[0]

    if not table_name or not primary_key:
        raise ValueError("Unable to parse table name or primary key from ingestion YAML.")

    return {
        "table_name": table_name,
        "primary_key": primary_key
    }

def generate_read_yaml_from_text(ingest_yaml_text: str, dsbulk_csv_path: str, keyspace: str = "baselines") -> str:
    info = extract_primary_key_from_ingest_yaml(ingest_yaml_text)
    table_name = info["table_name"]
    primary_key = info["primary_key"]

    read_yaml = {
        "scenarios": {
            "default": {
                "read1": "run driver=cql tags='block:read1' cycles==TEMPLATE(read-cycles,1000) threads=auto"
            }
        },
        "bindings": {
            primary_key: f"CSVSampler('{primary_key}','{primary_key}-weight','{dsbulk_csv_path}')"
        },
        "blocks": {
            "read1": {
                "params": {
                    "cl": "TEMPLATE(read_cl,LOCAL_QUORUM)",
                    "instrument": True,
                    "prepared": True
                },
                "ops": {
                    f"read_by_{primary_key}": f"""
        SELECT {primary_key}, insertedtimestamp 
        FROM <<keyspace:{keyspace}>>.{table_name}
        WHERE {primary_key} = {{{primary_key}}}
        LIMIT 1;""".strip()
                }
            }
        }
    }

    return yaml.dump(read_yaml, sort_keys=False)
