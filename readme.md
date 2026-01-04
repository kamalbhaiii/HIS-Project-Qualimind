# QualiMind Data Analyst Documentation

This document provides a data analyst focused view of the QualiMind system, with emphasis on the R-Plumber preprocessing pipeline, the data flow, and how preprocessing decisions affect outputs and metadata.

---

## 1. Audience and Scope

- Audience: data analysts and analytics engineers who need to understand the preprocessing pipeline, its configuration, and how to interpret outputs.
- Scope: end-to-end preprocessing flow from file upload to cleaned outputs, including optional correlation analysis and storage, with references to relevant services.

---

## 2. System Overview (Data Perspective)

QualiMind is a full-stack platform for preparing qualitative and mixed-type datasets for downstream ML or analytics. From a data analyst standpoint, the key elements are:

- Upload a dataset (CSV/JSON/TXT) and create a preprocessing job.
- R-Plumber service runs configurable preprocessing steps and optional correlation analysis.
- Outputs include cleaned data, metadata describing applied steps, and processing summaries stored in Redis/PostgreSQL and exported as CSV/JSON/TXT.

Primary runtime components:

- Frontend (React): configuration and job monitoring UI.
- Backend (Express/TypeScript): job orchestration, validation, storage integration.
- R engine (Plumber): preprocessing logic and correlation analytics.
- Redis + PostgreSQL: job state, caching, and processing summaries.

---

## 3. Directory Guide (Data Analyst Lens)

Key directories by function:

| Directory | Purpose | Data analyst relevance |
| --- | --- | --- |
| `r-engine/` | R-Plumber preprocessing and correlation logic | Core data cleaning rules and metadata |
| `server/` | API, job orchestration, storage, schemas | How data is validated, queued, and returned |
| `frontend/` | UI for dataset upload and preprocessing config | How config is built and sent |
| `datasets/` | Sample datasets | Example inputs for testing |
| `infra/` | Deployment (Terraform + Docker) | Runtime connectivity to DB/Redis/R engine |

---

## 4. End-to-End Preprocessing Flow

### 4.1 High-level steps

1. User uploads dataset and selects preprocessing settings.
2. Backend creates a ProcessingJob and enqueues it.
3. Worker reads the dataset and calls the R engine `/clean` endpoint.
4. R engine performs preprocessing and optional correlation analysis.
5. Results and metadata are stored in Redis and PostgreSQL.
6. API returns job result data; frontend shows cleaned data and summaries.

### 4.2 Data flow (logical)

- Input file saved to disk by server (multer).
- Server enqueues a preprocessing job (BullMQ).
- Worker reads dataset file, parses into records, calls R engine.
- R engine reads inline data (preferred) or file (fallback), runs preprocessing.
- R engine stores results and metadata into Redis and PostgreSQL.
- Server exposes results via `/api/jobs/:id/result` and export endpoints.

---

## 5. Input Data Rules

### 5.1 Supported file types (upload)

- CSV, JSON, TXT, XLS/XLSX (allowed MIME types).
- File size limit: 20MB.

Implementation references:
- `server/src/loaders/multer.ts`

### 5.2 Input parsing

- Server reads CSV into row records before calling R engine.
- Inline payload is preferred; the R engine can fallback to the stored file path.

Implementation references:
- `server/src/core/r-client.ts`
- `r-engine/R/routes.R`

---

## 6. Preprocessing Modes (Tasks vs Config)

There are two modes for preprocessing. If both are missing, preprocessing is a no-op.

### 6.1 Mode A: Task list (legacy)

- Input: `preprocessingTasks` array.
- Only tasks listed are executed. No defaults.

Core function:
- `r-engine/R/preprocessing.R`

Available tasks (legacy):

| Task ID | Purpose |
| --- | --- |
| `duplicate_removal` | Drop duplicate rows |
| `missing_token_normalization` | Normalize tokens like "NA" or "" to NA |
| `numeric_type_inference` | Convert numeric-like strings to numeric |
| `handle_missing_categoricals` | Impute categorical missing values |
| `clean_category_labels` | Normalize string labels |
| `reduce_cardinality` | Collapse rare categories |
| `feature_engineering` | Frequency encoding for selected categorical interactions |
| `encode_categoricals` | One-hot or label encoding with frequency column |
| `numeric_imputation` | Median imputation |
| `numeric_scaling` | Z-score scaling |

### 6.2 Mode B: Preprocessing config (recommended)

- Input: `preprocessingConfig` JSON.
- Steps define `task`, `method`, and scope (`appliesTo`).
- Strict execution: only steps specified in config run.
- IMPORTANT invariant: missing token normalization and numeric type inference always run as preflight steps in config mode.

