# Hustloop

Welcome to the Hustloop repository.

## 🚀 Tech Stack

### Frontend

- **Framework:** Next.js 15
- **Core Library:** React 18
- **Styling:** Tailwind CSS, Styled Components
- **UI Components:** Radix UI Primitives, Lucide React Icons
- **Animations & 3D:** Framer Motion, GSAP, Three.js (React Three Fiber), Spline, LottieFiles
- **Forms & Validation:** React Hook Form, Zod
- **Rich Text Editing:** TipTap, Editor.js, UIW React MD Editor, Quill
- **Other Utilities:** Socket.io-client (Real-time)

### Backend

- **Framework:** Python / Flask 3.1
- **Database & ORM:** SQLAlchemy, Flask-SQLAlchemy, Flask-Migrate
- **Authentication & Security:** Flask-Bcrypt, PyJWT, itsdangerous, Flask-Limiter, Flask-CORS
- **Events & Real-time:** Flask-SocketIO, Eventlet
- **Task Scheduling:** APScheduler
- **Cloud & Third-Party Integrations:**
  - **AWS S3:** Boto3 (File Storage)
  - **Firebase:** Firebase Admin SDK
  - **Payments:** Razorpay API
  - **Email:** Zoho Mail (SMTP)
  - **Bot Protection:** Google reCAPTCHA v3

---

## 🛠️ Setup Instructions

### Prerequisites

- Node.js (v18+ recommended)
- Python (v3.10+ recommended)
- SQLite

### 1. Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Create and activate a virtual environment:

```bash
python -m venv .venv
# Windows:
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Set up your environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your API keys, database URLs, and other necessary credentials.

5. Run the server:

```bash
flask run
# OR run your script
python run.py
```

### 2. Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables for Next.js (e.g., `.env.local`).

4. Start the development server:

```bash
npm run dev
```
