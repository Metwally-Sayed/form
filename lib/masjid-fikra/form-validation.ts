import { z } from "zod"

import type { FormDefinition, FormField, Submitter } from "@/lib/masjid-fikra/schemas"
import { submitterSchema } from "@/lib/masjid-fikra/schemas"

export const SUPPORTED_FIELD_KINDS = [
  "short_text",
  "email",
  "phone",
  "date",
  "datetime",
  "number",
  "currency",
  "long_text",
  "address",
  "single_select",
  "multi_select",
  "checkbox",
] as const

const supportedKinds = new Set<string>(SUPPORTED_FIELD_KINDS)

export type PortalFormValues = {
  answers: Record<string, unknown>
  submitter: Submitter
}

export function flattenFields(form: FormDefinition): FormField[] {
  return form.version.schema.pages.flatMap((page) =>
    page.sections.flatMap((section) => section.fields)
  )
}

export function isSupportedField(field: FormField) {
  return supportedKinds.has(field.kind)
}

export function getUnsupportedFields(form: FormDefinition) {
  return flattenFields(form).filter((field) => !isSupportedField(field))
}

function requiredText(field: FormField) {
  const base = z.string()
  return field.required
    ? base.trim().min(1, `${field.label} is required.`)
    : base.optional()
}

function emailField(field: FormField) {
  const email = z.string().trim().email(`Enter a valid email for ${field.label}.`)
  return field.required
    ? email.min(1, `${field.label} is required.`)
    : z.union([z.literal(""), email]).optional()
}

function dateField(field: FormField) {
  const date = z.string().refine(
    (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`)),
    `Enter a valid date for ${field.label}.`
  )
  return field.required
    ? z.string().min(1, `${field.label} is required.`).pipe(date)
    : z.union([z.literal(""), date]).optional()
}

function dateTimeField(field: FormField) {
  const dateTime = z.string().refine(
    (value) => !Number.isNaN(Date.parse(value)),
    `Enter a valid date and time for ${field.label}.`
  )
  return field.required
    ? z.string().min(1, `${field.label} is required.`).pipe(dateTime)
    : z.union([z.literal(""), dateTime]).optional()
}

function numericField(field: FormField) {
  const number = z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) return undefined
      if (typeof value === "string") return Number(value)
      return value
    },
    field.required
      ? z.number({ message: `Enter a valid number for ${field.label}.` }).finite()
      : z.number({ message: `Enter a valid number for ${field.label}.` }).finite().optional()
  )
  return number
}

function singleSelectField(field: FormField) {
  const allowed = new Set(field.options.map((option) => option.value))
  const selection = z.string().refine(
    (value) => value === "" || allowed.has(value),
    `Choose a valid option for ${field.label}.`
  )
  return field.required
    ? selection.refine((value) => value !== "", `${field.label} is required.`)
    : selection.optional()
}

function multiSelectField(field: FormField) {
  const allowed = new Set(field.options.map((option) => option.value))
  const selection = z.array(z.string())
  const withRequired = field.required
    ? selection.min(1, `Select at least one option for ${field.label}.`)
    : selection
  return withRequired.refine(
    (values) => values.every((value) => allowed.has(value)),
    `Choose valid options for ${field.label}.`
  )
}

function checkboxField(field: FormField) {
  const checkbox = z.boolean()
  return field.required
    ? checkbox.refine((value) => value, `${field.label} must be accepted.`)
    : checkbox
}

export function buildFieldSchema(field: FormField): z.ZodType {
  switch (field.kind) {
    case "email":
      return emailField(field)
    case "date":
      return dateField(field)
    case "datetime":
      return dateTimeField(field)
    case "number":
    case "currency":
      return numericField(field)
    case "single_select":
      return singleSelectField(field)
    case "multi_select":
      return multiSelectField(field)
    case "checkbox":
      return checkboxField(field)
    case "short_text":
    case "phone":
    case "long_text":
    case "address":
      return requiredText(field)
    default:
      return z.unknown().optional()
  }
}

export function buildPortalFormSchema(form: FormDefinition) {
  const answerShape: Record<string, z.ZodType> = {}
  for (const field of flattenFields(form)) {
    answerShape[field.key] = buildFieldSchema(field)
  }

  return z.object({
    answers: z.object(answerShape),
    submitter: submitterSchema,
  })
}

export function getDefaultValues(form: FormDefinition): PortalFormValues {
  const answers: Record<string, unknown> = {}

  for (const field of flattenFields(form)) {
    if (field.kind === "multi_select") {
      answers[field.key] = []
    } else if (field.kind === "checkbox") {
      answers[field.key] = false
    } else {
      answers[field.key] = ""
    }
  }

  return {
    answers,
    submitter: {
      email: "",
      name: undefined,
      phone: undefined,
    },
  }
}

export function normalizeAnswers(
  form: FormDefinition,
  answers: Record<string, unknown>
) {
  const normalized: Record<string, unknown> = {}

  for (const field of flattenFields(form)) {
    const value = answers[field.key]

    if (typeof value === "string") {
      const trimmed = value.trim()
      if (!field.required && trimmed === "") continue
      normalized[field.key] = field.kind === "datetime" ? new Date(trimmed).toISOString() : trimmed
      continue
    }

    if (!field.required && Array.isArray(value) && value.length === 0) continue
    if (value !== undefined) normalized[field.key] = value
  }

  return normalized
}

export function normalizeSubmitter(submitter: Submitter): Submitter {
  return {
    email: submitter.email.trim(),
    ...(submitter.name?.trim() ? { name: submitter.name.trim() } : {}),
    ...(submitter.phone?.trim() ? { phone: submitter.phone.trim() } : {}),
  }
}