Core function:
- `r-engine/R/preprocessing_config.R`

Schema summary:

```
{
  "version": "1.0",
  "steps": [
    {
      "task": "missing_values" | "label_cleaning" | "reduce_cardinality" | "encoding" | "scaling" | "missing_token_normalization" | "numeric_type_inference",
      "method": "...",
      "appliesTo": {
        "types": ["categorical" | "numeric"],
        "columns": ["colA", "colB"]
      },
      "params": { "...": "..." }
    }
  ]
}
```

Implementation references:
- `server/src/utils/preprocessing.util.ts`
- `server/src/modules/preprocessing-suggest/validation/preprocessingConfig.schema.ts`
- `r-engine/R/preprocessing_config.R`

---

## 7. Preprocessing Steps and Methods (Config Mode)

### 7.1 Preflight steps (always on in config mode)

| Step | Behavior |
| --- | --- |
| `preflight:missing_token_normalization` | Trims string values and replaces tokens (`NULL`, `NA`, `""`, `?`, etc.) with NA |
| `preflight:numeric_type_inference` | Converts numeric-like strings to numeric (threshold 0.9) |

These steps update `column_actions` in metadata to document where changes occurred.

### 7.2 Task: Missing values

Methods:

| Method | Applies to | Behavior | Key params |
| --- | --- | --- | --- |
| `numeric_median` | numeric | Median imputation | none |
| `numeric_mean` | numeric | Mean imputation | none |
| `numeric_constant` | numeric | Constant fill | `value` |
| `categorical_mode` | categorical | Mode imputation | none |
| `categorical_unknown` | categorical | Constant string | `unknownLevel` |

### 7.3 Task: Label cleaning

- Method: `standard`
- Applies to categorical columns.
- Normalization steps:
  - trim whitespace
  - lowercase
  - replace non-alphanumeric with spaces
  - collapse whitespace to `_`
  - normalize underscores

### 7.4 Task: Reduce cardinality

- Method: `rare_to_other`
- Applies to categorical columns.
- Parameters:
  - `rare_prop_threshold` (default 0.01)
  - `high_cardinality_threshold` (default 50)

Behavior:
- Categories below rare threshold are replaced with `other`.
- Columns with cardinality > threshold are flagged in metadata.

### 7.5 Task: Encoding

- Method: `auto`
- Applies to categorical columns.

Behavior:
- Always adds frequency encoding `<col>_freq`.
- If unique levels <= `one_hot_max_levels` (default 10), performs one-hot.
- Otherwise performs label encoding with `<col>_label`.
- After encoding, original categorical columns are removed.

### 7.6 Task: Scaling

Methods:

| Method | Applies to | Behavior |
| --- | --- | --- |
| `zscore` | numeric | Standard score | 
| `minmax` | numeric | Min-max to 0..1 | 
| `none` | numeric | No scaling | 

---

## 8. Legacy Task Pipeline Details

If `preprocessingTasks` is provided without config:

- All behavior is opt-in; missing tasks do not execute.
- No defaults are applied.
- Task list and executed steps are stored in metadata.

Key metadata fields:

- `requested_tasks`: list of tasks asked for.
- `executed_steps`: steps actually run (may include sub-steps).
- `encoded_columns`, `frequency_encoded_columns`, `scaling_stats`, `rare_category_info`.

Implementation references:
- `r-engine/R/preprocessing.R`

---

## 9. Correlation Analysis (Optional)

If `correlationConfig` is provided, correlation is computed after preprocessing.

### 9.1 Config

```
{
  "columns": ["colA", "colB"],
  "method": "pearson" | "spearman" | "kendall",
  "topK": 50,
  "minAbs": 0,
  "includeMatrix": true,
  "maxMatrixCols": 200
}
```

### 9.2 Behavior

- Non-numeric columns are excluded.
- Constant columns are excluded.
- If fewer than 2 usable numeric columns, a message is returned in metadata.
- Top correlation pairs are sorted by absolute value and limited by `topK`.

Implementation reference:
- `r-engine/R/correlation.R`

---

## 10. Metadata and Output Interpretation

### 10.1 Metadata structure

The R engine returns `metadata` alongside cleaned data. Key fields:

- `preprocessing_mode`: `tasks` or `config`
- `original_rows`, `processed_rows`
- `original_columns`, `processed_columns`
- `categorical_columns`, `numeric_columns`, `numeric_columns_final`
- `encoded_columns`, `frequency_encoded_columns`
- `scaling_stats`, `encoding_stats`
- `rare_category_info`, `high_cardinality_columns`
- `column_actions` (config mode) showing per-column operations
- `correlation` if analysis was requested

