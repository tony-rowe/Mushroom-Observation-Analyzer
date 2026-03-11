# AGENTS.md

## Cursor Cloud specific instructions

### Overview
Mushroom Observer is a single-file Python CLI application (`LCF.py`) that tracks mushroom observations via the iNaturalist public API. It generates interactive HTML reports with heatmaps and statistics.

### Running the application
```
python3 LCF.py
```
The app presents an interactive Rich-powered menu. When automating via piped input, use `printf` with `\n` separators (e.g. `printf '1\n\nq\n' | python3 LCF.py`).

### Key caveats
- **numpy/pandas compatibility:** The pinned `pandas==2.1.1` requires numpy 1.x. The update script installs `numpy<2.0` to avoid the `numpy.dtype size changed` ABI error that occurs with numpy 2.x (pre-installed on the VM).
- **No test suite or lint config:** The repo has no automated tests and no linting configuration. Use `python3 -m pyflakes LCF.py` for basic static analysis or `python3 -m py_compile LCF.py` for syntax validation.
- **Interactive prompts:** All user interaction uses `rich.prompt.Prompt.ask` and `input()`. When piping input, supply `\n` after each prompt response including "Press Enter to continue" pauses.
- **API rate limiting:** The iNaturalist API is rate-limited at 0.5s between requests. Report generation for mushrooms without cached data can be slow.
- **mushrooms.txt format:** CSV with `name,taxon_id` per line. The file ships with a dummy entry `1,1`.
- **Generated artifacts:** Reports go to `reports/`, cached data to `mushroom_data/`, logs to `logs/`.
