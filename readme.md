# 🧠 QualiMind  
### *Intelligent Preprocessing of Qualitative Data for Machine Learning*  

---

## 📘 Overview  

**QualiMind** is a **full-stack intelligent web platform** that automates the **preprocessing of qualitative (text-based) data** — such as open-ended survey responses, interviews, and feedback — to make it ready for **machine learning (ML)** pipelines.  

The system offers:  
- A **modern React + MUI** frontend for seamless user interaction.  
- An **Express.js + TypeScript** backend for secure and scalable API orchestration.  
- An **R-based microservice** for text cleaning, tokenization, and qualitative analytics.  
- Full **CI/CD automation** with deployment to multi-stage environments.  

This project is developed as part of the  
**High Integrity Systems (Winter Semester 2025/26)** course under  
**Prof. Dr. Christina Andersson, Frankfurt University of Applied Sciences.**

---

## 🎯 Project Goals  

1. Develop a **useful, usable, and intelligent preprocessing platform** for qualitative data.  
2. Follow the **complete software engineering lifecycle** — from planning to delivery.  
3. Use **Agile SCRUM** methodology with rotating roles across 6 sprints.  
4. Integrate **R** for natural language preprocessing and analytics.  
5. Maintain **industry-grade CI/CD pipelines** and **four deployment environments**.  

---

## 🏗️ System Architecture  

```
┌──────────────────────────────────────────┐
│              Frontend (React + MUI)      │
│  - Upload & Preview Interface            │
│  - Preprocessing Config & Progress       │
│  - Visualization & Export Modules        │
└──────────────────┬───────────────────────┘
                   │  REST API (JSON)
┌──────────────────▼───────────────────────┐
│       Backend (Express.js + TypeScript)  │
│  - API Gateway & Validation (Zod)        │
│  - File Handling & Storage (S3/Postgres) │
│  - Job Queue (BullMQ + Redis)            │
│  - Swagger Auto Docs                     │
└──────────────────┬───────────────────────┘
                   │  HTTP Communication
┌──────────────────▼───────────────────────┐
│           R Preprocessing Service        │
│  - Text Cleaning & Encoding              │
│  - Tokenization & Lemmatization          │
│  - Stopword Filtering                    │
│  - Statistical & Summary Outputs         │
└──────────────────────────────────────────┘
```

---

## 📂 Repository Structure  

```
QualiMind/
├── apps/
│   ├── frontend/                # React + MUI + Vite
│   └── backend/                 # Express + TS + Swagger + Prisma
│
├── r-engine/                    # R plumber microservice
│   ├── scripts/
│   └── renv.lock
│
├── packages/
│   ├── shared-types/            # Shared TypeScript types
│   ├── api-contracts/           # Auto-generated OpenAPI client
│   └── ui-kit/                  # Shared UI components
│
├── infra/
│   ├── docker-compose.yml       # Local orchestration
│   ├── nginx/                   # Optional reverse proxy
│   └── deploy/                  # Deployment scripts
│
├── docs/                        # Documentation & UML
│   ├── architecture/
│   ├── sprint-reports/
│   └── final-report/
│
├── tests/                       # Unit & integration tests
├── .github/workflows/           # CI/CD pipelines
├── .env*                        # Environment configs
└── README.md
```

---

## 🚀 Getting Started  

### 1️⃣ Prerequisites  
Ensure the following are installed:  
- **Node.js 20+**  
- **pnpm 9+**  
- **R 4.4+** (with plumber, tidytext, quanteda)  
- **PostgreSQL 15+**  
- **Redis 7+**  
- **Docker & Docker Compose (optional)**  
- **Git**

---

### 2️⃣ Clone the Repository  

```bash
git clone https://github.com/kamalbhaiii/qualimind.git
cd qualimind
```

---

### 3️⃣ Install Dependencies  

```bash
pnpm install
```

---

### 4️⃣ Start Development Environment  

```bash
pnpm -r dev
```
Starts:
- Frontend → `http://localhost:5173`  
- Backend → `http://localhost:5000`  
- R Engine → `http://localhost:8000`

---

### 5️⃣ Build & Run via Docker  

```bash
docker-compose up --build
```

This will start **frontend**, **backend**, **R service**, **Postgres**, and **Redis** containers.

