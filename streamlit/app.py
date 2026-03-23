from __future__ import annotations

import math
import re
import sqlite3
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable

import pandas as pd
import plotly.express as px
import requests
import streamlit as st

API_BASE = "https://api.inaturalist.org/v1"
PER_PAGE = 200
DEFAULT_PNW_PLACE_IDS = [10, 46]
DEFAULT_DELAY_SECONDS = 1.1
DEFAULT_MAX_RECORDS = 4000
DEFAULT_MAX_PAGES = 60
DEFAULT_ICONIC_TAXA = "Fungi"
PNW_BOUNDS = {
    "min_latitude": 41.95,
    "max_latitude": 49.05,
    "min_longitude": -124.9,
    "max_longitude": -116.35,
}


def resolve_default_cache_db() -> Path:
    # Docker deployment stores cache at /app/data/cache.db.
    docker_path = Path("/app/data/cache.db")
    repo_path = Path(__file__).resolve().parents[1] / "dashboard" / "data" / "cache.db"
    if docker_path.exists():
        return docker_path
    return repo_path


DASHBOARD_CACHE_DB = resolve_default_cache_db()


def parse_int_csv(text: str) -> list[int]:
    values = []
    for token in re.split(r"[,\s]+", text.strip()):
        if not token:
            continue
        if token.isdigit():
            values.append(int(token))
    return sorted(set(values))


def load_builtin_species_map() -> dict[str, int]:
    server_dir = Path(__file__).resolve().parents[1] / "dashboard" / "server"
    candidate_files = [
        server_dir / "all-species.js",
        server_dir / "species.js",
    ]
    # Streamlit Docker image includes species.js, while local dev may also have all-species.js.
    for species_js in candidate_files:
        if not species_js.exists():
            continue
        content = species_js.read_text(encoding="utf-8")
        matches = re.findall(r"id:\s*['\"]([^'\"]+)['\"]\s*,\s*taxonId:\s*(\d+)", content)
        if matches:
            return {species_id: int(taxon_id) for species_id, taxon_id in matches}
    return {}


def load_default_taxon_ids(cache_db_path: Path | None = None) -> list[int]:
    builtin_map = load_builtin_species_map()
    if not builtin_map:
        return []

    taxon_ids = set(builtin_map.values())
    db_path = cache_db_path or DASHBOARD_CACHE_DB
    if not db_path.exists():
        return sorted(taxon_ids)

    try:
        with sqlite3.connect(db_path) as conn:
            conn.row_factory = sqlite3.Row

            imported_taxon_rows = conn.execute("SELECT taxon_id FROM imported_species").fetchall()
            for row in imported_taxon_rows:
                taxon_id = row["taxon_id"]
                if isinstance(taxon_id, int):
                    taxon_ids.add(taxon_id)

            hidden_taxon_rows = conn.execute(
                "SELECT taxon_id FROM builtin_species_visibility WHERE hidden = 1"
            ).fetchall()
            hidden_taxa = {
                row["taxon_id"] for row in hidden_taxon_rows if isinstance(row["taxon_id"], int)
            }
            taxon_ids.difference_update(hidden_taxa)
    except sqlite3.Error:
        return sorted(taxon_ids)

    return sorted(taxon_ids)


