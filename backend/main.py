import os
import pandas as pd
import geopandas as gpd
from dotenv import load_dotenv
from mergin import MerginClient
from fastapi import FastAPI

load_dotenv()

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_PATH = os.path.join(BASE_DIR, "ujap_data")
GPKG_PATH = os.path.join(PROJECT_PATH, "ujap_data.gpkg")

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

@app.get("/layers/{layer_name}")
def get_layer(layer_name: str):
    gdf = gpd.read_file(GPKG_PATH, layer=layer_name)
    gdf = gdf.to_crs(epsg=4326)
    gdf = clean_for_geojson(gdf)
    return gdf.__geo_interface__

@app.get("/tables/{table_name}")
def get_table(table_name: str):
    gdf = gpd.read_file(GPKG_PATH, layer=table_name, read_geometry=False)
    return gdf.to_dict(orient="records")

@app.get("/sync")
def sync_project():
    client = get_client()
    client.pull_project(PROJECT_PATH) if os.path.exists(PROJECT_PATH) else client.download_project("mergin/ujap_field_data", PROJECT_PATH)
    return {"status": "synced"}