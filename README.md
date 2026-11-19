# ThinkFlow AI 📚

### AI-Powered Personalized Study Planner

**Plan smarter. Study consistently. Improve continuously.**

ThinkFlow AI is an intelligent study planning platform designed to help students organize their academic preparation, manage their syllabus, prepare for examinations, and improve their learning consistency.

Unlike traditional study planners that only manage tasks and deadlines, ThinkFlow AI uses AI and Machine Learning to understand student progress, recommend study priorities, generate personalized schedules, and adapt future plans based on learning behavior.

The goal is simple: help students study the right topics at the right time without feeling overwhelmed.

---

## ✨ Core Philosophy

**INPUT GOALS → ANALYZE SYLLABUS → GENERATE PLAN → STUDY → TRACK PROGRESS → ADAPT PLAN**

ThinkFlow AI acts as a personal academic planning assistant that continuously improves a student's study routine.

---

## 🚀 Key Features

### 1. 🤖 AI-Powered Study Planning

- Generate personalized daily and weekly study schedules.
- Analyze subjects, chapters, and topics.
- Prioritize topics based on difficulty and examination deadlines.
- Allocate study sessions according to available time.
- Generate realistic and achievable study plans.
- Automatically suggest schedule adjustments.

### 2. 📖 Syllabus Management

- Add and manage multiple subjects.
- Organize subjects into chapters and topics.
- Upload syllabus documents in PDF format.
- Extract chapters and topics using AI.
- Track topic-wise completion.
- Set topic difficulty and estimated study duration.
- Monitor overall syllabus completion.

### 3. 🔄 Adaptive Scheduling

ThinkFlow AI adjusts study recommendations according to actual student progress.

Examples:

- Missed a study session? Get a rescheduling recommendation.
- Struggling with a subject? Allocate additional revision time.
- Examination approaching? Prioritize important incomplete topics.
- Completed topics early? Move forward with the next recommended topic.

Schedule changes should remain transparent and allow student approval.

### 4. 📅 Smart Calendar & Planner

- Daily study schedule.
- Weekly study overview.
- Calendar-based planning.
- Subject-wise scheduling.
- Task priorities.
- Upcoming examination deadlines.
- Incomplete task management.
- Study session rescheduling.

### 5. ⏱️ Study Session Tracker

- Start and complete study sessions.
- Focus timer.
- Pause and resume sessions.
- Record actual study duration.
- Add study notes.
- Track session completion.
- Record topic confidence and difficulty.

### 6. 🧠 Intelligent Revision Management

- Track previously studied topics.
- Recommend revision sessions.
- Apply spaced-repetition principles.
- Prioritize difficult topics.
- Track revision history.
- Monitor topic confidence.

### 7. 📊 Progress & Analytics

Understand your academic preparation through meaningful insights.

- Overall syllabus completion.
- Subject-wise progress.
- Planned versus completed study sessions.
- Daily and weekly study hours.
- Learning consistency.
- Missed study sessions.
- Topic confidence.
- Examination preparation status.

### 8. 💬 AI Study Assistant

An AI assistant designed specifically for academic planning.

Example queries:

- Create a study plan for tomorrow.
- I have three examinations next week. Organize my preparation.
- I missed two study sessions. Reschedule my plan.
- Which subject should I prioritize today?
- I have only two hours available. Optimize my schedule.
- Create a seven-day revision strategy.

The assistant uses student-specific academic context to provide relevant recommendations.

---

## 🧠 AI & Machine Learning Architecture

ThinkFlow AI combines Large Language Models with Machine Learning to deliver personalized academic recommendations.

### AI Integration

**Google Gemini API**

Used for:

- Syllabus analysis.
- Topic extraction.
- Personalized study plan generation.
- Study recommendations.
- Academic planning assistance.
- Schedule explanations.

### Machine Learning

**Python + Scikit-learn**

Planned ML capabilities:

| ML Module | Purpose |
|---|---|
| Topic Difficulty Estimation | Estimate the difficulty of individual topics |
| Weak Subject Detection | Identify subjects requiring additional attention |
| Study Duration Estimation | Estimate the time required for study sessions |
| Topic Mastery Estimation | Estimate student understanding based on recorded progress |
| Revision Recommendation | Recommend topics for revision |
| Performance Prediction | Estimate academic preparation progress |

**Important:** ML recommendations should begin with explainable rule-based logic when sufficient training data is unavailable. Trained models can be introduced as real student interaction data becomes available.

### Adaptive Learning Workflow

```text
Student Activity
       |
       v
Progress Tracking
       |
       v
Performance Analysis
       |
       v
Weak Topic Detection
       |
       v
Recommendation Engine
       |
       v
Adaptive Study Schedule
       |
       v
Updated Student Progress
```

---

## 🏗️ System Architecture

```text
                  STUDENT
                     |
                     v
              React + Vite
                     |
                     v
               API Client
                     |
                     v
             Node.js + Express
                     |
          -------------------------
          |           |           |
          v           v           v
       Planner     Progress     AI Service
       Service     Service      Integration
          |           |           |
          -------------------------
                     |
                     v
                PostgreSQL
                     |
                  Prisma
                     |
                     v
              Python FastAPI
                     |
                     v
              ML Recommendation
                  Engine
                     |
                     v
             Adaptive Scheduling
```