@st.cache_data(ttl=1800, show_spinner=False)
def load_observations_from_dashboard_cache(
    db_path: str,
    taxon_ids: tuple[int, ...],
    quality_grades: tuple[str, ...],
    max_records: int,
    enforce_pnw_bounds: bool,
    years: tuple[int, ...] = (),
) -> list[dict]:
    if not Path(db_path).exists():
        return []

    clauses = ["observed_on IS NOT NULL"]
    params: list[object] = []

    if taxon_ids:
        placeholders = ",".join(["?"] * len(taxon_ids))
        clauses.append(f"taxon_id IN ({placeholders})")
        params.extend(taxon_ids)

    if quality_grades:
        placeholders = ",".join(["?"] * len(quality_grades))
        clauses.append(f"quality_grade IN ({placeholders})")
        params.extend(quality_grades)

    if enforce_pnw_bounds:
        clauses.append(
            "((latitude IS NULL OR longitude IS NULL) OR (latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?))"
        )
        params.extend(
            [
                PNW_BOUNDS["min_latitude"],
                PNW_BOUNDS["max_latitude"],
                PNW_BOUNDS["min_longitude"],
                PNW_BOUNDS["max_longitude"],
            ]
        )

    where_sql = " AND ".join(clauses)
    query = f"""
        SELECT
            id as observation_id,
            taxon_id,
            species_guess as taxon_name,
            species_guess as common_name,
            quality_grade,
            observed_on,
            latitude,
            longitude,
            place_guess,
            user_login
        FROM observations
        WHERE {where_sql}
        ORDER BY observed_on DESC
        LIMIT ?
    """
    params.append(max_records)

    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(query, params).fetchall()

    records = [dict(row) for row in rows]
    for row in records:
        row["url"] = f"https://www.inaturalist.org/observations/{row.get('observation_id')}"
    
    # Apply year filtering if specified
    if years:
        filtered_records = []
        for row in records:
            observed_on = row.get("observed_on")
            if observed_on:
                try:
                    # Extract year from date string (format: YYYY-MM-DD)
                    year = int(observed_on[:4])
                    if year in years:
                        filtered_records.append(row)
                except (ValueError, TypeError):
                    # If we can't parse the date, include it
                    filtered_records.append(row)
            else:
                # Include records without dates
                filtered_records.append(row)
        records = filtered_records
    
    return records


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


def in_pnw_bounds(latitude: object, longitude: object) -> bool:
    try:
        lat = float(latitude)
        lon = float(longitude)
    except (TypeError, ValueError):
        return False
    return (
        PNW_BOUNDS["min_latitude"] <= lat <= PNW_BOUNDS["max_latitude"]
        and PNW_BOUNDS["min_longitude"] <= lon <= PNW_BOUNDS["max_longitude"]
    )


def filter_records_by_pnw_bounds(records: list[dict]) -> tuple[list[dict], int]:
    filtered: list[dict] = []
    removed = 0
    for row in records:
        lat = row.get("latitude")
        lon = row.get("longitude")
        if lat is None or lon is None or in_pnw_bounds(lat, lon):
            filtered.append(row)
        else:
            removed += 1
    return filtered, removed


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


