# QualiMind

This document provides a detailed, scientific, and IT-centric documentation of the QualiMind system. It covers data analytics, software engineering, DevOps, and data-science perspectives with a strong emphasis on the R-Plumber preprocessing pipeline. It is intended to be a single source of truth for stakeholders who need deep technical and operational clarity.

---

## Abstract

QualiMind is an intelligent preprocessing platform for qualitative and mixed-type datasets. It combines a React-based frontend, an Express/TypeScript backend, and an R-Plumber preprocessing service to standardize data cleaning, encoding, and optional correlation analysis. The system emphasizes reproducibility, strict configuration, and traceable metadata to support downstream analytics and machine learning pipelines. Results are stored in Redis and PostgreSQL, enabling both real-time access and persistent summaries. A predeployment environment is hosted on AWS EC2, and a reverse proxy routes traffic to the public endpoint at `https://qualimind.kamalbhaiii.de` for external access.

---

## 1. Purpose and Scope

- Purpose: Provide complete, detailed documentation for QualiMind from data analyst, data science, software engineering, and DevOps viewpoints.
- Scope:
  - Data ingestion and preprocessing logic (primary focus on R-Plumber pipeline).
  - Backend orchestration and job management.
  - Frontend configuration and monitoring flows.
  - Storage layers (Redis, PostgreSQL, file output).
  - Environment configurations and deployment topology.
  - Operational guidelines, monitoring, testing, and risks.

---

## 2. System Overview (Data and Engineering Perspective)

QualiMind is a full-stack system that transforms qualitative or mixed-type datasets into ML-ready representations. It is composed of:

- Frontend (React): dataset upload, preprocessing configuration, and job monitoring UI.
- Backend (Express + TypeScript): API validation, queue orchestration, storage integration, and security.
- R Engine (Plumber): preprocessing and correlation analysis, metadata generation, and storage writes.
- Redis: short-term cache for processed results and metadata.
- PostgreSQL: persistent storage for dataset metadata and processing summaries.

Key goals:

- Strict, configurable preprocessing (no implicit defaults in tasks mode).
- Traceable preprocessing actions via metadata.
- Real-time job updates and reproducible outputs.

![System Architecture Overview](assets/System%20Architecture%20Overview.png)

---

## 3. Directory Guide (Exhaustive View)

| Directory | Contents | Primary Roles |
| --- | --- | --- |
| `r-engine/` | R-Plumber service, preprocessing, correlation logic | Data preprocessing core |
| `server/` | Backend API, jobs, queue, storage, schemas | Orchestration and control plane |
| `frontend/` | UI and preprocessing config builder | User-facing configuration |
| `datasets/` | Sample datasets | Testing inputs |
| `infra/` | Terraform and deployment files | Infrastructure provisioning |
| `docker-compose.*.yml` | Multi-environment orchestration | DevOps runtime |

---

## 4. Data Flow and Processing Lifecycle

### 4.1 High-level lifecycle

1. User uploads dataset and chooses preprocessing configuration.
2. Backend creates Dataset and ProcessingJob records.
3. Job is enqueued via BullMQ.
4. Worker reads dataset and calls R Engine `/clean`.
5. R Engine performs preprocessing and correlation analysis.
6. Results and metadata stored in Redis and PostgreSQL.
7. Backend exposes results via API and export endpoints.

### 4.2 Data flow (logical)

- Input file saved via multer to server disk.
- Worker reads file and parses to structured records.
- R Engine processes inline data or falls back to stored path.
- Cleaned data and metadata stored in Redis and Postgres.
- Results are also converted to CSV and saved locally when requested.

![Data Flow Diagram](assets/Data%20Flow%20Diagram.png)

---

## 5. Input Data Handling

### 5.1 Supported formats

- CSV
- JSON
- TXT
- XLS/XLSX (supported by MIME filter)

File size limit: 20MB.

### 5.2 Parsing strategy

- Server parses CSV into row records before calling R Engine.
- R Engine prefers inline data in request payload and falls back to file path if needed.

Implementation references:
- `server/src/loaders/multer.ts`
- `server/src/core/r-client.ts`
- `r-engine/R/routes.R`

### 5.3 Upload normalization to CSV

- Non-CSV uploads (JSON/XLS/XLSX) are converted server-side into a temporary CSV before preprocessing.
- Original MIME type and filename are preserved for metadata and auditability.
- Converted file replaces the upload path used by the worker.

