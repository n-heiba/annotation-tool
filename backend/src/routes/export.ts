import { Router } from "express"
import { prisma } from "../lib/prisma.js"

const router = Router()

router.get("/", async (req, res) => {
  const { audioId } = req.query

  const where = typeof audioId === "string" ? { id: audioId } : {}

  const items = await prisma.audio.findMany({
    where,
    include: {
      transcript: { include: { spans: true } },
      recordingCondition: true
    }
  })

  const lines: string[] = []

  for (const item of items) {
    if (!item.transcript) continue

    const rc = item.recordingCondition

    const record = {
      audio: {
        filename: item.filename,
        path: item.path
      },
      originalText: item.transcript.originalText,
      correctedText: item.transcript.correctedText,
      spans: item.transcript.spans.map((span) => ({
        startOffset: span.startOffset,
        endOffset: span.endOffset,
        type: span.type,
        attributes: span.attributes
      })),
      recordingConditions: rc
        ? {
          durationSeconds: rc.durationSeconds,
          sampleRate: rc.sampleRate,
          channels: rc.channels,
          bitDepth: rc.bitDepth,
          speechRateWpm: rc.speechRateOverride ?? rc.speechRateWpm,
          distanceEstimate: rc.distanceOverride ?? rc.distanceEstimate
        }
        : null
    }

    lines.push(JSON.stringify(record))
  }

  res.setHeader("Content-Type", "application/jsonl")
  res.setHeader("Content-Disposition", "attachment; filename=export.jsonl")
  res.send(lines.join("\n"))
})

export default router
