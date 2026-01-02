# Atticus Agentic Service

A standalone microservice for the Atticus Agentic Pipeline.

## Overview
This service provides an agentic pipeline for legal context analysis, PII scanning, and multi-model execution. It is designed to run as a standalone API or embedded service.

## Prerequisites
- Node.js 18+
- Docker (optional for containerized deployment)

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Build**
   ```bash
   npm run build
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Run Production Server**
   ```bash
   npm start
   ```

## API Usage

### POST /api/chat

**Request Body:**
```json
{
  "message": "I need help with a contract regarding IP rights.",
  "history": [],
  "models": [
    { "providerId": "openai", "modelId": "gpt-4" }
  ],
  "jurisdictions": ["CA"]
}
```

## Docker Deployment

To build and run the Docker container:

```bash
docker build -t atticus-agentic .
docker run -p 3000:3000 atticus-agentic
```

## Testing
Run the verification suite:
```bash
npm test
```
