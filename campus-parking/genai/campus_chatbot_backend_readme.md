# Campus Parking Chatbot Backend

This is the backend for the Campus Parking Chatbot. It uses **Google Gemini** to answer general questions about campus parking. No database is required for this version.

## Prerequisites

- Node.js (v18+ recommended)
- npm (comes with Node.js)
- Google Gemini API key

## Setup

1. **Clone the repository** (if not already done):

```bash
git clone <your-backend-repo-url>
cd backend
```

2. **Install dependencies**:

```bash
npm install
```

3. **Set up environment variables**:

Create a `.env` file in the `backend` folder:

```env
GEMINI_API_KEY=YOUR_GOOGLE_GEMINI_API_KEY
```

Replace `YOUR_GOOGLE_GEMINI_API_KEY` with your actual key.

4. **Start the server**:

```bash
npm start
```

The backend will run on **http://localhost:5000**.

## API Endpoints

### Chat

- **URL:** `/chat`  
- **Method:** `POST`  
- **Request Body:**

```json
{
  "message": "Your question here",
  "user_id": "optional for future use"
}
```

- **Response:**

```json
{
  "reply": "Answer from Gemini"
}
```

### Health Check

- **URL:** `/health`  
- **Method:** `GET`  
- **Response:**

```json
{
  "status": "ok"
}
```

## Notes

- This version only answers general campus parking questions.
- No database connection is required.
- Future updates may include user-specific answers via database integration.