# Field Technician Job-Ready Voice Coach

A voice-based AI coaching system that prepares blue-collar workers for job interviews through automated phone calls.

The system calls a candidate, conducts a short voice interview in their preferred language (Hindi or English), evaluates their responses, and produces a coaching report with strengths, weaknesses, and improvement tips.

The results are displayed in a web dashboard for employers, training organizations, or workforce platforms.

This project demonstrates how conversational AI can be used to solve real workforce readiness problems using Bolna's voice AI infrastructure.

---

# Why This Problem Matters

India has over **450 million blue-collar workers**, and a large portion of new gig workers come from **tier-2 and tier-3 cities**.

Many of these workers face two major barriers when trying to access jobs:

• Language barriers  
• Lack of interview preparation  

Most job preparation tools assume that workers are comfortable with written English, smartphones, and online forms.

In reality, many workers are far more comfortable interacting **through voice rather than text**.

Voice-based coaching removes these barriers.

Workers can receive preparation calls in their preferred language and get immediate feedback on their readiness for a job.

This project focuses on **field technician roles**, such as electricians and technicians, where structured interview preparation can significantly improve hiring outcomes.

---

# Inspiration

The concept is inspired by the success of **Vahan.ai**, which places over **40,000 gig workers per month** through voice-based AI assistants for companies like Swiggy, Zomato, Blinkit, and Zepto.

However, Vahan focuses on **recruitment**.

This project explores the **missing layer: interview coaching and preparation**.

Instead of only matching workers to jobs, the system helps them **become ready for the interview itself**.

---

# Why This Use Case Fits the Assignment

This use case highlights the most powerful capabilities of the Bolna platform.

The system demonstrates:

• multilingual voice interaction  
• automated outbound calling  
• structured data extraction  
• custom scoring logic through API functions  
• webhook integration with external systems  
• real-time result dashboards  

It also creates a complete end-to-end experience.

An employer defines a job role.

The system automatically calls candidates.

The AI agent conducts a structured interview.

Answers are evaluated.

Results are sent to a dashboard for review.

This makes it a strong demonstration of how voice AI can power real production workflows.

---

# Key Features

### Voice-First Interaction
Candidates interact entirely through a phone call.

No mobile app or typing is required.

### Multilingual Conversation
The agent can switch between Hindi and English depending on candidate preference.

### AI Interview Simulation
The agent asks role-specific questions to evaluate practical readiness.

### Automated Coaching Feedback
Candidates receive improvement tips immediately after the interview.

### Structured Result Dashboard
Interview results are stored and visualized through a web interface.

### End-to-End Automation
The entire process from call initiation to scoring is fully automated.

---

# System Architecture

```mermaid
flowchart LR

User[Employer or Recruiter] --> WebApp[Web Dashboard]

WebApp --> BackendAPI[Backend API Server]

BackendAPI --> BolnaAgent[Bolna Voice AI Agent]

BolnaAgent --> Candidate[Candidate Phone Call]

Candidate --> BolnaAgent

BolnaAgent --> Webhook[Webhook Event]

Webhook --> BackendAPI

BackendAPI --> ResultsDB[Stored Interview Results]

ResultsDB --> WebApp

# Employer Dashboard

image.png

Shows candidate pipeline and interview status.

### What it shows

• Total candidates
• Calls completed
• Calls in progress
• Average score
• Interview readiness status

Employers can monitor all candidates in one place.

# Add Candidate Page

image.png

Employers register candidates for voice coaching calls.

###What happens

• Employer enters candidate details
• Candidate is added to dashboard
• AI call can be triggered instantly
• The agent automatically detects the candidate’s preferred language.

# Interview Results

Detailed coaching report generated after the AI call.

### The system extracts structured insights:

• Candidate strengths
• Areas for improvement
• Coaching advice
• Language used
• Interview completion status

This helps employers quickly evaluate job readiness.
image.png

## Project structure

```
skillbridge/
├── bolna-config/
│   ├── system-prompt.txt              ← Paste into Bolna LLM Tab
│   ├── score-interview-function.json  ← Paste into Bolna Tools Tab
│   └── extraction-prompt.txt          ← Paste into Bolna Analytics Tab
│
├── backend/
│   ├── server.js       ← Pure Node.js, ZERO npm dependencies
│   ├── package.json
│   └── .env.example
│
└── web-app/
    ├── src/
    │   ├── App.jsx / App.css
    │   ├── index.css
    │   ├── lib/api.js
    │   └── pages/
    │       ├── Dashboard.jsx / .css
    │       ├── AddCandidate.jsx / .css
    │       └── Results.jsx / .css
    ├── index.html
    ├── vite.config.js   ← proxies /api/* to localhost:3001
    └── package.json
```

---

## Quick start (local dev)

### Terminal 1 — Backend (no npm install needed)
```bash
cd skillbridge/backend
cp .env.example .env
# Edit .env: add BOLNA_API_KEY and BOLNA_AGENT_ID
node server.js
```

You should see:
```
✅ SkillBridge backend running → http://localhost:3001
   POST /api/candidates      — add candidate
   GET  /api/candidates      — list candidates
   ...
```

### Terminal 2 — Frontend
```bash
cd skillbridge/web-app
npm install
npm run dev
# Opens at http://localhost:5173
```

The Vite dev server proxies all `/api/*` calls to `localhost:3001` automatically.
You do NOT need to set any environment variables for local development.

---



## Exposing your backend publicly (required for Bolna to call it)

Option A — ngrok (free, for demo):
```bash
# In a third terminal
npx ngrok http 3001
# Copy the https://xxx.ngrok-free.app URL
# Use it as YOUR_BACKEND_URL in the Bolna Tools Tab and webhook
```



---

## Scoring logic

The `score_interview` custom function is called by Bolna mid-call.

| Answer quality | Points |
|----------------|--------|
| excellent      | 25     |
| good           | 20     |
| average        | 12     |
| poor           | 5      |

Confidence bonus: high +10, medium +5, low +0. Max score: 100.

| Score  | Grade | Readiness            |
|--------|-------|----------------------|
| 80–100 | A     | Interview Ready      |
| 60–79  | B     | Almost Ready         |
| 40–59  | C     | Needs More Practice  |
| 0–39   | D     | More Prep Needed     |

---

## API reference

| Method | Endpoint               | Purpose                            |
|--------|------------------------|------------------------------------|
| GET    | /api/stats             | Dashboard summary numbers          |
| GET    | /api/candidates        | List all candidates                |
| POST   | /api/candidates        | Add a candidate                    |
| POST   | /api/trigger-call      | Fire outbound Bolna call           |
| POST   | /api/score-interview   | Called BY Bolna during call        |
| POST   | /api/webhook           | Bolna posts results here after call|
| GET    | /api/results           | All call results                   |
| GET    | /api/results/:call_sid | Single result                      |

---

## Bolna docs referenced

- Custom Functions: https://www.bolna.ai/docs/tool-calling/custom-function-calls
- Outbound Calls: https://www.bolna.ai/docs/making-outgoing-calls
- Webhooks: https://www.bolna.ai/docs/polling-call-status-webhooks
- Structured Data Extraction: https://www.bolna.ai/docs/call-details
- Context Variables: https://www.bolna.ai/docs/using-context
- Multilingual: https://www.bolna.ai/docs/customizations/multilingual-languages-support
