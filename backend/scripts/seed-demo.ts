const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000"
const SEED_AUDIO_DIR = "seed-audio"

const FILES = [
  "german-tts.wav",
  "german-tts-2.wav",
  "german-tts-3.wav",
  "german-tts-4.wav",
  "german-tts-5.wav"
]

async function uploadAudio() {
  console.log(`Uploading ${FILES.length} sample audio files...`)

  const form = new FormData()

  for (const filename of FILES) {
    const filePath = `${SEED_AUDIO_DIR}/${filename}`
    const file = Bun.file(filePath)
    const exists = await file.exists()

    if (!exists) {
      console.error(`Missing file: ${filePath} — skipping`)
      continue
    }

    form.append("files", file, filename)
  }

  const response = await fetch(`${SERVER_URL}/api/audio/upload`, {
    method: "POST",
    body: form
  })

  const result = await response.json()
  console.log("Audio upload result:", JSON.stringify(result, null, 2))
}

async function uploadTranscripts() {
  console.log("Uploading sample transcripts...")

  const transcriptsFile = Bun.file(`${SEED_AUDIO_DIR}/transcripts.json`)
  const transcripts = await transcriptsFile.json()

  const response = await fetch(`${SERVER_URL}/api/transcripts/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcripts })
  })

  const result = await response.json()
  console.log("Transcript upload result:", JSON.stringify(result, null, 2))
}

async function main() {
  await uploadAudio()
  await uploadTranscripts()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
