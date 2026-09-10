import { Router } from "express"
import { prisma } from "../lib/prisma.js"

const router = Router()

interface TranscriptInput {
  path: string
  label: string
}

router.post("/upload", async (req, res) => {
  const body = req.body

  if (!body || !Array.isArray(body.transcripts)) {
    return res.status(400).json({
      error: "Expected body shape: { transcripts: [{ path, label }, ...] }"
    })
  }

  const rawItems: unknown[] = body.transcripts

  const validItems: TranscriptInput[] = []
  const badItems: { item: unknown, reason: string }[] = []
  const seenPaths = new Set<string>()

  for (const item of rawItems) {
    if (typeof item !== "object" || item === null) {
      badItems.push({ item, reason: "Not an object" })
      continue
    }

    const obj = item as Record<string, unknown>

    if (typeof obj.path !== "string" || typeof obj.label !== "string") {
      badItems.push({ item, reason: "Missing or invalid 'path' or 'label' field" })
      continue
    }

    if (seenPaths.has(obj.path)) {
      badItems.push({ item, reason: `Duplicate path: ${obj.path}` })
      continue
    }

    seenPaths.add(obj.path)
    validItems.push({ path: obj.path, label: obj.label })
  }

  const matched: { path: string, audioId: string }[] = []
  const unmatchedTranscripts: string[] = []

  for (const item of validItems) {
    const filename = item.path.split("/").pop() ?? item.path

    const audio = await prisma.audio.findFirst({
      where: { filename },
      include: { transcript: true }
    })

    if (!audio) {
      unmatchedTranscripts.push(item.path)
      continue
    }

    if (audio.transcript) {
      badItems.push({ item, reason: `Audio '${filename}' already has a transcript` })
      continue
    }

    await prisma.transcript.create({
      data: {
        audioId: audio.id,
        originalText: item.label,
        correctedText: item.label
      }
    })

    matched.push({ path: item.path, audioId: audio.id })
  }

  const allAudio = await prisma.audio.findMany({ include: { transcript: true } })
  const unmatchedAudio = allAudio
    .filter((a) => !a.transcript && !matched.some((m) => m.audioId === a.id))
    .map((a) => a.filename)

  res.json({ matched, unmatchedTranscripts, unmatchedAudio, invalid: badItems })
})

export default router
