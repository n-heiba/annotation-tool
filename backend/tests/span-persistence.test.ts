import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

let testAudioId: string
let testTranscriptId: string

beforeAll(async () => {
  const audio = await prisma.audio.create({
    data: {
      filename: "test-span-persistence.wav",
      path: "test/test-span-persistence.wav",
      mimeType: "audio/wav",
      sizeBytes: 1000,
      status: "pending"
    }
  })
  testAudioId = audio.id

  const transcript = await prisma.transcript.create({
    data: {
      audioId: audio.id,
      originalText: "Patient erhielt sechshundert Milligramm Ibuprofen.",
      correctedText: "Patient erhielt sechshundert Milligramm Ibuprofen."
    }
  })
  testTranscriptId = transcript.id
})

afterAll(async () => {
  await prisma.annotationSpan.deleteMany({ where: { transcriptId: testTranscriptId } })
  await prisma.transcript.delete({ where: { id: testTranscriptId } })
  await prisma.audio.delete({ where: { id: testAudioId } })
  await prisma.$disconnect()
})

describe("span persistence", () => {
  test("a created span can be read back with the same attributes", async () => {
    const created = await prisma.annotationSpan.create({
      data: {
        transcriptId: testTranscriptId,
        startOffset: 18,
        endOffset: 45,
        type: "MEASUREMENT",
        attributes: { value: 600, unit: "mg", normalizedValue: 0.6 }
      }
    })

    const fetched = await prisma.annotationSpan.findUnique({ where: { id: created.id } })

    expect(fetched).not.toBeNull()
    expect(fetched?.type).toBe("MEASUREMENT")
    expect(fetched?.startOffset).toBe(18)
    expect(fetched?.endOffset).toBe(45)
    expect(fetched?.attributes).toEqual({ value: 600, unit: "mg", normalizedValue: 0.6 })
  })

  test("deleting a span removes it from the database", async () => {
    const span = await prisma.annotationSpan.create({
      data: {
        transcriptId: testTranscriptId,
        startOffset: 0,
        endOffset: 7,
        type: "MEDICAL_TERM",
        attributes: { category: "drug" }
      }
    })

    await prisma.annotationSpan.delete({ where: { id: span.id } })

    const fetched = await prisma.annotationSpan.findUnique({ where: { id: span.id } })
    expect(fetched).toBeNull()
  })

  test("multiple spans on the same transcript are all persisted independently", async () => {
    await prisma.annotationSpan.create({
      data: { transcriptId: testTranscriptId, startOffset: 0, endOffset: 7, type: "NAMED_ENTITY", attributes: { entityType: "person" } }
    })
    await prisma.annotationSpan.create({
      data: { transcriptId: testTranscriptId, startOffset: 8, endOffset: 15, type: "NUMBER", attributes: { rendering: "words", normalized: 600 } }
    })

    const allSpans = await prisma.annotationSpan.findMany({ where: { transcriptId: testTranscriptId } })
    expect(allSpans.length).toBeGreaterThanOrEqual(2)
  })
})
