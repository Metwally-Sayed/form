import { AxiosError } from "axios"
import { ZodError } from "zod"

import { apiErrorSchema } from "@/lib/masjid-fikra/schemas"
import type { PublicSubmissionError } from "@/lib/masjid-fikra/schemas"

export class MasjidFikraError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: unknown,
    readonly retryAfter?: number
  ) {
    super(message)
    this.name = "MasjidFikraError"
  }
}

function parseRetryAfter(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(Math.ceil(seconds), 3_600)
  }

  if (typeof value === "string") {
    const retryAt = Date.parse(value)
    if (Number.isFinite(retryAt)) {
      const dateSeconds = Math.ceil((retryAt - Date.now()) / 1_000)
      return dateSeconds > 0 ? Math.min(dateSeconds, 3_600) : undefined
    }
  }

  return undefined
}

export function normalizeApiError(error: unknown): MasjidFikraError {
  if (error instanceof MasjidFikraError) return error

  if (error instanceof ZodError) {
    return new MasjidFikraError(
      "Masjid Fikra returned an unexpected response.",
      502,
      "INVALID_API_RESPONSE",
      error.issues
    )
  }

  if (error instanceof AxiosError) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return new MasjidFikraError(
        "The request timed out before a response was confirmed.",
        504,
        "API_TIMEOUT"
      )
    }

    if (!error.response) {
      return new MasjidFikraError(
        "The Masjid Fikra service could not be reached.",
        502,
        "API_UNAVAILABLE"
      )
    }

    const parsed = apiErrorSchema.safeParse(error.response.data)
    const retryAfter = parseRetryAfter(error.response.headers["retry-after"])
    return new MasjidFikraError(
      parsed.success ? parsed.data.message : "The Masjid Fikra request failed.",
      error.response.status,
      parsed.success ? parsed.data.error : "API_ERROR",
      parsed.success ? parsed.data.details : undefined,
      retryAfter
    )
  }

  return new MasjidFikraError(
    "An unexpected server error occurred.",
    500,
    "UNEXPECTED_ERROR"
  )
}

function readMessage(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value
  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: unknown }).message
    if (typeof message === "string" && message.trim()) return message
  }
  return undefined
}

export function extractFieldErrors(
  details: unknown,
  allowedKeys: ReadonlySet<string>
) {
  const fieldErrors: Record<string, string> = {}
  const allowedSubmitterKeys = new Set([
    "submitter.email",
    "submitter.name",
    "submitter.phone",
  ])

  function publicFieldKey(rawKey: string) {
    if (rawKey.startsWith("answers.")) {
      const answerKey = rawKey.slice("answers.".length)
      return allowedKeys.has(answerKey) ? answerKey : undefined
    }
    if (allowedSubmitterKeys.has(rawKey)) return rawKey
    return allowedKeys.has(rawKey) ? rawKey : undefined
  }

  if (details && typeof details === "object" && !Array.isArray(details)) {
    for (const [key, value] of Object.entries(details)) {
      const cleanKey = publicFieldKey(key)
      if (!cleanKey) continue
      const message = readMessage(value)
      if (message) fieldErrors[cleanKey] = message
    }

    const nestedErrors = (details as { errors?: unknown }).errors
    if (Array.isArray(nestedErrors)) {
      for (const issue of nestedErrors) {
        if (!issue || typeof issue !== "object") continue
        const path = (issue as { path?: unknown }).path
        const rawKey = Array.isArray(path)
          ? path.filter((part): part is string => typeof part === "string").join(".")
          : path
        const key = typeof rawKey === "string" ? publicFieldKey(rawKey) : undefined
        const message = readMessage(issue)
        if (key && message) fieldErrors[key] = message
      }
    }
  }

  return Object.keys(fieldErrors).length ? fieldErrors : undefined
}

export function toPublicSubmissionError(
  error: MasjidFikraError,
  allowedKeys: ReadonlySet<string>
): { status: number; body: PublicSubmissionError } {
  let message = error.message || "The submission was rejected. Review your answers and try again."
  const fieldErrors = extractFieldErrors(error.details, allowedKeys)

  if (error.status === 400 || error.status === 422) {
    message = fieldErrors
      ? "Review the highlighted fields and try again."
      : "The submission was rejected. Review your answers and try again."
  } else if (error.status === 401 || error.status === 403) {
    message = "This form is not configured for submissions right now. Please contact the masjid."
  } else if (error.status === 404) {
    message = "This form is no longer available. Reload the forms page to see the latest options."
  } else if (error.status === 409 || error.code === "VERSION_STALE") {
    message = "This form changed while you were completing it. Your draft is safe; reload the latest version before submitting."
  } else if (error.status === 429) {
    message = "Too many submissions were attempted. Your draft is safe; wait briefly before trying again."
  } else if (error.status >= 500) {
    message =
      error.code === "API_TIMEOUT"
        ? "The request timed out, so submission could not be confirmed. Your draft is still saved."
        : "The form service is temporarily unavailable. Your draft is still saved."
  }

  return {
    status: error.status >= 400 && error.status <= 599 ? error.status : 500,
    body: {
      code: error.code,
      message,
      ...(fieldErrors ? { fieldErrors } : {}),
      ...(error.retryAfter ? { retryAfter: error.retryAfter } : {}),
    },
  }
}
