import { z } from "zod"

import type { PortalFormValues } from "@/lib/masjid-fikra/form-validation"

export const FORM_DRAFT_TTL_MS = 24 * 60 * 60 * 1000
const DRAFT_KEY_PREFIX = "masjid-fikra:form-draft:v1"

export const formDraftSchema = z.object({
  formId: z.string().uuid(),
  versionId: z.string().uuid(),
  savedAt: z.number().int().nonnegative(),
  answers: z.record(z.string(), z.unknown()),
  submitter: z.object({
    email: z.string(),
    name: z.string().optional(),
    phone: z.string().optional(),
  }),
})

export type FormDraft = z.infer<typeof formDraftSchema>
export type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">
export type DraftParseResult =
  | { status: "restored"; draft: FormDraft }
  | { status: "invalid" | "expired" | "mismatch" }

export function getDraftKey(formId: string, versionId: string) {
  return `${DRAFT_KEY_PREFIX}:${formId}:${versionId}`
}

export function createDraft(
  formId: string,
  versionId: string,
  values: PortalFormValues,
  now = Date.now()
): FormDraft {
  return formDraftSchema.parse({
    formId,
    versionId,
    savedAt: now,
    answers: values.answers,
    submitter: {
      email: values.submitter.email ?? "",
      ...(values.submitter.name ? { name: values.submitter.name } : {}),
      ...(values.submitter.phone ? { phone: values.submitter.phone } : {}),
    },
  })
}

export function parseDraft(
  raw: string,
  expected: { formId: string; versionId: string },
  now = Date.now()
): DraftParseResult {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return { status: "invalid" }
  }

  const parsed = formDraftSchema.safeParse(json)
  if (!parsed.success) return { status: "invalid" }

  if (
    parsed.data.formId !== expected.formId ||
    parsed.data.versionId !== expected.versionId
  ) {
    return { status: "mismatch" }
  }

  if (now - parsed.data.savedAt > FORM_DRAFT_TTL_MS) {
    return { status: "expired" }
  }

  return { status: "restored", draft: parsed.data }
}

export function readDraft(
  storage: DraftStorage,
  formId: string,
  versionId: string,
  now = Date.now()
) {
  const key = getDraftKey(formId, versionId)
  const raw = storage.getItem(key)
  if (!raw) return null

  const parsed = parseDraft(raw, { formId, versionId }, now)
  if (parsed.status !== "restored") {
    storage.removeItem(key)
    return null
  }
  return parsed.draft
}

export function writeDraft(storage: DraftStorage, draft: FormDraft) {
  storage.setItem(getDraftKey(draft.formId, draft.versionId), JSON.stringify(draft))
}

export function removeDraft(
  storage: DraftStorage,
  formId: string,
  versionId: string
) {
  storage.removeItem(getDraftKey(formId, versionId))
}

export function clearDraftForSubmissionStatus(
  storage: DraftStorage,
  formId: string,
  versionId: string,
  status: number
) {
  if (status !== 201) return false

  removeDraft(storage, formId, versionId)
  return true
}