st.set_page_config(
    page_title="PNW Mushroom Observation Analyzer",
    page_icon="🍄",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.title("🍄 PNW Mushroom Observation Analyzer")
st.markdown("""
<div style='background-color: #f0f2f6; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;'>
<strong>Professional Dashboard</strong> • Comprehensive analysis of mushroom observations in the Pacific Northwest
</div>
""", unsafe_allow_html=True)

with st.sidebar:
    st.header("⚙️ Query Settings")
    
    data_source = st.selectbox(
        "Data Source",
        ("Dashboard SQLite cache (fastest)", "iNaturalist API (live fetch)"),
        help="Use the local dashboard cache whenever possible to minimize API calls.",
    )
    
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
        value="10,46",
        help="Defaults to Oregon and Washington.",
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

    cache_db_path = st.text_input(
        "Dashboard cache DB path",
        value=str(DASHBOARD_CACHE_DB),
        help="Default cache location populated by the Express dashboard sync.",
    )
    default_taxon_ids = load_default_taxon_ids(Path(cache_db_path))

    quality = st.multiselect(
        "Quality grades",
        options=["research", "needs_id", "casual"],
        default=["research", "needs_id"],
    )
    max_records = st.slider("Max records", min_value=500, max_value=20000, value=DEFAULT_MAX_RECORDS, step=500)
    max_pages = st.slider("Max chained pages per chunk", min_value=5, max_value=250, value=DEFAULT_MAX_PAGES, step=5)
    delay_seconds = st.slider("Request delay (seconds)", min_value=0.0, max_value=2.0, value=DEFAULT_DELAY_SECONDS, step=0.1)
    enforce_pnw_bounds = st.checkbox(
        "Enforce PNW coordinate bounds",
        value=True,
        help="Filters out rows with coordinates outside Oregon/Washington bounds.",
    )
    
    # Year filtering
    st.subheader("Time Filtering")
    year_filter_enabled = st.checkbox("Filter by year", value=False, help="Enable year-based filtering")
    selected_years = []
    if year_filter_enabled:
        current_year = datetime.now().year
        available_years = list(range(2010, current_year + 1))
        selected_years = st.multiselect(
            "Select years",
            options=available_years,
            default=[current_year, current_year - 1],
            help="Select specific years to filter observations"
        )

    if st.button("🔄 Clear Streamlit cache", type="secondary"):
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

if data_source.startswith("Dashboard SQLite"):
    with st.spinner("Loading observations from dashboard cache..."):
        records = load_observations_from_dashboard_cache(
            db_path=cache_db_path,
            taxon_ids=tuple(taxon_ids),
            quality_grades=tuple(quality),
            max_records=max_records,
            enforce_pnw_bounds=enforce_pnw_bounds,
            years=tuple(selected_years) if year_filter_enabled and selected_years else (),
        )
        meta = {
            "query_count": 0,
            "page_count": 0,
            "record_count": len(records),
            "truncated": len(records) >= max_records,
            "fetched_at_utc": datetime.now(tz=timezone.utc).isoformat(timespec="seconds"),
            "source": "dashboard_cache",
            "cache_db_path": cache_db_path,
        }
else:
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
        meta["source"] = "inat_api"
        
        # Apply year filtering for API-loaded data
        if year_filter_enabled and selected_years:
            filtered_records = []
            for row in records:
                observed_on = row.get("observed_on")
                if observed_on:
                    try:
                        # Extract year from date string
                        year = int(str(observed_on)[:4])
                        if year in selected_years:
                            filtered_records.append(row)
                    except (ValueError, TypeError):
                        # If we can't parse the date, include it
                        filtered_records.append(row)
                else:
                    # Include records without dates
                    filtered_records.append(row)
            records = filtered_records
            meta["record_count"] = len(records)

if enforce_pnw_bounds:
    records, removed_out_of_region = filter_records_by_pnw_bounds(records)
    meta["removed_out_of_region"] = removed_out_of_region
else:
    meta["removed_out_of_region"] = 0

df = pd.DataFrame.from_records(records)
if not df.empty:
    df["observed_on"] = pd.to_datetime(df["observed_on"], errors="coerce")

if df.empty:
    st.warning("No observations returned for the current query settings.")
    st.stop()

col1, col2, col3, col4 = st.columns(4)
col1.metric("Observations", f"{len(df):,}")
col2.metric("Distinct taxa", f"{df['taxon_id'].nunique():,}")
if meta.get("source") == "dashboard_cache":
    col3.metric("API requests", "0")
else:
    col3.metric("API requests", f"{meta.get('query_count', 0):,}")
col4.metric("Fetched at (UTC)", meta.get("fetched_at_utc", "n/a"))

if meta.get("truncated"):
    st.warning(
        "Result set was truncated by max records or max pages. Increase limits if you need full history."
    )

if meta.get("removed_out_of_region"):
    st.info(f"Filtered out {meta['removed_out_of_region']:,} out-of-region observations using PNW bounds.")

date_min = df["observed_on"].min()
date_max = df["observed_on"].max()
if pd.notna(date_min) and pd.notna(date_max):
    st.caption(f"Date range in dataset: {date_min.date().isoformat()} to {date_max.date().isoformat()}")

daily = (
    df.dropna(subset=["observed_on"])
    .assign(day=lambda frame: frame["observed_on"].dt.date)
    .groupby("day", as_index=False)["observation_id"]
    .count()
    .rename(columns={"observation_id": "observations"})
    .sort_values("day")
)
if not daily.empty:
    daily["rolling_7d"] = daily["observations"].rolling(window=7, min_periods=1).sum()
    trailing_7d = int(daily.tail(7)["observations"].sum())
    st.metric("Trailing 7-day observations", f"{trailing_7d:,}")

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

tab_rolling, tab_standard, tab_taxa = st.tabs(["📈 Temporal Trends", "📊 Monthly & Quality", "🔬 Species Analysis"])

with tab_rolling:
    st.header("📈 Temporal Trends Analysis")
    
    if daily.empty:
        st.info("Not enough dated observations to compute temporal metrics.")
    else:
        # Enhanced time series analysis
        col1, col2 = st.columns(2)
        
        with col1:
            # Daily trends with rolling average
            rolling_fig = px.line(
                daily,
                x="day",
                y=["observations", "rolling_7d"],
                title="Daily Observations with 7-Day Rolling Average",
                labels={"value": "Observations", "variable": "Series", "day": "Date"},
            )
            rolling_fig.update_layout(height=400)
            st.plotly_chart(rolling_fig, use_container_width=True)
        
        with col2:
            # Weekly aggregation
            weekly = daily.copy()
            weekly['week'] = weekly['day'].apply(lambda x: x.isocalendar()[1])
            weekly['year'] = weekly['day'].apply(lambda x: x.year)
            weekly_agg = weekly.groupby(['year', 'week']).agg({'observations': 'sum'}).reset_index()
            weekly_agg['week_label'] = weekly_agg.apply(lambda x: f"{x['year']}-W{x['week']:02d}", axis=1)
            
            weekly_fig = px.bar(
                weekly_agg.tail(20),  # Last 20 weeks
                x='week_label',
                y='observations',
                title="Weekly Observation Trends (Last 20 Weeks)",
                labels={'week_label': 'Week', 'observations': 'Observations'}
            )
            weekly_fig.update_layout(height=400, xaxis_tickangle=-45)
            st.plotly_chart(weekly_fig, use_container_width=True)
        
        # Momentum analysis
        st.subheader("Weekly Momentum Analysis")
        
        now_utc = datetime.now(tz=timezone.utc)
        current_start = pd.Timestamp(now_utc.date() - timedelta(days=6))
        previous_start = pd.Timestamp(now_utc.date() - timedelta(days=13))
        previous_end = pd.Timestamp(now_utc.date() - timedelta(days=7))

        dated_df = df.dropna(subset=["observed_on"])
        current_week = (
            dated_df[dated_df["observed_on"].dt.date >= current_start.date()]
            .groupby(["taxon_id", "common_name"], as_index=False)["observation_id"]
            .count()
            .rename(columns={"observation_id": "current_7d"})
        )
        previous_week = (
            dated_df[
                (dated_df["observed_on"].dt.date >= previous_start.date())
                & (dated_df["observed_on"].dt.date <= previous_end.date())
            ]
            .groupby(["taxon_id", "common_name"], as_index=False)["observation_id"]
            .count()
            .rename(columns={"observation_id": "previous_7d"})
        )
        
        if not current_week.empty:
            momentum = current_week.merge(previous_week, how="left", on=["taxon_id", "common_name"]).fillna(0)
            momentum["delta"] = momentum["current_7d"] - momentum["previous_7d"]
            momentum["growth_rate"] = momentum.apply(
                lambda x: (x["delta"] / x["previous_7d"] * 100) if x["previous_7d"] > 0 else float('inf'),
                axis=1
            )
            momentum = momentum.sort_values(["delta", "current_7d"], ascending=False)
            
            # Display momentum metrics
            total_current = momentum["current_7d"].sum()
            total_previous = momentum["previous_7d"].sum()
            total_delta = total_current - total_previous
            total_growth = (total_delta / total_previous * 100) if total_previous > 0 else 0
            
            metric_col1, metric_col2, metric_col3 = st.columns(3)
            with metric_col1:
                st.metric("Current Week", f"{total_current:,}", f"{total_delta:+,}")
            with metric_col2:
                st.metric("Previous Week", f"{total_previous:,}")
            with metric_col3:
                st.metric("Growth Rate", f"{total_growth:.1f}%")
            
            # Top gainers and losers
            gainers = momentum[momentum["delta"] > 0].head(10)
            losers = momentum[momentum["delta"] < 0].sort_values("delta").head(10)
            
            gain_col, lose_col = st.columns(2)
            
            with gain_col:
                st.subheader("📈 Top Gainers This Week")
                if not gainers.empty:
                    gainers_display = gainers.copy()
                    gainers_display["display_name"] = gainers_display.apply(
                        lambda x: x["common_name"] if pd.notna(x["common_name"]) and x["common_name"] != "" else f"Taxon {x['taxon_id']}",
                        axis=1
                    )
                    st.dataframe(
                        gainers_display[["display_name", "current_7d", "delta", "growth_rate"]].head(10),
                        use_container_width=True,
                        hide_index=True,
                        column_config={
                            "display_name": "Species",
                            "current_7d": "Current Week",
                            "delta": st.column_config.NumberColumn("Change", format="%+d"),
                            "growth_rate": st.column_config.NumberColumn("Growth %", format="%.1f%%")
                        }
                    )
                else:
                    st.info("No gainers this week.")
            
            with lose_col:
                st.subheader("📉 Top Decliners This Week")
                if not losers.empty:
                    losers_display = losers.copy()
                    losers_display["display_name"] = losers_display.apply(
                        lambda x: x["common_name"] if pd.notna(x["common_name"]) and x["common_name"] != "" else f"Taxon {x['taxon_id']}",
                        axis=1
                    )
                    st.dataframe(
                        losers_display[["display_name", "current_7d", "delta", "growth_rate"]].head(10),
                        use_container_width=True,
                        hide_index=True,
                        column_config={
                            "display_name": "Species",
                            "current_7d": "Current Week",
                            "delta": st.column_config.NumberColumn("Change", format="%+d"),
                            "growth_rate": st.column_config.NumberColumn("Growth %", format="%.1f%%")
                        }
                    )
                else:
                    st.info("No decliners this week.")
        else:
            st.info("Not enough data for weekly momentum analysis.")

with tab_standard:
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

with tab_taxa:
    st.header("🔬 Comprehensive Species Analysis")
    st.markdown("Observation counts sorted by total descending, with detailed analysis of species distribution.")
    
    # Summary metrics
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Species", f"{len(top_taxa):,}")
    with col2:
        st.metric("Total Observations", f"{top_taxa['observations'].sum():,}")
    with col3:
        rare_species = len(top_taxa[top_taxa['observations'] == 1])
        st.metric("Species with 1 Observation", f"{rare_species:,}")
    
    # Distribution analysis
    st.subheader("Observation Distribution by Species")
    
    # Create bins for observation counts
    if not top_taxa.empty:
        # Calculate distribution
        obs_bins = pd.cut(top_taxa['observations'], 
                         bins=[0, 1, 5, 10, 20, 50, 100, 500, 1000, float('inf')],
                         labels=['1', '2-5', '6-10', '11-20', '21-50', '51-100', '101-500', '501-1000', '1000+'])
        bin_counts = obs_bins.value_counts().sort_index()
        
        # Create bar chart
        dist_fig = px.bar(
            x=bin_counts.index.astype(str),
            y=bin_counts.values,
            title="How Many Species Have How Many Observations?",
            labels={'x': 'Observation Range', 'y': 'Number of Species'}
        )
        dist_fig.update_layout(height=400)
        st.plotly_chart(dist_fig, use_container_width=True)
    
    # Interactive species explorer
    st.subheader("Species Observation Explorer")
    
    # Filters
    filter_col1, filter_col2, filter_col3 = st.columns(3)
    with filter_col1:
        min_obs_filter = st.number_input("Minimum observations", min_value=1, max_value=1000, value=1, step=1)
    with filter_col2:
        max_obs_filter = st.number_input("Maximum observations", 
                                        min_value=1, 
                                        max_value=int(top_taxa['observations'].max()) if not top_taxa.empty else 1000,
                                        value=int(top_taxa['observations'].max()) if not top_taxa.empty else 100,
                                        step=1)
    with filter_col3:
        display_limit = st.slider("Number to display", 10, 500, 100)
    
    # Apply filters
    filtered_species = top_taxa[
        (top_taxa['observations'] >= min_obs_filter) & 
        (top_taxa['observations'] <= max_obs_filter)
    ].copy()
    
    # Create display name
    filtered_species['display_name'] = filtered_species.apply(
        lambda x: f"{x['common_name']} ({x['taxon_name']})" if pd.notna(x['common_name']) and x['common_name'] != '' else x['taxon_name'],
        axis=1
    )
    
    if not filtered_species.empty:
        # Show filtered results
        st.dataframe(
            filtered_species[['display_name', 'observations', 'taxon_id']].head(display_limit),
            use_container_width=True,
            hide_index=True,
            column_config={
                "display_name": "Species Name",
                "observations": st.column_config.NumberColumn("Observations", format="%d"),
                "taxon_id": st.column_config.NumberColumn("Taxon ID", format="%d")
            }
        )
        
        # Summary
        st.info(f"Showing {min(display_limit, len(filtered_species))} of {len(filtered_species):,} species with {filtered_species['observations'].sum():,} total observations.")
        
        # Export
        csv_data = filtered_species[['taxon_id', 'taxon_name', 'common_name', 'observations']].to_csv(index=False).encode('utf-8')
        st.download_button(
            label="📥 Download Filtered Species Data",
            data=csv_data,
            file_name=f"filtered_species_{datetime.now().date().isoformat()}.csv",
            mime="text/csv"
        )
    else:
        st.warning("No species match the selected criteria.")
    
    # Rare species section
    st.subheader("Rare Species (Single Observations)")
    single_obs_species = top_taxa[top_taxa['observations'] == 1]
    
    if not single_obs_species.empty:
        st.success(f"Found {len(single_obs_species):,} species with only one observation.")
        
        # Show rare species
        rare_display = single_obs_species.copy()
        rare_display['display_name'] = rare_display.apply(
            lambda x: f"{x['common_name']} ({x['taxon_name']})" if pd.notna(x['common_name']) and x['common_name'] != '' else x['taxon_name'],
            axis=1
        )
        
        st.dataframe(
            rare_display[['display_name', 'taxon_id']].head(50),
            use_container_width=True,
            hide_index=True,
            column_config={
                "display_name": "Species Name",
                "taxon_id": st.column_config.NumberColumn("Taxon ID", format="%d")
            }
        )
        
        if len(single_obs_species) > 50:
            st.caption(f"Showing 50 of {len(single_obs_species):,} rare species.")
    else:
        st.info("No species with only one observation in the current dataset.")

# Enhanced geographic analysis
st.header("🗺️ Geographic Analysis")
st.markdown("Visualizing where observations are occurring across the Pacific Northwest.")

if not df.empty and df['latitude'].notna().any() and df['longitude'].notna().any():
    # Create map dataframe
    map_df = df.dropna(subset=["latitude", "longitude"]).copy()
    
    # Add density calculation (simplified)
    map_df['location_group'] = map_df.apply(
        lambda x: f"{round(x['latitude'], 2)},{round(x['longitude'], 2)}", axis=1
    )
    location_counts = map_df['location_group'].value_counts().reset_index()
    location_counts.columns = ['location_group', 'observation_count']
    
    # Merge back to get coordinates
    map_df = map_df.merge(location_counts, on='location_group')
    
    # Create tabs for different map views
    map_tab1, map_tab2, map_tab3 = st.tabs(["Basic Map", "Density Heatmap", "Location Insights"])
    
    with map_tab1:
        st.subheader("Observation Locations")
        st.map(map_df[['latitude', 'longitude']], size=5)
        st.caption(f"Showing {len(map_df):,} observations with coordinates.")
    
    with map_tab2:
        st.subheader("Observation Density")
        # Create a simple heatmap using scatter plot with size based on density
        if len(map_df) > 0:
            # Sample to avoid overcrowding
            sample_df = map_df.sample(min(1000, len(map_df)))
            heat_fig = px.scatter_mapbox(
                sample_df,
                lat='latitude',
                lon='longitude',
                size='observation_count',
                size_max=20,
                zoom=6,
                height=500,
                title="Observation Density (size indicates number of observations at location)"
            )
            heat_fig.update_layout(mapbox_style="open-street-map")
            heat_fig.update_layout(margin={"r":0,"t":30,"l":0,"b":0})
            st.plotly_chart(heat_fig, use_container_width=True)
    
    with map_tab3:
        st.subheader("Location Insights")
        
        # Top locations by observation count
        top_locations = map_df.groupby('place_guess').size().reset_index(name='count').sort_values('count', ascending=False).head(10)
        
        if not top_locations.empty:
            st.write("**Top 10 Locations by Observation Count:**")
            for idx, row in top_locations.iterrows():
                st.write(f"{idx+1}. {row['place_guess'] or 'Unknown location'}: {row['count']} observations")
        
        # Geographic distribution stats
        col1, col2 = st.columns(2)
        with col1:
            unique_locations = map_df['place_guess'].nunique()
            st.metric("Unique Locations", f"{unique_locations:,}")
        
        with col2:
            avg_obs_per_location = len(map_df) / unique_locations if unique_locations > 0 else 0
            st.metric("Avg Observations per Location", f"{avg_obs_per_location:.1f}")
        
        # Location completeness
        coord_completeness = (df['latitude'].notna() & df['longitude'].notna()).sum() / len(df) * 100
        st.progress(coord_completeness / 100, text=f"Observations with coordinates: {coord_completeness:.1f}%")
else:
    st.warning("No geographic data available for mapping. Ensure observations have latitude and longitude coordinates.")

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

if meta.get("source") == "dashboard_cache":
    st.caption(f"Data source: dashboard SQLite cache ({meta.get('cache_db_path', str(DASHBOARD_CACHE_DB))}).")
else:
    st.caption(
        f"Approximate page efficiency: {meta.get('query_count', 0)} request(s) for {len(df):,} observations "
        f"({math.floor(len(df) / max(meta.get('query_count', 1), 1))} obs/request)."
    )
