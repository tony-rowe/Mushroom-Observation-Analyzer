from __future__ import annotations

import math
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import pandas as pd
import plotly.express as px
import requests
import streamlit as st

API_BASE = "https://api.inaturalist.org/v1"
PER_PAGE = 200
DEFAULT_PNW_PLACE_IDS = [10, 11, 12]
DEFAULT_DELAY_SECONDS = 1.1
DEFAULT_MAX_RECORDS = 4000
DEFAULT_MAX_PAGES = 60
DEFAULT_ICONIC_TAXA = "Fungi"


def parse_int_csv(text: str) -> list[int]:
    values = []
    for token in re.split(r"[,\s]+", text.strip()):
        if not token:
            continue
        if token.isdigit():
            values.append(int(token))
    return sorted(set(values))


def load_default_taxon_ids() -> list[int]:
    species_js = Path(__file__).resolve().parents[1] / "dashboard" / "server" / "species.js"
    if not species_js.exists():
        return []
    content = species_js.read_text(encoding="utf-8")
    return sorted({int(match) for match in re.findall(r"taxonId:\s*(\d+)", content)})


def chunk_taxon_ids(taxon_ids: list[int], max_chars: int = 1200) -> list[list[int]]:
    if not taxon_ids:
        return [[]]

    chunks: list[list[int]] = []
    current: list[int] = []
    current_len = 0

    for taxon_id in taxon_ids:
        token = str(taxon_id)
        token_len = len(token) + (1 if current else 0)
        if current and current_len + token_len > max_chars:
            chunks.append(current)
            current = [taxon_id]
            current_len = len(token)
        else:
            current.append(taxon_id)
            current_len += token_len

    if current:
        chunks.append(current)
    return chunks


def parse_observation(obs: dict) -> dict:
    taxon = obs.get("taxon") or {}
    coordinates = (obs.get("geojson") or {}).get("coordinates") or [None, None]
    observed_on = obs.get("observed_on")

    return {
        "observation_id": obs.get("id"),
        "taxon_id": taxon.get("id"),
        "taxon_name": taxon.get("name"),
        "common_name": (taxon.get("preferred_common_name") or "").strip(),
        "quality_grade": obs.get("quality_grade"),
        "observed_on": observed_on,
        "observed_month": observed_on[:7] if observed_on else None,
        "latitude": coordinates[1],
        "longitude": coordinates[0],
        "place_guess": obs.get("place_guess") or "",
        "user_login": (obs.get("user") or {}).get("login") or "",
        "url": f"https://www.inaturalist.org/observations/{obs.get('id')}",
    }


def fetch_observations(
    place_ids: list[int],
    taxon_ids: list[int] | None,
    quality_grades: Iterable[str],
    max_records: int,
    max_pages: int,
    delay_seconds: float,
    iconic_taxa: str | None = None,
) -> tuple[pd.DataFrame, dict]:
    session = requests.Session()
    headers = {"User-Agent": "PNW-Streamlit-Reporting/1.0"}

    rows: list[dict] = []
    query_count = 0
    page_count = 0
    truncated = False
    total_results_sum = 0

    quality = ",".join(sorted({q for q in quality_grades if q}))
    taxon_chunks = chunk_taxon_ids(taxon_ids or [])

    for chunk_idx, taxon_chunk in enumerate(taxon_chunks, start=1):
        id_below = None
        chunk_pages = 0

        while chunk_pages < max_pages and len(rows) < max_records:
            params = {
                "place_id": ",".join(str(p) for p in place_ids),
                "per_page": PER_PAGE,
                "order": "desc",
                "order_by": "id",
            }
            if quality:
                params["quality_grade"] = quality
            if taxon_chunk:
                params["taxon_id"] = ",".join(str(t) for t in taxon_chunk)
            if iconic_taxa:
                params["iconic_taxa"] = iconic_taxa
            if id_below:
                params["id_below"] = str(id_below)

            response = session.get(f"{API_BASE}/observations", params=params, headers=headers, timeout=45)
            response.raise_for_status()
            payload = response.json()

            query_count += 1
            page_count += 1
            chunk_pages += 1
            total_results_sum += int(payload.get("total_results") or 0)

            results = payload.get("results") or []
            if not results:
                break

            for obs in results:
                rows.append(parse_observation(obs))
                if len(rows) >= max_records:
                    truncated = True
                    break

            min_id = min((obs.get("id") for obs in results if obs.get("id")), default=None)
            if min_id is None:
                break
            id_below = min_id

            if len(results) < PER_PAGE:
                break
            if chunk_pages >= max_pages:
                truncated = True
                break
            if len(rows) >= max_records:
                break

            time.sleep(max(0.0, delay_seconds))

        if len(rows) >= max_records:
            break

    frame = pd.DataFrame(rows)
    if not frame.empty:
        frame["observed_on"] = pd.to_datetime(frame["observed_on"], errors="coerce")

    metadata = {
        "query_count": query_count,
        "page_count": page_count,
        "record_count": len(rows),
        "total_results_sum": total_results_sum,
        "truncated": truncated,
        "fetched_at_utc": datetime.now(tz=timezone.utc).isoformat(timespec="seconds"),
    }
    return frame, metadata