Implementation reference:
- `server/src/middlewares/normalizeToCSV.ts`

---

## 6. Preprocessing Modes

### 6.1 Tasks mode (legacy)

- Input: `preprocessingTasks` array.
- Strict: only listed tasks execute. No defaults.

Available tasks:

| Task ID | Description |
| --- | --- |
| `duplicate_removal` | Drop duplicate rows |
| `missing_token_normalization` | Standardize tokens to NA |
| `numeric_type_inference` | Cast numeric-like strings |
| `handle_missing_categoricals` | Impute missing categoricals |
| `clean_category_labels` | Normalize categorical strings |
| `reduce_cardinality` | Replace rare categories |
| `feature_engineering` | Interaction frequency encoding |
| `encode_categoricals` | One-hot or label encoding |
| `numeric_imputation` | Median numeric imputation |
| `numeric_scaling` | Z-score scaling |

Implementation reference:
- `r-engine/R/preprocessing.R`

### 6.2 Config mode (recommended)

- Input: `preprocessingConfig` JSON.
- Strict steps: only specified steps execute.
- Preflight invariant: missing token normalization and numeric inference always run.

Core implementation:
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

## 7. Preprocessing Operations (Detailed)

![Data Preprocessing Pipeline](assets/Data%20Preprocessing%20Pipeline.png)

### 7.1 Preflight steps (config mode)

- Missing token normalization: trims strings and replaces tokens (`NULL`, `NA`, empty) with NA.
- Numeric type inference: converts numeric-like strings to numeric (threshold 0.9).

### 7.2 Missing values

| Method | Applies to | Behavior | Params |
| --- | --- | --- | --- |
| `numeric_median` | numeric | Median imputation | none |
| `numeric_mean` | numeric | Mean imputation | none |
| `numeric_constant` | numeric | Constant fill | `value` |
| `categorical_mode` | categorical | Mode imputation | none |
| `categorical_unknown` | categorical | Constant fill | `unknownLevel` |

### 7.3 Label cleaning

- Standardizes text by trimming, lowercasing, removing punctuation, and normalizing underscores.

### 7.4 Reduce cardinality

- Rare categories collapsed to `other` below `rare_prop_threshold`.
- Columns with > `high_cardinality_threshold` flagged.

### 7.5 Encoding

- Frequency encoding always added (`<col>_freq`).
- One-hot if levels <= `one_hot_max_levels`.
- Otherwise label encoding with mapping.
- Original categorical columns removed after encoding.

### 7.6 Scaling

- Z-score or min-max for numeric columns.
- `none` to leave raw values.

---

## 8. Correlation Analysis (Optional)

Config example:

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

Behavior:

- Constant or missing columns are excluded.
- Returns top pairs sorted by absolute correlation.

Implementation reference:
- `r-engine/R/correlation.R`

---

## 9. Metadata Output (Analyst Interpretation)

Key metadata fields:

- `preprocessing_mode`: `tasks` or `config`
- `original_rows`, `processed_rows`
- `original_columns`, `processed_columns`
- `categorical_columns`, `numeric_columns`, `numeric_columns_final`
- `encoded_columns`, `frequency_encoded_columns`
- `scaling_stats`, `encoding_stats`
- `rare_category_info`, `high_cardinality_columns`
- `column_actions` (config mode)
- `correlation` (if requested)

---

## 10. Backend Architecture (Software Engineering View)

### 10.1 API boundaries

- `/api/health`: service health check
- `/api/auth`: signup/login, Google OAuth, account management
- `/api/datasets`: upload, list, update, delete
- `/api/jobs`: status, result, export
- `/api/preprocessing/suggest`: LLM-based config suggestion
- `/api/insights`: LLM-based dataset insights

### 10.1.1 Auth API examples

Base URL: `http://localhost:5000/api`

Signup (local email/password):

```
curl -X POST http://localhost:5000/api/auth/signup ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Ada Lovelace\",\"email\":\"ada@example.com\",\"password\":\"MyStrongPass1\"}"
```

Response:

```
{
  "id": "ckv....",
  "email": "ada@example.com",
  "name": "Ada Lovelace",
  "verified": false
}
```

Login:

```
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"ada@example.com\",\"password\":\"MyStrongPass1\"}"
```

Response:

