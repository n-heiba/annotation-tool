# Design

## Data model

Four tables, chosen to mirror the workflow directly:

- **Audio** — one row per uploaded file. Stores a reference (`path`) and metadata (`mimeType`, `sizeBytes`, `status`), not the file bytes themselves, per the brief's requirement. `status` is a plain string (`pending` / `rejected` / `in_progress` / `done`) rather than a Postgres enum, to keep iteration fast during development; a stricter enum would be a reasonable follow-up.
- **Transcript** — one row per Audio, 1:1. Holds `originalText` (immutable, the AI's first-pass transcript) and `correctedText` (edited freely by the annotator) as two columns on the same row rather than two separate tables, since they represent two states of the same transcript rather than distinct entities.
- **AnnotationSpan** — one row per tagged span, linked to a Transcript. `type` is a string (one of the 6 categories), and `attributes` is a `Json` (JSONB) column holding whatever fields that type requires (see "Annotation attributes" below).
- **RecordingCondition** — one row per Audio, 1:1. Holds real header metadata (duration, sample rate, channels, bit depth) plus two derived, overridable estimates (`speechRateWpm`, `distanceEstimate`), each with a separate `*Override` column. Export uses the override when present, per the brief's requirement.

## Annotation attributes: JSONB over per-type columns

The 6 annotation types (NUMBER, FORMATTING_COMMAND, SPELLED_OUT, NAMED_ENTITY, MEDICAL_TERM, MEASUREMENT) each need different attribute shapes. Rather than a wide table with a nullable column per possible attribute across all types, `AnnotationSpan.attributes` is a single `Json` column, validated at the API layer (see `src/routes/spans.ts`) against a per-type schema before it's written.

**Tradeoff:** weaker database-level type safety (Postgres can't enforce that a MEASUREMENT span has a `unit` field) in exchange for a much simpler schema and no migration needed to add or adjust a type's fields. Validation lives entirely in application code.

## Annotation UI: two-phase edit-then-tag, not a live rich-text editor

The brief's annotation UI needs: select a range of text, tag it with a type, see it highlighted, and be able to keep editing the underlying transcript. The "correct" architecture for this (as used by tools like Label Studio or brat) is a rich-text editor (e.g. ProseMirror/TipTap) with custom marks whose positions survive live editing.

Given the time available, this project instead splits the workflow into two phases: the transcript is corrected freely in a plain textarea first, then — once saved — rendered as a sequence of clickable, non-editable word tokens for tagging. Span offsets are computed from this frozen text, so they never drift.

**Tradeoff:** an annotator cannot tag spans and edit prose in the same view; a correction made after spans exist would require re-tagging (span offsets are not automatically adjusted). This is a real limitation for iterative correction-then-annotation workflows, traded for implementation speed and correctness (no offset-drift bugs) within the time available.

## Distance estimate:

Per the brief's explicit allowance, `distanceEstimate` is documented as an estimate, not a measurement. It is computed by reading raw 16-bit PCM samples directly from the WAV file (manual header parsing, sampling every 10th sample for speed), computing RMS, and inverting the normalized level (`1 - rms/32768`) as a rough proxy: louder average signal is assumed to mean closer to the microphone.

**Known weakness:** this conflates recording volume with mic distance — a quiet speaker close to the mic and a loud speaker far away could produce the same score. It is also only implemented for uncompressed WAV; MP3/M4A files return `null` for this field, since decoding compressed audio for a rough heuristic wasn't judged worth the additional dependency and time.

## Speech rate: calculated at transcript-upload time, not at audio-upload time

`speechRateWpm` (tokens ÷ duration) requires both the transcript text and the audio's duration. Since these are uploaded in separate steps, the calculation happens in the transcript upload endpoint (`src/routes/transcripts.ts`), once a transcript is successfully matched to its Audio row, rather than at audio-upload time (when no transcript exists yet).

## Export: all items in one response, with an optional single-item filter

The brief specifies the JSONL schema per item but does not specify whether export should return one item or the full dataset. This implementation returns all items with a transcript in one JSONL response (`GET /api/export`), since the deliverable described is a training dataset — naturally a full collection rather than a per-item download. An optional `?audioId=` query parameter is also supported for exporting a single item, useful for spot-checking one annotation's export shape.

## Overlapping spans: not prevented, not specially handled

The brief allows deciding whether to support overlapping spans. This implementation does not explicitly prevent them (no uniqueness or non-overlap constraint at the database or API level) but also does not do anything special with them — the UI's word-click selection can create overlapping ranges, and both would simply appear in the export. Given the time available, building explicit overlap resolution or visualization was deprioritized in favor of covering all 6 annotation types.

## Word-level click-to-seek: not wired to real timestamps

The brief asks for clicking a word in the transcript to jump the audio player to that timestamp. This requires word-level timing data (forced alignment between audio and transcript), which nothing in this pipeline currently produces — the transcript is a plain string with no per-word timestamps. The audio player exposes a `jumpTo(seconds)` method that would support this, but it is not currently connected to anything, since there is no timestamp data to click on. Implementing real forced alignment was out of scope for the time available.

## What was cut

- **Word-level forced-alignment timestamps** (see above) — no click-to-seek on real timestamps.
- **Distance estimate limited to WAV** — no decoding for MP3/M4A.
- **No enum types in the schema** — `status` and `type` are plain strings, validated in application code rather than at the database level.
- **No overlap handling for annotation spans** beyond allowing them to coexist.
- **README has not been tested from a completely clean clone** — reconstructed from the actual setup steps taken during development, but not independently re-verified end to end.

## Stack notes

- **bun** is used as the package manager and script runner throughout (backend and frontend), rather than npm/yarn, and **bun:test** for the test suite, to avoid introducing a second toolchain solely for testing.
- **tsx** is used for the backend dev server (`tsx watch`) rather than `ts-node-dev`, since `ts-node-dev` is incompatible with TypeScript 7's internal API changes.
- **Prisma 7** requires an explicit driver adapter (`@prisma/adapter-pg`) and reads its datasource URL from `prisma.config.ts` (via Node's built-in `loadEnvFile()`, no `dotenv` dependency) rather than from `schema.prisma` directly, reflecting a Prisma 7 API change from earlier major versions.