export const REJECT_THRESHOLD_SECONDS = 15

export function routeByDuration(durationSeconds: number): "rejected" | "pending" {
  return durationSeconds <= REJECT_THRESHOLD_SECONDS ? "rejected" : "pending"
}

const MASS_TO_GRAMS: Record<string, number> = { ug: 0.000001, mg: 0.001, g: 1, kg: 1000 }
const VOLUME_TO_LITERS: Record<string, number> = { ml: 0.001, l: 1 }
const LENGTH_TO_CM: Record<string, number> = { mm: 0.1, cm: 1 }

export function normalizeMeasurement(value: number, unit: string): number {
  if (unit in MASS_TO_GRAMS) return value * (MASS_TO_GRAMS[unit] as number)
  if (unit in VOLUME_TO_LITERS) return value * (VOLUME_TO_LITERS[unit] as number)
  if (unit in LENGTH_TO_CM) return value * (LENGTH_TO_CM[unit] as number)
  return value
}

export function extractFilename(transcriptPath: string): string {
  return transcriptPath.split("/").pop() ?? transcriptPath
}
