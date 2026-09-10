const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000"
const SEED_AUDIO_DIR = "seed-audio"

const FILES = [
  "german-tts.wav",
  "german-tts-2.wav",
  "german-tts-3.wav",
  "german-tts-4.wav",
  "german-tts-5.wav"
]

async function main() {
  console.log(`Uploading ${FILES.length} sample files to ${SERVER_URL}...`)

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
  console.log(JSON.stringify(result, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
