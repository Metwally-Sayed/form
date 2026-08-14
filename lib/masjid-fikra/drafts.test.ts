import { describe, expect, it } from "vitest"

import {
  clearDraftForSubmissionStatus,
  createDraft,
  FORM_DRAFT_TTL_MS,
  getDraftKey,
  parseDraft,
  readDraft,
  writeDraft,
  type DraftStorage,
} from "@/lib/masjid-fikra/drafts"

const formId = "11111111-1111-4111-8111-111111111111"
const versionId = "22222222-2222-4222-8222-222222222222"

function memoryStorage(): DraftStorage & { values: Map<string, string> } {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  }
}

describe("form drafts", () => {
  it("writes and restores a matching draft", () => {
    const storage = memoryStorage()
    const draft = createDraft(
      formId,
      versionId,
      {
        answers: { name: "Aisha", interests: ["arabic"] },
        submitter: { email: "aisha@example.com" },
      },
      1_000
    )

    writeDraft(storage, draft)

    expect(readDraft(storage, formId, versionId, 2_000)).toEqual(draft)
  })

  it("deletes expired and corrupted drafts", () => {
    const storage = memoryStorage()
    const draft = createDraft(
      formId,
      versionId,
      { answers: { name: "Aisha" }, submitter: { email: "aisha@example.com" } },
      1_000
    )
    writeDraft(storage, draft)

    expect(readDraft(storage, formId, versionId, 1_000 + FORM_DRAFT_TTL_MS + 1)).toBeNull()
    expect(storage.values.size).toBe(0)

    storage.setItem(getDraftKey(formId, versionId), "{not-json")
    expect(readDraft(storage, formId, versionId)).toBeNull()
    expect(storage.values.size).toBe(0)
  })

  it("rejects drafts belonging to another form or version", () => {
    const draft = createDraft(formId, versionId, {
      answers: { name: "Aisha" },
      submitter: { email: "aisha@example.com" },
    })
    const raw = JSON.stringify(draft)

    expect(
      parseDraft(raw, {
        formId: "33333333-3333-4333-8333-333333333333",
        versionId,
      }).status
    ).toBe("mismatch")
    expect(
      parseDraft(raw, {
        formId,
        versionId: "44444444-4444-4444-8444-444444444444",
      }).status
    ).toBe("mismatch")
  })

  it("removes every saved value only after a confirmed 201 submission", () => {
    const storage = memoryStorage()
    const sensitiveDraft = createDraft(formId, versionId, {
      answers: { monthlyIncome: 2000, address: "Private address" },
      submitter: { email: "private@example.com", phone: "5551234" },
    })
    writeDraft(storage, sensitiveDraft)

    expect(clearDraftForSubmissionStatus(storage, formId, versionId, 201)).toBe(true)

    expect(storage.getItem(getDraftKey(formId, versionId))).toBeNull()
    expect(storage.values.size).toBe(0)
  })

  it.each([400, 409, 422, 429, 500, 502, 504])(
    "retains the draft after a failed submission with status %i",
    (status) => {
      const storage = memoryStorage()
      const draft = createDraft(formId, versionId, {
        answers: { name: "Aisha" },
        submitter: { email: "aisha@example.com" },
      })
      writeDraft(storage, draft)

      expect(clearDraftForSubmissionStatus(storage, formId, versionId, status)).toBe(false)
      expect(readDraft(storage, formId, versionId)).toEqual(draft)
    }
  )
})