@st.cache_data(ttl=3600, show_spinner=False)
def load_observations_cached(
    place_ids: tuple[int, ...],
    taxon_ids: tuple[int, ...],
    quality_grades: tuple[str, ...],
    max_records: int,
    max_pages: int,
    delay_seconds: float,
    iconic_taxa: str,
) -> tuple[list[dict], dict]:
    frame, metadata = fetch_observations(
        place_ids=list(place_ids),
        taxon_ids=list(taxon_ids) if taxon_ids else None,
        quality_grades=quality_grades,
        max_records=max_records,
        max_pages=max_pages,
        delay_seconds=delay_seconds,
        iconic_taxa=iconic_taxa or None,
    )
    return frame.to_dict(orient="records"), metadata


st.set_page_config(page_title="PNW iNaturalist Reporting", layout="wide")
st.title("PNW iNaturalist Reporting Dashboard")
st.caption("Efficient chained queries with local Streamlit caching for repeatable reporting.")

default_taxon_ids = load_default_taxon_ids()

with st.sidebar:
    st.header("Query Settings")
    mode = st.selectbox(
        "Taxon Scope",
        (
            "Tracked dashboard taxa",
            "Custom taxon IDs",
            "No taxon filter",
        ),
    )

    place_ids_text = st.text_input(
        "PNW place IDs (comma-separated)",
        value="10,11,12",
        help="Defaults to Oregon, Washington, and Idaho.",
    )
    place_ids = parse_int_csv(place_ids_text) or DEFAULT_PNW_PLACE_IDS

    custom_taxa_text = st.text_area(
        "Custom taxon IDs",
        value="",
        height=90,
        help="Only used when Taxon Scope is set to Custom taxon IDs.",
    )

    iconic_taxa = st.text_input(
        "Iconic taxa filter (optional)",
        value=DEFAULT_ICONIC_TAXA if mode == "No taxon filter" else "",
        help="Useful when querying without explicit taxon IDs (for example: Fungi).",
    )

    quality = st.multiselect(
        "Quality grades",
        options=["research", "needs_id", "casual"],
        default=["research", "needs_id"],
    )
    max_records = st.slider("Max records", min_value=500, max_value=20000, value=DEFAULT_MAX_RECORDS, step=500)
    max_pages = st.slider("Max chained pages per chunk", min_value=5, max_value=250, value=DEFAULT_MAX_PAGES, step=5)
    delay_seconds = st.slider("Request delay (seconds)", min_value=0.0, max_value=2.0, value=DEFAULT_DELAY_SECONDS, step=0.1)

    if st.button("Clear Streamlit cache"):
        st.cache_data.clear()
        st.success("Cache cleared.")

if mode == "Tracked dashboard taxa":
    taxon_ids = default_taxon_ids
elif mode == "Custom taxon IDs":
    taxon_ids = parse_int_csv(custom_taxa_text)
