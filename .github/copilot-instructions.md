# Copilot Instructions for excel_dockers

## Project Overview
This project is a Node.js application for extracting, processing, and saving commodity market data (e.g., CME Group) into Excel files. It exposes an Express API for triggering data extraction and Excel generation, with logging and configuration handled via utility modules.

## Architecture & Key Components
- **index.js**: Express server exposing `/marquis/book` (POST) for data extraction and `/marquis/version` (GET) for version info. Orchestrates the main workflow.
- **orchestrator.js**: Central logic for data extraction, date handling, and Excel data preparation. Calls data extractors and Excel drivers.
- **dataExtractor.js**: (Not shown) Presumed to contain functions for fetching and parsing market data from various sources.
- **drivers.js**: (Not shown) Presumed to handle Excel file creation and saving.
- **utils.js**: Logging, configuration, date utilities, and file helpers. Handles log rotation and environment constants.
- **logs/**: Log files are written here. Log rotation is automatic when files exceed 5MB.
- **tmp/**, **data/**: Used for temporary and persistent data storage.

## Developer Workflows
- **Run the server**: `node index.js` (default port: 8827)
- **Trigger data extraction**: POST to `http://localhost:8827/marquis/book` with JSON `{ "date": "MM/DD/YYYY" }` (date optional; defaults to yesterday)
- **Check version**: GET `http://localhost:8827/marquis/version`
- **Logs**: Check `logs/log.txt` for info, errors, and debug output. Log rotation is handled automatically.

## Project-Specific Patterns & Conventions
- **Date Handling**: Dates are expected in `MM/DD/YYYY` format. If no date is provided, the previous day is used.
- **Exception Days**: Dates in `exceptionDays` (see `utils.js`) or weekends are skipped for processing.
- **Logging**: Use `writeLog(message, level, globalConfig)` for all logs. Levels: INFO, ERROR, WARN, DEBUG.
- **Configuration**: Use `getConstants()` and `setConstants()` from `utils.js` for global config. Avoid hardcoding paths or constants elsewhere.
- **Excel Output**: Excel file naming and structure are controlled by `excelName` in constants.

## Integration & Dependencies
- **External APIs**: Data extraction may use HTTP requests (see `axios`, `request`, `sync-request` in dependencies).
- **Excel Generation**: Uses `xlsx-template` for templated Excel output.
- **Prompting**: `prompt-sync` is included but not actively used in main flows.

## Examples
- To add a new data source, implement a function in `dataExtractor.js` and integrate it in `orchestrator.js`.
- To change log behavior, adjust `CONSOLE_LOG` or log levels in `utils.js`.

## Cautions
- Do not process dates on weekends or in `exceptionDays`.
- Always use provided utility functions for logging and file operations.
- Avoid direct file path manipulation; use helpers in `utils.js`.

---
For questions or unclear conventions, review `index.js`, `orchestrator.js`, and `utils.js` for canonical patterns.
