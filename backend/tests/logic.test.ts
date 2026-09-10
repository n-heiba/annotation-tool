import { describe, test, expect } from "bun:test"
import { routeByDuration, normalizeMeasurement } from "../src/lib/annotation-logic.js"

describe("15-second routing rule", () => {
  test("rejects audio at exactly 15 seconds", () => {
    expect(routeByDuration(15)).toBe("rejected")
  })

  test("rejects audio under 15 seconds", () => {
    expect(routeByDuration(3.7)).toBe("rejected")
    expect(routeByDuration(0.5)).toBe("rejected")
  })

  test("accepts (pending) audio just over 15 seconds", () => {
    expect(routeByDuration(15.01)).toBe("pending")
  })

  test("accepts longer audio as pending", () => {
    expect(routeByDuration(18.3)).toBe("pending")
    expect(routeByDuration(60)).toBe("pending")
  })
})

describe("unit normalization", () => {
  test("normalizes the brief's own example: 1500 mg to 1.5 g", () => {
    expect(normalizeMeasurement(1500, "mg")).toBeCloseTo(1.5)
  })

  test("normalizes micrograms to grams", () => {
    expect(normalizeMeasurement(500000, "ug")).toBeCloseTo(0.5)
  })

  test("normalizes kilograms to grams", () => {
    expect(normalizeMeasurement(2, "kg")).toBeCloseTo(2000)
  })

  test("normalizes milliliters to liters", () => {
    expect(normalizeMeasurement(500, "ml")).toBeCloseTo(0.5)
  })

  test("normalizes millimeters to centimeters", () => {
    expect(normalizeMeasurement(60, "mm")).toBeCloseTo(6)
  })

  test("units with no smaller/larger pair pass through unchanged", () => {
    expect(normalizeMeasurement(120, "mmHg")).toBe(120)
    expect(normalizeMeasurement(500, "IE")).toBe(500)
  })
})
