import os
import pandas as pd
import geopandas as gpd
import math
import sqlite3
from dotenv import load_dotenv
from mergin import MerginClient
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from typing import Optional

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # CHANGE BEFORE DEPLOYMENT
    allow_methods=["GET"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_PATH = os.path.join(BASE_DIR, "ujap_data")
GPKG_PATH = os.path.join(PROJECT_PATH, "ujap_data.gpkg")
MBTILES_PATH = os.path.join(PROJECT_PATH, "base", "ortho_2014_labianca.mbtiles")

def get_client():
    return MerginClient(
        url=os.getenv("MERGIN_URL"),
        login=os.getenv("MERGIN_USERNAME"),
        password=os.getenv("MERGIN_PASSWORD")
    )

def clean_for_geojson(gdf):
    for col in gdf.columns:
        if col == gdf.geometry.name:
            continue
        if pd.api.types.is_datetime64_any_dtype(gdf[col]):
            gdf[col] = gdf[col].astype(str)
    return gdf

def sanitize_records(records):
    for record in records:
        for key, value in record.items():
            if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
                record[key] = None
    return records

@app.get("/tiles/{z}/{x}/{y}.jpg")
def get_tile(z: int, x: int, y: int):
    tms_y = (2 ** z - 1) - y
    conn = sqlite3.connect(MBTILES_PATH)
    cursor = conn.execute(
        "SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?",
        (z, x, tms_y)
    )
    row = cursor.fetchone()
    conn.close()

    if row is None:
        return Response(status_code=404)

    return Response(content=row[0], media_type="image/jpeg")

@app.get("/layers/{layer_name}")
def get_layer(layer_name: str):
    gdf = gpd.read_file(GPKG_PATH, layer=layer_name)
    gdf = gdf.to_crs(epsg=4326)
    gdf = clean_for_geojson(gdf)
    return gdf.__geo_interface__

@app.get("/tables/{table_name}")
def get_table(table_name: str, context_id: Optional[str] = None):
    gdf = gpd.read_file(GPKG_PATH, layer=table_name, read_geometry=False)
    if context_id and "context_id" in gdf.columns:
        gdf = gdf[gdf["context_id"] == context_id]
    records = gdf.to_dict(orient="records")
    records = sanitize_records(records)
    return records

@app.get("/sync")
def sync_project():
    client = get_client()
    try:
        if os.path.exists(PROJECT_PATH):
            before_info = client.project_info("mergin/ujap_field_data")
            before_version = before_info["version"]

            client.pull_project(PROJECT_PATH)

            after_info = client.project_info("mergin/ujap_field_data")
            after_version = after_info["version"]

            return {
                "status": "synced",
                "action": "pull",
                "version_before": before_version,
                "version_after": after_version,
                "changed": before_version != after_version
            }
        else:
            client.download_project("mergin/ujap_field_data", PROJECT_PATH)
            info = client.project_info("mergin/ujap_field_data")
            return {"status": "synced", "action": "download", "version": info["version"]}
    except Exception as e:
        return {"status": "error", "detail": str(e)}