else:
    taxon_ids = []

if mode != "No taxon filter" and not taxon_ids:
    st.error("No taxon IDs were provided. Select tracked taxa or enter custom taxon IDs.")
    st.stop()

with st.spinner("Fetching observations from iNaturalist..."):
    records, meta = load_observations_cached(
        place_ids=tuple(place_ids),
        taxon_ids=tuple(taxon_ids),
        quality_grades=tuple(quality),
        max_records=max_records,
        max_pages=max_pages,
        delay_seconds=delay_seconds,
        iconic_taxa=iconic_taxa.strip(),
    )

df = pd.DataFrame.from_records(records)

if df.empty:
    st.warning("No observations returned for the current query settings.")
    st.stop()

col1, col2, col3, col4 = st.columns(4)
col1.metric("Observations", f"{len(df):,}")
col2.metric("Distinct taxa", f"{df['taxon_id'].nunique():,}")
col3.metric("API requests", f"{meta.get('query_count', 0):,}")
col4.metric("Fetched at (UTC)", meta.get("fetched_at_utc", "n/a"))

if meta.get("truncated"):
    st.warning(
        "Result set was truncated by max records or max pages. Increase limits if you need full history."
    )

date_min = df["observed_on"].min()
date_max = df["observed_on"].max()
if pd.notna(date_min) and pd.notna(date_max):
    st.caption(f"Date range in dataset: {date_min.date().isoformat()} to {date_max.date().isoformat()}")

monthly = (
    df.dropna(subset=["observed_on"])
    .assign(month=lambda frame: frame["observed_on"].dt.to_period("M").astype(str))
    .groupby("month", as_index=False)["observation_id"]
    .count()
    .rename(columns={"observation_id": "observations"})
)

quality_counts = (
    df.groupby("quality_grade", as_index=False)["observation_id"]
    .count()
    .rename(columns={"observation_id": "observations"})
    .sort_values("observations", ascending=False)
)

top_taxa = (
    df.groupby(["taxon_id", "taxon_name", "common_name"], as_index=False)["observation_id"]
    .count()
    .rename(columns={"observation_id": "observations"})
    .sort_values("observations", ascending=False)
)

chart_col_1, chart_col_2 = st.columns(2)
with chart_col_1:
    st.subheader("Monthly observations")
    monthly_fig = px.line(monthly, x="month", y="observations", markers=True)
    monthly_fig.update_layout(height=360, margin=dict(l=10, r=10, t=30, b=10))
    st.plotly_chart(monthly_fig, use_container_width=True)

with chart_col_2:
    st.subheader("Quality distribution")
    quality_fig = px.bar(quality_counts, x="quality_grade", y="observations")
    quality_fig.update_layout(height=360, margin=dict(l=10, r=10, t=30, b=10))
    st.plotly_chart(quality_fig, use_container_width=True)

st.subheader("Top taxa by observation count")
st.dataframe(top_taxa.head(50), use_container_width=True, hide_index=True)

map_df = df.dropna(subset=["latitude", "longitude"])[["latitude", "longitude"]]
if not map_df.empty:
    st.subheader("Observation map")
    st.map(map_df, size=5)

st.subheader("Raw observations")
display_df = df[
    [
        "observation_id",
        "observed_on",
        "taxon_id",
        "taxon_name",
        "common_name",
        "quality_grade",
        "place_guess",
        "latitude",
        "longitude",
        "user_login",
        "url",
    ]
].sort_values("observed_on", ascending=False)
st.dataframe(display_df.head(1000), use_container_width=True, hide_index=True)

csv_bytes = display_df.to_csv(index=False).encode("utf-8")
st.download_button(
    label="Download CSV",
    data=csv_bytes,
    file_name=f"pnw_inat_observations_{datetime.now().date().isoformat()}.csv",
    mime="text/csv",
)

st.caption(
    f"Approximate page efficiency: {meta.get('query_count', 0)} request(s) for {len(df):,} observations "
    f"({math.floor(len(df) / max(meta.get('query_count', 1), 1))} obs/request)."
)
