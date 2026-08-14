import { describe, expect, it } from "vitest"

import {
  extractFieldErrors,
  MasjidFikraError,
  toPublicSubmissionError,
} from "@/lib/masjid-fikra/errors"

describe("backend error normalization", () => {
  it("extracts only known answer field errors", () => {
    const fields = extractFieldErrors(
      {
        "answers.email": { message: "Email is already used." },
        "submitter.email": { message: "Submitter email is invalid." },
        secret: "Must not be returned.",
        errors: [{ path: ["answers", "name"], message: "Name is required." }],
      },
      new Set(["email", "name"])
    )

    expect(fields).toEqual({
      email: "Email is already used.",
      name: "Name is required.",
      "submitter.email": "Submitter email is invalid.",
    })
  })

  it.each([
    [400, "INVALID_REQUEST", "rejected"],
    [404, "NOT_FOUND", "no longer available"],
    [422, "VALIDATION_ERROR", "rejected"],
    [500, "INTERNAL_ERROR", "temporarily unavailable"],
    [502, "INVALID_API_RESPONSE", "temporarily unavailable"],
  ] as const)("maps backend status %i to a safe public message", (status, code, message) => {
    const result = toPublicSubmissionError(
      new MasjidFikraError("raw internal backend detail", status, code),
      new Set()
    )

    expect(result.status).toBe(status)
    expect(result.body.message).toContain(message)
    expect(result.body.message).not.toContain("raw internal")
  })

  it("hides credential errors and preserves retry metadata", () => {
    const forbidden = toPublicSubmissionError(
      new MasjidFikraError("Missing write:forms", 403, "INSUFFICIENT_SCOPE"),
      new Set()
    )
    expect(forbidden.body.message).not.toContain("write:forms")

    const limited = toPublicSubmissionError(
      new MasjidFikraError("Rate limit", 429, "RATE_LIMITED", undefined, 7),
      new Set()
    )
    expect(limited).toMatchObject({
      status: 429,
      body: { code: "RATE_LIMITED", retryAfter: 7 },
    })
  })

  it("gives stale and timeout responses draft-safe messages", () => {
    const stale = toPublicSubmissionError(
      new MasjidFikraError("Old version", 409, "VERSION_STALE"),
      new Set()
    )
    const timeout = toPublicSubmissionError(
      new MasjidFikraError("Timed out", 504, "API_TIMEOUT"),
      new Set()
    )

    expect(stale.body.message).toContain("draft is safe")
    expect(timeout.body.message).toContain("draft is still saved")
  })
})
