<img width="800" height="465" alt="AppUse (1)" src="https://github.com/user-attachments/assets/791f1c2a-c728-442f-85bc-c15517349bf8" />

# UJAP WebGIS

A web-based viewer for field data from the Umm Al-Jimal Archaeological Project (UJAP).

## Background

Umm Al-Jimal is an archaeological site in northern Jordan, with occupation layers spanning the Nabataean, Roman, Byzantine, and early Islamic periods. UJAP is an ongoing excavation and research project at the site, and this repo is the web mapping piece of that project.

## What this does

Archaeologists on site record excavation data in the field using Mergin Maps, an open-source mobile GIS app. Changes are then synced back to a self-hosted Mergin server whenever there's a connection.

This app connects to that server, pulls the latest data, and turns it into an interactive map you can explore in a browser. It layers contexts, trenches, buildings, and survey areas on top of high-resolution drone imagery of the site, color-coded to match the styling used in QGIS as closely as possible. Clicking a context brings up a popup with basic info, plus a "View Details" panel with the full recorded attributes and any related pails, samples, artifacts, or ecofacts tied to that context.

## How it's built

**Backend:** Python and FastAPI. Connects to the Mergin server using the `mergin-client` library, reads the project's GeoPackage with GeoPandas, and serves it as GeoJSON. Also serves the drone orthophoto (stored as MBTiles) as map tiles.

**Frontend:** Plain HTML, CSS, and JS with Leaflet for the map.

## Setup

**1. Backend environment**

This project uses conda (specifically Miniforge) instead of plain pip/venv, mainly because `geopandas` and its dependencies (GDAL, fiona, pyproj) install a lot more reliably through conda-forge than through pip on Windows.

```
conda env create -f backend/environment.yml
conda activate ujap
```

**2. Environment variables**

Copy to `backend/.env` and fill in your own Mergin credentials:

```
MERGIN_URL=
MERGIN_USERNAME=
MERGIN_PASSWORD=
```

Never commit `.env`. It's already in `.gitignore`.

**3. Run the backend**

```
cd backend
uvicorn main:app --reload
```

This starts the API at `http://127.0.0.1:8000`. Check `/docs` for the full list of endpoints.

**4. Run the frontend**

```
cd frontend
python -m http.server 5500
```

Then open `http://127.0.0.1:5500` in your browser.

## Notes

- The first run downloads the full Mergin project locally, which can take a while depending on project size.
- Field data changes on the server aren't reflected until the app syncs. This happens automatically on page load.
