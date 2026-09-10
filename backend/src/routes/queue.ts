import { Router } from "express"
import { prisma } from "../lib/prisma.js"

const router = Router()

// GET /api/queue?status=pending&sort=duration&order=desc
router.get("/", async (req, res) => {
  const { status, sort, order } = req.query

  const where = typeof status === "string" ? { status } : {}

  const orderBy =
    sort === "duration"
      ? { recordingCondition: { durationSeconds: order === "asc" ? "asc" as const : "desc" as const } }
      : { createdAt: order === "asc" ? "asc" as const : "desc" as const }

  const items = await prisma.audio.findMany({
    where,
    orderBy,
    include: { recordingCondition: true }
  })

  const results = items.map((item) => ({
    id: item.id,
    filename: item.filename,
    path: item.path,
    status: item.status,
    durationSeconds: item.recordingCondition?.durationSeconds ?? null,
    annotator: null
  }))

  res.json({ items: results })
})

export default router