```
{
  "user": {
    "id": "ckv....",
    "email": "ada@example.com",
    "name": "Ada Lovelace",
    "verified": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Verify email (token comes from verification email):

```
GET http://localhost:5000/api/auth/verify-email?token=JWT_TOKEN
```

Password reset:

```
curl -X POST http://localhost:5000/api/auth/forget-password ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"ada@example.com\"}"

curl -X POST http://localhost:5000/api/auth/reset-password ^
  -H "Content-Type: application/json" ^
  -d "{\"token\":\"JWT_TOKEN\",\"newPassword\":\"MyNewStrongPass1\"}"
```

### 10.2 Job orchestration

- BullMQ queue: `preprocess`
- Worker: `server/src/workers/preprocess.worker.ts`
- Job status updates persisted and broadcast in real time.

![Job Lifecycle and State Machine](assets/Job%20Lifecycle%20and%20State%20Machine.png)

### 10.3 Result handling

- `result-store.ts` persists processed data to Redis and file system.
- Exports CSV/JSON/TXT for analysts.

### 10.4 Realtime job updates (Socket.IO + Redis)

- Worker publishes job lifecycle events to Redis channel `job:updates`.
- API server subscribes and relays `job:update` events to user and job rooms.
- Socket connections are JWT-authenticated (token in handshake auth or Authorization header).

Implementation references:
- `server/src/core/socket.ts`
- `server/src/core/realtime.events.ts`
- `server/src/workers/preprocess.worker.ts`
- `frontend/src/services/realtime/socket.ts`

### 10.5 API documentation (Swagger)

- OpenAPI docs served at `/docs`.
- Routes are assembled from `server/src/docs/*` specs.

Implementation references:
- `server/src/core/swagger.ts`
- `server/src/docs/`

---

## 11. Data Science and Analytics Considerations

- Strict preprocessing ensures reproducibility.
- Metadata documents transformations for auditing.
- Encoding and scaling affect interpretability; raw exports recommended for audit trails.
- Correlation analysis is post-preprocessing and numeric-only.
- Preflight conversion may affect mixed-type columns; check `column_actions`.

---

## 12. Database and Storage

### 12.1 Core tables

- `User` (email/password or Google ID, email verification state)
- `Dataset` (ownership and file metadata)
- `ProcessingJob` (preprocessingConfig, correlationConfig, status)
- `dataset_processing_summary` (created by R engine)

### 12.2 Storage tiers

- Redis: fast retrieval, 24h TTL for processed results.
- PostgreSQL: summary and metadata persistence.
- File system: CSV export caching.

Implementation references:
- `server/prisma/schema.prisma`
- `r-engine/R/storage.R`
- `server/src/core/result-store.ts`

![Database Schema (Core)](assets/Database%20Schema%20(Core).png)

---

## 13. Frontend Architecture

- Builds preprocessingConfig from explicit column overrides.
- Validates config before sending.
- Infers column types from sample rows.

Implementation references:
- `frontend/src/lib/buildPreprocessingConfig.js`
- `frontend/src/lib/preprocessingConfigValidation.js`
- `frontend/src/helpers/type_inference.helper.js`

---

## 14. Preprocessing Suggestion Service (LLM)

- Accepts dataset sample rows and column profiles.
- LLM generates a preprocessingConfig.
- Output validated with Zod schema and normalized into canonical params.

Implementation references:
- `server/src/modules/preprocessing-suggest/`

### 14.1 Insights Service (LLM)

- Endpoint: `POST /api/insights` (JWT required).
- Accepts dataset samples or processed CSV plus optional metadata (correlation, scaling stats, column actions).
- Returns a structured narrative: executive summary, findings, data quality observations, correlation insights, preprocessing notes, next steps, confidence, and warnings.
- Provider is selected via `openAI.llmProvider` (defaults to OpenAI).

Implementation references:
- `server/src/modules/insights/`
- `server/src/modules/insights/validation/insightsRequest.schema.ts`
- `server/src/modules/insights/validation/insightsResponse.schema.ts`
- `frontend/src/services/modules/insights.api.ts`

### 14.2 Insights API example

```
curl -X POST http://localhost:5000/api/insights ^
  -H "Authorization: Bearer YOUR_JWT" ^
  -H "Content-Type: application/json" ^
  -d "{\"filename\":\"survey.csv\",\"processedData\":\"age,score\\n29,4\\n31,5\\n\",\"metadata\":{\"correlation\":{\"enabled\":true,\"method\":\"pearson\",\"top_pairs\":[{\"r\":0.82,\"col1\":\"age\",\"col2\":\"score\"}]},\"column_actions\":{\"age\":[\"numeric_type_inference\"],\"score\":[\"scaling:zscore\"]}}}"
```

Response:

```
{
  "executiveSummary": "Short narrative overview...",
  "keyFindings": ["Finding 1", "Finding 2"],
  "dataQualityObservations": ["Observation 1"],
  "correlationInsights": ["age and score are strongly correlated (r=0.82)."],
  "preprocessingNotes": ["age inferred as numeric", "score z-score scaled"],
  "recommendedNextSteps": ["Validate outliers", "Review encoding choices"],
  "confidence": 0.72,
  "warnings": []
}
```

---

## 15. DevOps and Deployment

### 15.1 Docker Compose environments

- Development: `docker-compose.dev.yml`
- Testing: `docker-compose.testing.yml`
- Predeploy: `docker-compose.predeploy.yml`

Services:

- Postgres
- Redis
- Server (API)
- Worker
- Frontend
- R engine

### 15.2 Terraform (AWS)

- Provisions EC2 host, security groups, and key pairs.
- Writes `predeploy.json` for frontend API targeting.
- Predeployment is deployed on an AWS EC2 instance.
- Reverse proxy routes the public domain `https://qualimind.kamalbhaiii.de` to the running predeployment services.
- Nginx is used as the reverse proxy, with TLS certificates issued via Certbot.

Implementation references:
- `infra/main.tf`
- `infra/variables.tf`

![Deployment Topology](assets/Deployment%20Topology.png)

### 15.3 Local Docker setup (step-by-step)

1. Install prerequisites:
   - Git
   - Docker Desktop (ensure the Docker Engine is running)
2. Clone the repository:

```
git clone "https://github.com/Kamalbhaiii/HIS-Project-Qualimind"
cd "HIS-Project-Qualimind"
```

3. Update local development config to use Docker services:
   - `server/config/development.json`: add or override local database and redis URLs and your own API keys.
   - `frontend/src/config/development.json`: point `apiBaseUrl` and `serverUrl` to the backend port.

Example `server/config/development.json` additions:

```
{
  "database": {
    "url": "postgresql://postgres:postgres@postgres:5432/qualimind-development"
  },
  "redis": {
    "url": "redis://redis:6379"
  },
  "openAI": {
    "llmProvider": "openai",
    "apiKey": "YOUR_OPENAI_KEY",
    "model": "gpt-4.1-mini",
    "timeout": 60000,
    "maxTokens": 900
  }
}
```

Example `frontend/src/config/development.json`:

```
{
  "apiBaseUrl": "http://localhost:5000/api",
  "serverUrl": "http://localhost:5000/",
  "featureFlags": { "enableUpload": true },
  "serverTimeout": 100000
}
```

4. Start the full stack with Docker Compose (includes API, worker, frontend, R engine, Postgres, Redis):

```
docker compose -f docker-compose.dev.yml --profile backend --profile frontend --profile r --profile infra up --build
```

5. Wait for containers to initialize. The server runs migrations on first start (this resets the dev database).

6. Open the app:
   - Frontend: `http://localhost:5173`
   - API: `http://localhost:5000/api/health`
   - Swagger docs: `http://localhost:5000/docs`
   - R engine: `http://localhost:5001/health`
   - pgAdmin (optional): `http://localhost:5050`
   - Redis Commander (optional): `http://localhost:5051`

7. Stop the stack:

```
docker compose -f docker-compose.dev.yml down
```

---

## 16. Security and Compliance

- JWT-based authentication for API routes and Socket.IO.
- Email verification for password signups; Google OAuth is supported.
- Password reset links are delivered via email.
- File type and size validation.
- Data stored in Postgres and Redis with access controlled at service layer.
- No automatic PII redaction; analysts must ensure compliance.

---

## 17. Testing and Quality Assurance

- Backend tests in `server/tests`.
- R engine tests (if configured).
- Frontend tests via Vite tooling.

Suggested testing flows:

- Upload dataset with preprocessing config and verify metadata fields.
- Verify Redis and Postgres storage consistency.
- Validate export formats.

---

## 18. Observability and Monitoring

- Logging in backend and worker.
- Job status tracked in database.
- API health endpoint: `/api/health`.
- Health endpoint in R engine (`/health`).

Recommended additions:

- Centralized log aggregation.
- Metrics for job runtime and failure rates.

---

## 19. Operational Risks and Constraints

- Large datasets may exceed R memory constraints.
- Timeout for R engine requests is 5 minutes.
- Preflight type inference can change column semantics.
- Redis TTL can cause result loss if not persisted to Postgres.

---

## 20. Detailed Example (End-to-End)

1. Upload `survey.csv` with preprocessing config.
2. Job created and queued.
3. Worker sends inline data to R engine.
4. R engine runs preflight + steps, optional correlation.
5. Metadata returned and stored.
6. Analyst exports CSV and reviews `processing_summary`.

---

## 21. Preprocessing Config Cookbook (Practical Templates)

This section provides practical, reusable preprocessing configurations tailored to common dataset types. Each template is compatible with the R-engine `preprocessingConfig` schema.

### 21.1 Survey Feedback (Categorical + Numeric)

Use when you have survey metadata (categorical) and ratings (numeric).

```
{
  "version": "1.0",
  "steps": [
    {
      "task": "missing_values",
      "method": "categorical_unknown",
      "appliesTo": { "types": ["categorical"] },
      "params": { "unknownLevel": "unknown" }
    },
    {
      "task": "label_cleaning",
      "method": "standard",
      "appliesTo": { "types": ["categorical"] }
    },
    {
      "task": "reduce_cardinality",
      "method": "rare_to_other",
      "appliesTo": { "types": ["categorical"] },
      "params": { "rare_prop_threshold": 0.01, "high_cardinality_threshold": 50 }
    },
    {
      "task": "encoding",
      "method": "auto",
      "appliesTo": { "types": ["categorical"] },
      "params": { "one_hot_max_levels": 10 }
    },
    {
      "task": "missing_values",
      "method": "numeric_median",
      "appliesTo": { "types": ["numeric"] }
    },
    {
      "task": "scaling",
      "method": "zscore",
      "appliesTo": { "types": ["numeric"] }
    }
  ]
}
```

### 21.2 Customer Support Tickets (Mostly Text Labels + IDs)

Use when you need stable encoded features from categorical columns with many distinct values.

```
{
  "version": "1.0",
  "steps": [
    {
      "task": "missing_values",
      "method": "categorical_unknown",
      "appliesTo": { "types": ["categorical"] },
      "params": { "unknownLevel": "unknown" }
    },
    {
      "task": "label_cleaning",
      "method": "standard",
      "appliesTo": { "types": ["categorical"] }
    },
    {
      "task": "reduce_cardinality",
      "method": "rare_to_other",
      "appliesTo": { "types": ["categorical"] },
      "params": { "rare_prop_threshold": 0.005, "high_cardinality_threshold": 100 }
    },
    {
      "task": "encoding",
      "method": "auto",
      "appliesTo": { "types": ["categorical"] },
      "params": { "one_hot_max_levels": 6 }
    }
  ]
}
```

### 21.3 Product Feedback with Numeric KPIs

Use when numeric measures are primary and categorical columns are small.

```
{
  "version": "1.0",
  "steps": [
    {
      "task": "missing_values",
      "method": "numeric_mean",
      "appliesTo": { "types": ["numeric"] }
    },
    {
      "task": "scaling",
      "method": "minmax",
      "appliesTo": { "types": ["numeric"] }
    },
    {
      "task": "missing_values",
      "method": "categorical_mode",
      "appliesTo": { "types": ["categorical"] }
    },
    {
      "task": "encoding",
      "method": "auto",
      "appliesTo": { "types": ["categorical"] },
      "params": { "one_hot_max_levels": 12 }
    }
  ]
}
```

### 21.4 Minimal Safe Baseline (Conservative)

Use when you want only cleaning and no aggressive transformation.

```
{
  "version": "1.0",
  "steps": [
    {
      "task": "missing_values",
      "method": "categorical_unknown",
      "appliesTo": { "types": ["categorical"] },
      "params": { "unknownLevel": "unknown" }
    },
    {
      "task": "missing_values",
      "method": "numeric_median",
      "appliesTo": { "types": ["numeric"] }
    }
  ]
}
```

---

## 22. Performance Benchmarks and Scaling Guidance

This section provides practical performance constraints and scaling considerations for analysts and engineers.

### 22.1 Timeouts and limits

- R engine request timeout: 5 minutes (backend client timeout).
- File size limit: 20MB upload constraint.
- Redis TTL: 24 hours for processed results.

### 22.2 Computational hotspots

- High cardinality categorical encoding can create many columns.
- One-hot encoding increases memory usage quickly when category counts rise.
- Correlation analysis is O(n^2) over selected numeric columns.

### 22.3 Scaling recommendations

- For large datasets, reduce `one_hot_max_levels` and prefer label encoding.
- Use `reduce_cardinality` aggressively for high-cardinality columns.
- Limit correlation analysis to a curated subset of columns.
- Consider horizontal scaling of the R engine for parallel job processing.

### 22.4 Benchmarking checklist (for QA and DevOps)

- Measure job runtime by dataset size (rows, columns).
- Track memory usage and R engine response times.
- Validate storage latency to Redis and PostgreSQL.
- Track failure rates by preprocessing task combination.

---

## 23. Validation and QA (Test Cases and Expected Outcomes)

This section provides a structured QA checklist with concrete test cases and expected outputs.

### 23.1 Preprocessing config validation tests

- Invalid JSON for `preprocessingConfig` must return HTTP 400.
- Missing `steps` array must return validation error.
- Missing `task` or `method` in a step must fail validation.
- `appliesTo` must include `types` or `columns`.

### 23.2 Data quality and transformation tests

Test Case A: Missing categorical values\n
- Input: categorical column with NA and mode known.\n
- Config: `categorical_mode`.\n
- Expected: NA replaced by modal category.\n
- Metadata: `column_actions` includes `missing_values:categorical_mode`.\n

Test Case B: Numeric scaling\n
- Input: numeric column with known mean and SD.\n
- Config: `scaling:zscore`.\n
- Expected: transformed values with mean ~0, SD ~1.\n
- Metadata: `scaling_stats` populated for column.\n

Test Case C: Encoding with small cardinality\n
- Input: categorical column with <= 10 levels.\n
- Config: `encoding:auto` with `one_hot_max_levels=10`.\n
- Expected: one-hot columns added, original removed.\n
- Metadata: `encoding_stats.method=one_hot`.\n

Test Case D: Correlation analysis\n
- Input: at least two numeric columns.\n
- Config: correlation with `method=pearson`.\n
- Expected: `top_pairs` returned, optional matrix included.\n

### 23.3 Storage validation tests

- If Redis is unavailable, PostgreSQL storage should still persist summary.\n
- If PostgreSQL storage fails, Redis success should still mark job as cleaned with warning.\n
- Export endpoints must return CSV/JSON/TXT as expected.\n

---

## Team

- Kamal Sharma
- Varshitha Ramamurthy
- Kanan Nileshbhai Anadkat
- Ronishabahen Sureshbhai Desai
- Deepak Kumar

---

## Team Member Roles

- Kamal Sharma: Backend Developer; CI/CD Engineer; Frontend Lead, R Integration Lead
- Varshitha Ramamurthy: Documentation Lead; UI/UX Lead
- Kanan Nileshbhai Anadkat: Frontend Support; UI/UX Support
- Ronishabahen Sureshbhai Desai: QA Support; Frontend Support
- Deepak Kumar: QA Testing Lead; R Integration Support

---

## Future Scope

- Advanced NLP preprocessing modules (tokenization, lemmatization, language detection).
- Role-based access control and dataset-level governance policies.
- Automated data-quality scoring and anomaly detection.
- MLOps integration for model training pipelines and experiment tracking.
- Horizontal scaling of R engine with job prioritization and autoscaling.

---

## Acknowledgement

This project is developed for the High Integrity Systems course (Winter Semester 2025/26) at Frankfurt University of Applied Sciences. We thank Prof. Dr. Christina Andersson for academic guidance and support.

---

## 24. Key Source References

- R preprocessing logic: `r-engine/R/preprocessing.R`
- Config-based preprocessing: `r-engine/R/preprocessing_config.R`
- R routes and job logic: `r-engine/R/routes.R`, `r-engine/R/jobs.R`
- Storage logic: `r-engine/R/storage.R`
- Server R engine client: `server/src/core/r-client.ts`
- Dataset orchestration: `server/src/services/dataset.service.ts`
- Job API: `server/src/jobs/service.job.ts`
- Frontend config builder: `frontend/src/lib/buildPreprocessingConfig.js`

---

