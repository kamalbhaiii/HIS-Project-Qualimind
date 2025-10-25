# 🧠 QualiMind
### *Intelligent Preprocessing of Qualitative Data for Machine Learning*

---

## 📘 Overview

**QualiMind** is a full-stack web application designed to streamline the **preprocessing of qualitative data** — such as text interviews, survey responses, and open-ended feedback — to prepare it for **machine learning (ML)** workflows.

The system combines:
- A **modern web interface** for user interaction,
- A **Python-based backend** for data orchestration,
- An **R integration layer** for advanced qualitative data processing.

This project is part of the **High Integrity Systems (Winter Semester 2025/26)** course under  
**Prof. Dr. Christina Andersson, Frankfurt University of Applied Sciences.**

---

## 🎯 Project Goals

1. Build a **useful, usable system** for qualitative data preprocessing.
2. Apply complete **software engineering lifecycle** — from requirements to deployment.
3. Use **Agile SCRUM** methodology across 6 sprints (including Sprint 0).
4. Integrate **R** for real-world data preparation methods.
5. Deliver **both frontend and backend components** with multiple interactive UIs.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────┐
│            Frontend (React)        │
│   - Upload & Preview Interface     │
│   - Visualization Dashboard        │
│   - User Settings & Reports        │
└───────────────┬────────────────────┘
                │ REST API (JSON)
┌───────────────▼────────────────────┐
│          Backend (Python Flask)    │
│   - API Gateway                    │
│   - File Handling & Validation     │
│   - Communication with R Engine    │
│   - Database (PostgreSQL)          │
└───────────────┬────────────────────┘
                │
┌───────────────▼────────────────────┐
│              R Engine              │
│   - Text Cleaning / Encoding       │
│   - Tokenization / Stopword Filter │
│   - Feature Extraction             │
│   - Statistical Summary Outputs    │
└────────────────────────────────────┘
```

---

## 📂 Repository Structure

```
QualiMind/
├── frontend/                # React/Vue frontend (UI)
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/                 # Flask/Express backend (API)
│   ├── app/
│   ├── requirements.txt
│   └── main.py
│
├── r-engine/                # R scripts for preprocessing
│   ├── scripts/
│   └── requirements.R
│
├── docs/                    # Documentation & diagrams
│   ├── architecture/
│   ├── UML/
│   └── final_report/
│
├── tests/                   # Unit & integration tests
│
├── .github/                 # CI/CD workflows
│   └── workflows/
│
├── .gitignore
├── docker-compose.yml
├── README.md
└── LICENSE
```

---

## 🚀 Getting Started

### 1️⃣ Prerequisites
Make sure you have installed:
- **Python 3.10+**
- **Node.js 18+**
- **R 4.0+**
- **Docker (optional)** for local environment
- **Git** for version control

---

### 2️⃣ Clone the Repository

```bash
git clone https://github.com/<your-org-or-username>/qualimind.git
cd qualimind
```

---

### 3️⃣ Backend Setup (Flask)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # (Windows: venv\Scripts\activate)
pip install -r requirements.txt
flask run
```

The backend will start at **http://localhost:5000**

---

### 4️⃣ Frontend Setup (React)

```bash
cd frontend
npm install
npm start
```

The frontend will start at **http://localhost:3000**

---

### 5️⃣ R Integration

Make sure R is installed and accessible in your PATH.

To test the R processing script manually:
```bash
cd r-engine/scripts
Rscript preprocess.R sample_input.csv
```

---

### 6️⃣ Run the Full Stack (Optional via Docker)

```bash
docker-compose up --build
```

This will start all services: frontend, backend, and R.

---

## ⚙️ Key Features

✅ Upload qualitative text data (CSV, TXT, JSON)  
✅ Clean and preprocess using R (stopword removal, lemmatization, encoding)  
✅ View data transformations and logs in the UI  
✅ Visualize word frequencies and data summaries  
✅ Export processed data for ML training  
✅ Manage multiple datasets  
✅ Fully integrated Agile project structure

---

## 🧩 Development Methodology

The project follows **SCRUM methodology** with **6 sprints**:

| Sprint | Duration | Focus |
|---------|-----------|--------|
| 0 | Oct 24–26 | Team setup, role distribution, environment setup |
| 1 | Oct 27–Nov 7 | Personas, wireframes, architecture |
| 2 | Nov 10–21 | Core structure (backend, frontend, R bridge) |
| 3 | Nov 24–Dec 5 | Preprocessing features & upload module |
| 4 | Dec 8–19 | Visualization and export features |
| 5 | Jan 5–30 | Testing, documentation, and delivery |

All tasks are tracked on **Jira**, linked via Slack, and reviewed each sprint.

---

## 👥 Team & Roles

| Member | Primary Role | Secondary Role | Scrum Master | Product Owner |
|---------|--------------|----------------|---------------|----------------|
| Kamal | Backend Developer | CI/CD Engineer | Sprint 0 | Sprint 5 |
| Member 2 | Frontend Developer | UI/UX Support | Sprint 1 | Sprint 2 |
| Member 3 | UI/UX Designer | QA Support | Sprint 2 | Sprint 3 |
| Member 4 | QA & Testing Lead | Backend Support | Sprint 3 | Sprint 4 |
| Member 5 | R Integration Specialist | Documentation Lead | Sprint 4 | Sprint 1 |

---

## 🧪 Testing

Run unit tests:

```bash
pytest tests/
```

Run integration tests for backend:

```bash
python -m unittest discover backend/tests
```

Frontend tests (if applicable):

```bash
npm test
```

---

## 📘 Documentation

All documents (personas, UML diagrams, wireframes, architecture, and final report) are stored in:
```
/docs/
```

Artifacts are also linked to the **Jira board → “Artifacts” section.**

---

## 🔗 Integrations

| Tool | Purpose |
|------|----------|
| **Slack** | Team communication and daily SCRUM |
| **Jira** | Sprint and backlog management |
| **GitHub Actions** | CI/CD automation |
| **Figma / Miro** | Wireframes and mockups |
| **Google Drive** | Reports and presentations |

---

## 📅 Deliverables (End of Project)

- ✅ Functional full-stack application  
- ✅ 4+ interactive user interfaces  
- ✅ Integrated R-based preprocessing pipeline  
- ✅ UML diagrams and architecture documentation  
- ✅ Final project report  
- ✅ Presentation and demo  

---

## 🧾 License

This project is developed as part of an academic course and is released under the **MIT License** for educational purposes.

---

## 👩‍🏫 Supervisor

**Prof. Dr. Christina Andersson**  
Faculty 2: Computer Science and Engineering  
Frankfurt University of Applied Sciences  
📧 christina.andersson@fra-uas.de

---

## ⭐ Acknowledgments

Special thanks to the course instructors and fellow students for fostering an environment of collaboration and innovation.  
Inspired by the idea of transforming human qualitative insight into structured machine intelligence.

---

> “Data tells stories. QualiMind gives those stories structure.” 🧠
