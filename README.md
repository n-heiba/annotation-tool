# Clinical Transcript Annotation Tool

An annotation tool for correcting AI-generated clinical speech-to-text transcripts and tagging clinical entities within them, producing a gold-standard dataset for model evaluation and fine-tuning.

## Stack

- **Backend:** Node 22, TypeScript, Express, Prisma, PostgreSQL
- **Frontend:** Vue 3 (Composition API, `<script setup>`), Vuetify
- **Package manager:** bun
- **Database:** PostgreSQL via Docker Compose

## Prerequisites

- **Node.js 22** (or a compatible bun runtime — this project uses bun for install/run, not npm/yarn)
- **[bun](https://bun.sh)** — install with `curl -fsSL https://bun.sh/install | bash`
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** — required to run PostgreSQL locally

## Setup

### 1. Start the database

From the repository root:

```bash
docker compose up -d
```

This starts a PostgreSQL container on `localhost:5432` (user `postgres`, password `postgres`, database `annotation_tool`).

### 2. Configure the backend environment

Create a file at `backend/.env` with:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/annotation_tool"
```

This file is required and is not committed to the repository (see `.gitignore`).

### 3. Install and run the backend

```bash
cd backend
bun install
bunx prisma migrate dev
bun run dev
```

`prisma migrate dev` creates the database tables and generates the Prisma client. The server starts on `http://localhost:3000`.

If you see an error like `Module '@prisma/client' has no exported member PrismaClient`, run `bunx prisma generate` manually and retry.

### 4. Install and run the frontend

In a separate terminal:

```bash
cd frontend
bun install
bun run dev
```

The app opens at `http://localhost:5173`.

### 5. (Optional) Load demo data

With the backend running, from `backend/`:

```bash
bun scripts/seed-demo.ts
```

This uploads 5 sample German audio clips (generated via TTS) and their transcripts through the real API endpoints — not inserted directly into the database — so it exercises the actual ingest pipeline, including the 15-second auto-reject rule. Sample audio files live in `backend/seed-audio/`.

## Running tests

From `backend/`, with the database running:

```bash
bun test
```

Covers: the 15-second routing rule, unit normalization for MEASUREMENT spans, transcript/audio pairing by filename, and annotation span persistence (create, read, delete).

## Using the app

1. **Upload** — click "Upload" to add audio files (.wav/.mp3/.m4a) and their transcripts (a JSON file in the format below, or paste one transcript directly).
2. **Work Queue** — lists uploaded items with status and duration. Recordings ≤15 seconds are auto-rejected; longer ones are queued for annotation.
3. Select an item to **play the audio**, **correct the transcript** (the original AI transcript is preserved separately), and **tag spans** of text with clinical annotation types (medical term, measurement, number, formatting command, spelled-out word, named entity).
4. **Export All (JSONL)** — downloads the full annotated dataset, one JSON object per line.

### Transcript JSON format

```json
[
  { "path": "audio/880_NTX.wav", "label": "Kontrollierte Rueckenlagerung des Patienten..." },
  { "path": "audio/881_TUR.wav", "label": "Steriles Abwaschen und Abdecken des OP-Gebietes..." }
]
```

See `DESIGN.md` for data model details, scope decisions, and known limitations.