import { readFile } from "node:fs/promises"

// Speech rate: tokens / duration, per minute.
export function calculateSpeechRate(text: string, durationSeconds: number): number {
  if (durationSeconds <= 0) return 0
  const tokenCount = text.trim().split(/\s+/).filter(Boolean).length
  return (tokenCount / durationSeconds) * 60
}

// Distance estimate: a rough proxy for mic distance based on signal RMS level.
// Only implemented for uncompressed WAV/PCM; returns null for other formats.
export async function estimateDistance(filePath: string): Promise<number | null> {
  if (!filePath.toLowerCase().endsWith(".wav")) {
    return null
  }

  try {
    const buffer = await readFile(filePath)

    let dataOffset = -1
    let dataSize = 0

    for (let i = 12; i < buffer.length - 8; i++) {
      const chunkId = buffer.toString("ascii", i, i + 4)
      if (chunkId === "data") {
        dataSize = buffer.readUInt32LE(i + 4)
        dataOffset = i + 8
        break
      }
    }

    if (dataOffset === -1) return null

    const sampleCount = Math.floor(dataSize / 2)
    let sumSquares = 0
    const step = 10
    let counted = 0

    for (let i = 0; i < sampleCount; i += step) {
      const byteOffset = dataOffset + i * 2
      if (byteOffset + 1 >= buffer.length) break
      const sample = buffer.readInt16LE(byteOffset)
      sumSquares += sample * sample
      counted++
    }

    if (counted === 0) return null

    const rms = Math.sqrt(sumSquares / counted)
    const normalizedLevel = rms / 32768
    const distanceScore = 1 - Math.min(normalizedLevel, 1)

    return Math.round(distanceScore * 100) / 100
  } catch {
    return null
  }
}
