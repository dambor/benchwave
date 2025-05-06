from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from typing import List, Dict, Any, Optional
import io
import zipfile
import json
from schema_parser import CQLParser
from read_yaml_generator import generate_read_yaml_from_text

app = FastAPI(title="NoSQLBench Schema Generator")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the CQL parser
parser = CQLParser()

@app.post("/api/parse-schema")
async def parse_schema(schema_file: UploadFile = File(...)):
    """Parse a CQL schema file and return structured information"""
    if not schema_file.filename.endswith(('.cql', '.txt')):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a .cql or .txt file")
    
    content = await schema_file.read()
    schema_text = content.decode('utf-8')
    
    try:
        schema_info = parser.parse_cql(schema_text)
        return JSONResponse(content=schema_info)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing schema: {str(e)}")

@app.post("/api/generate-yaml")
async def generate_yaml(
    schema_json: str = Form(...),
    table_selection: str = Form(...),
):
    """Generate NoSQLBench YAML files for selected tables"""
    try:
        schema_info = json.loads(schema_json)
        selected_tables = json.loads(table_selection)
        
        if not selected_tables:
            raise HTTPException(status_code=400, detail="No tables selected")
        
        # Create a zip file in memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for table_name in selected_tables:
                yaml_content = parser.generate_nosqlbench_yaml(schema_info, table_name)
                
                # Clean the table name for the filename
                safe_name = table_name.replace('.', '_')
                filename = f"{safe_name}.yaml"
                
                zip_file.writestr(filename, yaml_content)
        
        # Reset buffer position
        zip_buffer.seek(0)
        
        # Return the zip file as a response
        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=nosqlbench_yamls.zip"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating YAML files: {str(e)}")

@app.post("/api/generate-read-yaml")
async def generate_read_yaml_endpoint(
    ingest_yaml_file: UploadFile = File(...),
    dsbulk_csv_path: str = Form(...),
    keyspace: str = Form("baselines")
):
    """
    Generate a NoSQLBench read YAML file using the ingest YAML file and CSV path.
    """
    try:
        content = await ingest_yaml_file.read()
        ingest_yaml_text = content.decode("utf-8")
        
        read_yaml = generate_read_yaml_from_text(ingest_yaml_text, dsbulk_csv_path, keyspace)
        
        return StreamingResponse(
            io.BytesIO(read_yaml.encode("utf-8")),
            media_type="application/x-yaml",
            headers={"Content-Disposition": f"attachment; filename=read_{ingest_yaml_file.filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating read YAML: {str(e)}")

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)