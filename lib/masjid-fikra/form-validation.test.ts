import { describe, expect, it } from "vitest"

import {
  buildPortalFormSchema,
  getDefaultValues,
  getUnsupportedFields,
  normalizeAnswers,
} from "@/lib/masjid-fikra/form-validation"
import { formDefinitionSchema, type FormField } from "@/lib/masjid-fikra/schemas"

const formId = "11111111-1111-4111-8111-111111111111"
const versionId = "22222222-2222-4222-8222-222222222222"

function makeForm(fields: Array<Partial<FormField> & Pick<FormField, "key" | "kind" | "label">>) {
  return formDefinitionSchema.parse({
    id: formId,
    kind: "test",
    name: "Test form",
    slug: "test-form",
    status: "published",
    submissionAuth: "anonymous",
    requiresPayment: false,
    stripeMode: "none",
    version: {
      id: versionId,
      versionNumber: 1,
      schema: {
        pages: [
          {
            id: "page",
            title: "Page",
            sections: [
              {
                id: "section",
                title: "Section",
                fields: fields.map((field, index) => ({
                  id: `field-${index}`,
                  required: false,
                  options: [],
                  ...field,
                })),
              },
            ],
          },
        ],
      },
    },
    createdAt: "2026-08-14T00:00:00.000Z",
    updatedAt: "2026-08-14T00:00:00.000Z",
  })
}

describe("dynamic form validation", () => {
  it("validates required fields, option values, consent, and submitter email", () => {
    const form = makeForm([
      { key: "name", kind: "short_text", label: "Name", required: true },
      { key: "amount", kind: "currency", label: "Amount", required: true },
      {
        key: "choice",
        kind: "single_select",
        label: "Choice",
        required: true,
        options: [{ label: "Yes", value: "yes" }],
      },
      {
        key: "interests",
        kind: "multi_select",
        label: "Interests",
        required: true,
        options: [
          { label: "Arabic", value: "arabic" },
          { label: "Youth", value: "youth" },
        ],
      },
      { key: "consent", kind: "checkbox", label: "Consent", required: true },
    ])
    const schema = buildPortalFormSchema(form)

    expect(
      schema.safeParse({
        answers: {
          name: "",
          amount: "not-a-number",
          choice: "invalid",
          interests: [],
          consent: false,
        },
        submitter: { email: "bad" },
      }).success
    ).toBe(false)

    const valid = schema.safeParse({
      answers: {
        name: "Aisha",
        amount: "125.50",
        choice: "yes",
        interests: ["arabic"],
        consent: true,
      },
      submitter: { email: "aisha@example.com", name: "" },
    })

    expect(valid.success).toBe(true)
    if (valid.success) expect(valid.data.answers.amount).toBe(125.5)
  })

  it("creates stable defaults and reports unsupported fields", () => {
    const form = makeForm([
      { key: "message", kind: "long_text", label: "Message" },
      { key: "topics", kind: "multi_select", label: "Topics" },
      { key: "agree", kind: "checkbox", label: "Agree" },
      { key: "signature", kind: "signature", label: "Signature", required: true },
    ])

    expect(getDefaultValues(form)).toEqual({
      answers: { message: "", topics: [], agree: false, signature: "" },
      submitter: { email: "", name: undefined, phone: undefined },
    })
    expect(getUnsupportedFields(form).map((field) => field.key)).toEqual(["signature"])
  })

  it("removes blank optional answers and normalizes datetimes", () => {
    const form = makeForm([
      { key: "notes", kind: "long_text", label: "Notes" },
      { key: "start", kind: "datetime", label: "Start", required: true },
      { key: "count", kind: "number", label: "Count" },
    ])

    const normalized = normalizeAnswers(form, {
      notes: "   ",
      start: "2026-08-14T15:30",
      count: 4,
    })

    expect(normalized).not.toHaveProperty("notes")
    expect(normalized.count).toBe(4)
    expect(normalized.start).toMatch(/^2026-08-14T/)
  })
})