---

## 🛠️ Technology Stack

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Recharts
- Lucide React

### Backend

- Node.js
- Express.js
- REST APIs

### Database

- PostgreSQL
- Prisma ORM

### AI & Machine Learning

- Google Gemini API
- Python
- FastAPI
- Pandas
- NumPy
- Scikit-learn

### Additional Technologies

- JWT Authentication
- Google OAuth
- Zod Validation
- React Query

---

## 📂 Project Structure

A suggested modular project structure:

```text
ThinkFlow-AI/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── dashboard/
│   │   │   ├── planner/
│   │   │   ├── subjects/
│   │   │   ├── calendar/
│   │   │   ├── sessions/
│   │   │   ├── analytics/
│   │   │   └── assistant/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   └── App.tsx
│   │
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── validators/
│   │   └── server.js
│   │
│   ├── prisma/
│   │   └── schema.prisma
│   │
│   └── package.json
│
├── ml-service/
│   ├── app/
│   │   ├── routes/
│   │   ├── models/
│   │   ├── services/
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── README.md
│
├── .gitignore
└── README.md
```

*The structure represents the intended architecture. Actual directories may vary depending on implementation.*

---

## 🗄️ Database Models

The application is designed around the following relational entities:

| Model | Responsibility |
|---|---|
| User | Authentication and account information |
| StudentProfile | Academic profile and preferences |
| Subject | Student subjects |
| Chapter | Subject chapter organization |
| Topic | Individual learning topics |
| Examination | Examination schedules and deadlines |
| StudyPlan | Daily and weekly plans |
| StudySession | Scheduled study sessions |
| StudySessionLog | Actual study activity |
| TopicProgress | Topic completion and confidence |
| RevisionSchedule | Upcoming revision sessions |
| AIRecommendation | Personalized AI recommendations |
| UploadedSyllabus | Uploaded academic documents |

---

## ⚙️ Installation & Setup

### Prerequisites

Install the following:

- Node.js
- npm
- PostgreSQL
- Python 3.10+
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/ThinkFlow-AI.git

cd ThinkFlow-AI
```

### 2. Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

### 3. Backend Setup

```bash
cd backend

npm install
```

Create a `.env` file:

```env
PORT=5000

DATABASE_URL="postgresql://username:password@localhost:5432/thinkflow"

JWT_SECRET=your_secure_secret

GEMINI_API_KEY=your_gemini_api_key

CLIENT_URL=http://localhost:5173
```

Configure the database and Prisma:

```bash
npx prisma generate

npx prisma migrate dev
```

Start the backend:

```bash
npm run dev
```

### 4. ML Service Setup

```bash
cd ml-service

python -m venv venv
```

Activate the virtual environment.

Windows:

```bash
venv\Scripts\activate
```

Linux/macOS:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start FastAPI:

```bash
uvicorn app.main:app --reload --port 8000
```

API documentation:

```text
http://localhost:8000/docs
```

*These commands assume the corresponding scripts, files, and dependencies have been implemented.*

---

## 🔐 Environment Variables

Never commit API keys, passwords, or secrets to GitHub.

Required configuration:

| Variable | Description |
|---|---|
| PORT | Backend server port |
| DATABASE_URL | PostgreSQL connection string |
| JWT_SECRET | Authentication secret |
| GEMINI_API_KEY | Google Gemini API key |
| CLIENT_URL | Frontend application URL |

Use environment-specific configuration for development and production.

---

## 🎯 Development Roadmap

- [ ] Authentication and student onboarding
- [ ] Academic profile management
- [ ] Subject and syllabus management
- [ ] PDF syllabus extraction
- [ ] AI-powered study plan generation
- [ ] Daily and weekly planner
- [ ] Calendar integration
- [ ] Study session tracking
- [ ] Adaptive schedule recommendations
- [ ] Revision management
- [ ] Performance analytics
- [ ] Gemini AI assistant
- [ ] Python ML recommendation service
- [ ] Topic mastery estimation
- [ ] Production deployment

---

## 🔮 Future Enhancements

Potential future improvements:

- Google Calendar synchronization.
- Smart notifications and reminders.
- Voice-based study assistant.
- Advanced spaced-repetition algorithms.
- Personalized examination readiness prediction.
- Multi-device synchronization.
- Collaborative study planning.
- Advanced learning analytics.

---

## 🎯 Project Objective

The objective of ThinkFlow AI is to solve a common student problem: knowing what to study, when to study it, and how to manage preparation effectively.

Traditional planners require students to manually manage every task.

ThinkFlow AI aims to make academic planning intelligent, adaptive, and personalized.

**Not just another planner. A smarter way to manage learning.**

---

## 👨‍💻 Author

**Dheeraj Mishra**

B.Tech Computer Science & Engineering

Interested in Full Stack Development, Artificial Intelligence, Machine Learning, and Backend Engineering.

- Live Link: https://thinkflow-study-planner.vercel.app/
- GitHub: https://github.com/dheerajmishra75
- LinkedIn: https://www.linkedin.com/in/dheeraj-mishra-5513b0356

---

## 📄 License

This project is currently under development. Add an appropriate open-source license before distributing it publicly.
