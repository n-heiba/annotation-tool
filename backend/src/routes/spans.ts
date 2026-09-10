import { Router } from "express"
import { prisma } from "../lib/prisma.js"

const router = Router()

const VALID_TYPES = [
  "NUMBER",
  "FORMATTING_COMMAND",
  "SPELLED_OUT",
  "NAMED_ENTITY",
  "MEDICAL_TERM",
  "MEASUREMENT"
] as const

const FORMATTING_COMMANDS = [
  "newline", "paragraph", "period", "comma", "colon", "dash", "bracket_open", "bracket_close"
]

const MEASUREMENT_UNITS = ["g", "mg", "ug", "kg", "ml", "l", "mmHg", "IE", "mm", "cm", "Ch"]

const MEDICAL_TERM_CATEGORIES = ["anatomy", "procedure", "diagnosis", "drug", "device"]

const NAMED_ENTITY_TYPES = ["person", "organisation", "place", "date"]

function validateAttributes(type: string, attributes: unknown): string | null {
  if (typeof attributes !== "object" || attributes === null) {
    return "attributes must be an object"
  }
  const attrs = attributes as Record<string, unknown>

  switch (type) {
    case "NUMBER":
      if (attrs.rendering !== "digits" && attrs.rendering !== "words") {
        return "NUMBER requires rendering: 'digits' or 'words'"
      }
      if (typeof attrs.normalized !== "number") {
        return "NUMBER requires normalized: number"
      }
      return null

    case "FORMATTING_COMMAND":
      if (!FORMATTING_COMMANDS.includes(attrs.command as string)) {
        return `FORMATTING_COMMAND requires command: one of ${FORMATTING_COMMANDS.join(", ")}`
      }
      if (typeof attrs.isCommand !== "boolean") {
        return "FORMATTING_COMMAND requires isCommand: boolean (instruction vs literal word)"
      }
      return null

    case "SPELLED_OUT":
      if (typeof attrs.resolvedWord !== "string") {
        return "SPELLED_OUT requires resolvedWord: string"
      }
      return null

    case "NAMED_ENTITY":
      if (!NAMED_ENTITY_TYPES.includes(attrs.entityType as string)) {
        return `NAMED_ENTITY requires entityType: one of ${NAMED_ENTITY_TYPES.join(", ")}`
      }
      return null

    case "MEDICAL_TERM":
      if (!MEDICAL_TERM_CATEGORIES.includes(attrs.category as string)) {
        return `MEDICAL_TERM requires category: one of ${MEDICAL_TERM_CATEGORIES.join(", ")}`
      }
      return null

    case "MEASUREMENT":
      if (typeof attrs.value !== "number") {
        return "MEASUREMENT requires value: number"
      }
      if (!MEASUREMENT_UNITS.includes(attrs.unit as string)) {
        return `MEASUREMENT requires unit: one of ${MEASUREMENT_UNITS.join(", ")}`
      }
      if (typeof attrs.normalizedValue !== "number") {
        return "MEASUREMENT requires normalizedValue: number"
      }
      return null

    default:
      return `Unknown type: ${type}`
  }
}

router.post("/", async (req, res) => {
  const { transcriptId, startOffset, endOffset, type, attributes } = req.body

  if (typeof transcriptId !== "string") {
    return res.status(400).json({ error: "transcriptId is required" })
  }
  if (typeof startOffset !== "number" || typeof endOffset !== "number" || startOffset >= endOffset) {
    return res.status(400).json({ error: "startOffset and endOffset must be numbers with startOffset < endOffset" })
  }
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of ${VALID_TYPES.join(", ")}` })
  }

  const attrError = validateAttributes(type, attributes)
  if (attrError) {
    return res.status(400).json({ error: attrError })
  }

  const transcript = await prisma.transcript.findUnique({ where: { id: transcriptId } })
  if (!transcript) {
    return res.status(404).json({ error: `No transcript found with id ${transcriptId}` })
  }

  const span = await prisma.annotationSpan.create({
    data: { transcriptId, startOffset, endOffset, type, attributes }
  })

  res.status(201).json(span)
})

router.get("/", async (req, res) => {
  const { transcriptId } = req.query

  if (typeof transcriptId !== "string") {
    return res.status(400).json({ error: "transcriptId query param is required" })
  }

  const spans = await prisma.annotationSpan.findMany({
    where: { transcriptId },
    orderBy: { startOffset: "asc" }
  })

  res.json({ spans })
})

router.patch("/:id", async (req, res) => {
  const { id } = req.params
  const { startOffset, endOffset, type, attributes } = req.body

  const existing = await prisma.annotationSpan.findUnique({ where: { id } })
  if (!existing) {
    return res.status(404).json({ error: `No span found with id ${id}` })
  }

  const finalType = type ?? existing.type
  const finalAttributes = attributes ?? existing.attributes

  if (attributes !== undefined) {
    const attrError = validateAttributes(finalType, finalAttributes)
    if (attrError) {
      return res.status(400).json({ error: attrError })
    }
  }

  const updated = await prisma.annotationSpan.update({
    where: { id },
    data: {
      startOffset: startOffset ?? existing.startOffset,
      endOffset: endOffset ?? existing.endOffset,
      type: finalType,
      attributes: finalAttributes
    }
  })

  res.json(updated)
})

router.delete("/:id", async (req, res) => {
  const { id } = req.params

  const existing = await prisma.annotationSpan.findUnique({ where: { id } })
  if (!existing) {
    return res.status(404).json({ error: `No span found with id ${id}` })
  }

  await prisma.annotationSpan.delete({ where: { id } })

  res.status(204).send()
})

export default router