### 10.2 Storage

- Redis: stores processed data and metadata with TTL (24h).
- PostgreSQL: stores processing summary in `dataset_processing_summary`.

Implementation reference:
- `r-engine/R/storage.R`
- `server/src/core/result-store.ts`

### 10.3 Output fields

The response from R engine includes:

- `rows`, `columns` after preprocessing
- `metadata` (detailed above)
- `data` cleaned rows (NA serialized as JSON null)
- `storage` status for Redis and PostgreSQL

Implementation reference:
- `r-engine/R/routes.R`

---

## 11. Job Lifecycle and Status

Statuses:

- `PENDING` -> `RUNNING` -> `SUCCESS` or `FAILED`

Events are emitted for real-time UI updates.

Implementation references:
- `server/src/workers/preprocess.worker.ts`
- `server/src/services/dataset.service.ts`

---

## 12. API Endpoints Relevant to Data Analysts

### 12.1 Dataset upload

`POST /api/datasets`

- multipart form with file
- optional `preprocessingTasks`, `preprocessingConfig`, `correlationConfig`

### 12.2 Job result

`GET /api/jobs/:id/result`

- returns processed data and metadata

### 12.3 Export results

`GET /api/jobs/:id/export?format=csv|json|txt`

Implementation references:
- `server/src/docs/dataset.docs.ts`
- `server/src/jobs/routes.job.ts`
- `server/src/jobs/service.job.ts`

---

## 13. Frontend Config Generation (Analyst View)

### 13.1 Explicit per-column configuration

Frontend builds `preprocessingConfig` only from explicit overrides. No implicit defaults.

Implementation reference:
- `frontend/src/lib/buildPreprocessingConfig.js`

### 13.2 Type inference in UI

The UI infers column types based on sample rows (>= 90 percent numeric-like -> numeric).

Implementation reference:
- `frontend/src/helpers/type_inference.helper.js`

---

## 14. Preprocessing Suggestion Service (LLM)

The system can generate a suggested `preprocessingConfig` based on sample rows and column profiles.

Flow:

- API receives sample rows and column profiles.
- LLM provider returns a config.
- Config is validated and normalized into canonical params.

Implementation references:
- `server/src/modules/preprocessing-suggest/` (validation, normalization, providers)

---

## 15. Operational Notes and Analyst Considerations

- If no tasks/config are provided, preprocessing is a no-op, and metadata reflects zero changes.
- In config mode, missing token normalization and numeric inference always occur even without explicit steps. This can change data types before other steps.
- Encoding removes original categorical columns; downstream models should use encoded fields.
- When correlation is requested, it is computed post-preprocessing on numeric columns only.
- Redis TTL is 24 hours; PostgreSQL stores the summary permanently.

---

## 16. Example PreprocessingConfig (Minimal)

```
{
  "version": "1.0",
  "steps": [
    {
      "task": "missing_values",
      "method": "categorical_unknown",
      "appliesTo": { "columns": ["feedback_type"] },
      "params": { "unknownLevel": "unknown" }
    },
    {
      "task": "label_cleaning",
      "method": "standard",
      "appliesTo": { "columns": ["feedback_type"] }
    },
    {
      "task": "encoding",
      "method": "auto",
      "appliesTo": { "columns": ["feedback_type"] },
      "params": { "one_hot_max_levels": 10 }
    },
    {
      "task": "scaling",
      "method": "zscore",
      "appliesTo": { "columns": ["rating"] }
    }
  ]
}
```

---

## 17. Known Limits and Risks

- Large datasets may be constrained by R memory and the 5-minute request timeout to the R engine.
- Mixed-format columns may be forced to numeric in preflight if 90 percent numeric-like; analysts should check `column_actions` to see changes.
- Encoding and scaling are irreversible for human-readable outputs; export raw data if needed for audit.

---

## 18. Key Source References

- R preprocessing logic: `r-engine/R/preprocessing.R`
- Config-based preprocessing: `r-engine/R/preprocessing_config.R`
- R routes and job logic: `r-engine/R/routes.R`, `r-engine/R/jobs.R`
- Storage logic: `r-engine/R/storage.R`
- Server R engine client: `server/src/core/r-client.ts`
- Dataset orchestration: `server/src/services/dataset.service.ts`
- Job API: `server/src/jobs/service.job.ts`
- Frontend config builder: `frontend/src/lib/buildPreprocessingConfig.js`

---

If you want a shorter analyst quick-start or a diagram-focused version, say the word and I will generate a condensed companion page.
