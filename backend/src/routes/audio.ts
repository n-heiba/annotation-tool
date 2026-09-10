import { Router } from "express"
import multer from "multer"
import { parseFile } from "music-metadata"
import { randomUUID } from "node:crypto"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { prisma } from "../lib/prisma.js"
import { estimateDistance } from "../lib/recording-conditions.js"
import { routeByDuration } from "../lib/annotation-logic.js"

const router = Router()

const ALLOWED_MIME_TYPES = new Set(["audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp4", "audio/x-m4a", "application/octet-stream"])
const ALLOWED_EXTENSIONS = new Set([".wav", ".mp3", ".m4a"])
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "audio")

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
})

router.post("/upload", upload.array("files"), async (req, res) => {
  const files = req.files as Express.Multer.File[] | undefined

  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No files provided under field 'files'." });
  }

  await mkdir(UPLOAD_DIR, { recursive: true })

  const results = []

  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase()
    const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype)
    const extOk = ALLOWED_EXTENSIONS.has(ext)

    if (!mimeOk && !extOk) {
      results.push({
        filename: file.originalname,
        status: "rejected",
        reason: `Unsupported file type: ${file.mimetype} (${ext})`
      })
      continue
    }

    try {
      const storedFilename = `${randomUUID()}-${file.originalname}`
      const destPath = path.join(UPLOAD_DIR, storedFilename)

      const { writeFile } = await import("node:fs/promises")
      await writeFile(destPath, file.buffer)

      const metadata = await parseFile(destPath)
      const durationSeconds = metadata.format.duration ?? 0
      const sampleRate = metadata.format.sampleRate ?? 0
      const channels = metadata.format.numberOfChannels ?? 0
      const bitDepth = metadata.format.bitsPerSample ?? null

      const status = routeByDuration(durationSeconds)

      const audio = await prisma.audio.create({
        data: {
          filename: file.originalname,
          path: path.relative(process.cwd(), destPath),
          mimeType: file.mimetype,
          sizeBytes: file.size,
          status,
        },
      })

      const distanceEstimate = await estimateDistance(destPath)

      await prisma.recordingCondition.create({
        data: { audioId: audio.id, durationSeconds, sampleRate, channels, bitDepth, distanceEstimate }
      })

      results.push({ filename: file.originalname, status, audioId: audio.id, durationSeconds });
    } catch (err) {
      results.push({
        filename: file.originalname,
        status: "rejected",
        reason: `Failed to process file: ${(err as Error).message}`,
      })
    }
  }

  res.json({ results })
})

export default router
