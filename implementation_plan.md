# Implementation Plan

## Goal Description
We are building a Generative AI web application to convert input documents (contracts) into actionable insights using the Gemini API. The user expects to see extracted entities (like costs, duration, expiry) and step-by-step actionable procedures based on the document.

## Workplan

### 1. Python FastAPI Backend (`/backend`)
We will create a lightweight Python application using FastAPI.
- We will set up a virtual environment and install dependencies: `fastapi`, `uvicorn`, `google-generativeai`, `python-dotenv`.
- We will build the `/analyze` endpoint which takes text input.
- We will prompt the Gemini API using structured JSON output configurations to return a strictly formatted JSON array containing:
  - `Entities`: Details like Costs, Duration, Expiry, etc.
  - `Actionable Steps`: Recommended actions derived from the text (e.g., when to start negotiations).

#### Proposed Files
- `[NEW] backend/main.py`: The FastAPI application and the `/analyze` endpoint.
- `[NEW] backend/requirements.txt`: Python package dependencies.
- `[NEW] backend/.env`: Environment variables (API Key).

### 2. Next.js Frontend (`/frontend`)
We will initialize a new Next.js project to handle the display and user interactions.
- Per design rules, we'll implement a modern, high-quality dynamic aesthetic using vanilla CSS (no Tailwind).
- The user interface will feature an input area where users can submit their document text.
- The interface will then present an impressive visual breakdown of the "Entities" and a timeline / list layout for the "Actionable Steps".

#### Proposed Files
- `[NEW] frontend/...` (Next.js initialization boilerplate)
- `[NEW] frontend/src/app/page.js`: The main page for uploading/submitting text and viewing insights.
- `[NEW] frontend/src/app/globals.css`: Premium layout, color palettes, and glassmorphism / animations.

## User Review Required
> [!IMPORTANT]
> - [AGENTS.md](file:///f:/Events/Avishkar%20-%202026%20April/.agents/AGENTS.md) and [skills/insight-logic.md](file:///f:/Events/Avishkar%20-%202026%20April/.agents/skills/insight-logic.md) appeared blank in the project directory. I will establish the logic inside `main.py` directly using the specifications you provided unless you prefer I document the system prompts in [insight-logic.md](file:///f:/Events/Avishkar%20-%202026%20April/.agents/skills/insight-logic.md) first.
> - Please confirm you are OK with Next.js using Vanilla CSS (no Tailwind), as by default Next.js setups offer Tailwind, but I will strip it out per strict aesthetic instructions.
> - Do you already have a Gemini API key available to put into the environment variables once we begin execution?

## Verification Plan
1. Start the FastAPI server locally (`uvicorn main:app --reload`).
2. Start the Next.js dev server locally (`npm run dev`).
3. Send a test "dummy contract" text from the frontend and verify that the backend correctly extracts the entities and actionable steps into JSON and that the frontend renders it beautifully.