---

### 6️⃣ API Documentation  

After running the backend, visit:  
👉 **http://localhost:5000/docs** – Auto-generated Swagger docs.  

Frontend routes are listed under:  
👉 **http://localhost:5173/route-docs**

---

## ⚙️ Environments  

| Environment | Purpose | Deployment | Branch |  
|--------------|----------|-------------|----------|  
| **Development** | Local dev builds | Local Docker | `develop` |  
| **Testing** | Integration + QA | Local or CI | `release/*` |  
| **Pre-deployment** | Staging for PO/SM review | Render (Free Tier) | `predeploy` |  
| **Deployment** | Final production | AWS EC2 (Free Tier) | `main` |  

---

## 🔄 CI/CD Pipeline  

GitHub Actions automates:  
- ✅ Build & Test (all branches)  
- 🚀 Auto-deploy to **Render (predeploy)**  
- 🚀 Auto-deploy to **AWS EC2 (main)**  
- 🔍 Auto-generate Swagger & typed frontend clients  
- 🧪 Run lint, type check, and tests before merging  

---

## 🧩 Key Features  

✅ Upload and preview qualitative data (CSV, JSON, TXT)  
✅ Configure preprocessing (stopwords, casing, lemmatization)  
✅ Real-time progress tracking with background jobs  
✅ Visualize cleaned data and term frequencies  
✅ Export cleaned data in multiple formats (CSV, XLSX, JSON)  
✅ Auto-generated backend API and frontend route documentation  
✅ Secure multi-environment CI/CD deployment  

---

## 👥 Team & Roles  

| Member | Primary Role | Secondary Role |
|---------|---------------|----------------|
| **Kamal Sharma** | Backend Developer | CI/CD Engineer, Frontend Lead |
| **Varshitha Ramamurthy** | Documentation Lead | UI/UX Lead |
| **Kanan Nileshbhai Anadkat** | Frontend Support | UI/UX Support |
| **Ronishabahen Sureshbhai Desai** | QA Support | Frontend Support |
| **Deepak Kumar** | QA Testing Lead | R Integration Specialist |

---

## 🧪 Testing  

Run backend tests:  
```bash
pnpm --filter backend test:run
```

Run frontend tests:  
```bash
pnpm --filter frontend test:run
```

Run R tests (in `/r-engine`):  
```bash
Rscript tests/run_tests.R
```

---

## 📘 Documentation  

All documentation is located under `/docs`, including:  
- 📄 System architecture diagrams  
- 🧱 UML diagrams  
- 🎨 Penpot wireframes  
- 📑 Sprint reports  
- 📊 Final presentation and report  

Artifacts are also linked to the **Jira “Artifacts” section**.

---

## 🔗 Integrations  

| Tool | Purpose |
|------|----------|
| **Slack** | Team communication & daily SCRUM |
| **Jira** | Agile project management & backlog tracking |
| **GitHub Actions** | Automated CI/CD |
| **Penpot** | UI/UX wireframes |
| **Render & AWS** | Cloud environments (staging & production) |
| **Swagger UI** | Auto API documentation |

---

## 📅 Sprints  

| Sprint | Duration | Focus |
|---------|-----------|--------|
| 0 | Oct 24–26 | Team setup, environment configuration |
| 1 | Oct 27–Nov 7 | Personas, architecture, UI wireframes |
| 2 | Nov 10–21 | Core structure: backend, frontend, R link |
| 3 | Nov 24–Dec 5 | Preprocessing engine & data upload |
| 4 | Dec 8–19 | Visualization and export features |
| 5 | Jan 5–30 | Testing, documentation, and deployment |

---

## 🧾 License  

This project is developed for academic purposes under the  
**MIT License** – free to use, modify, and distribute with attribution.

---

## 👩‍🏫 Supervisor  

**Prof. Dr. Christina Andersson**  
Faculty 2: Computer Science and Engineering  
Frankfurt University of Applied Sciences  
📧 christina.andersson@fra-uas.de  

---

## ⭐ Acknowledgments  

Gratitude to **Prof. Andersson** and the **High Integrity Systems** team for guiding us through the process of building software that embodies both **technical precision** and **collaborative excellence**.  

> “Data tells stories. QualiMind gives those stories structure.” 🧠
