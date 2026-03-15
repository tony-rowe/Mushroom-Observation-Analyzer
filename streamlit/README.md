# Streamlit Reporting Dashboard

This dashboard provides reporting-focused access to iNaturalist observations across the Pacific Northwest with an emphasis on API efficiency.

## Features

- Chained pagination using `id_below` to avoid expensive deep page offsets
- Optional batching of many taxon IDs into a small number of requests
- Streamlit cache (1 hour TTL) to prevent unnecessary repeat API calls
- Optional read-through from dashboard SQLite cache (`dashboard/data/cache.db`) for zero-API reporting
- Optional PNW coordinate-bounds enforcement to suppress stale out-of-region cache rows
- Rolling 7-day report with week-over-week momentum by taxon
- Built-in query diagnostics (request count, date range, truncation warning)
- CSV export for downstream analysis

## Run

From the repository root:

```bash
python3 -m pip install -r requirements.txt
python3 -m streamlit run streamlit/app.py
```

### Run with Docker Compose

From the repo root:

```bash
docker compose up -d --build streamlit
```

Default URL:

- `http://desertbuddha:8501` (Synology host example)

By default, the app loads tracked taxon IDs from `dashboard/server/species.js` and queries:

- Oregon (`10`)
- Washington (`11`)

## Notes on query efficiency

The app minimizes requests by:

1. Requesting up to 200 observations per call (`per_page=200`).
2. Chaining pages with `id_below=<last_id>` instead of large `page=N` offsets.
3. Combining multiple taxon IDs into a single query where URL length permits.
4. Caching query results in Streamlit.

For lowest footprint and best speed, use **Dashboard SQLite cache (fastest)** as the data source in the Streamlit sidebar. In Docker deployment, this reads from `/app/data/cache.db` shared with the dashboard container.

Adjust `Max records` and `Max chained pages per chunk` in the sidebar if you need deeper historical coverage.
