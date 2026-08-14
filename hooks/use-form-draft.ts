"use client"

import * as React from "react"
import type { UseFormReturn } from "react-hook-form"

import {
  clearDraftForSubmissionStatus,
  createDraft,
  getDraftKey,
  readDraft,
  removeDraft,
  writeDraft,
} from "@/lib/masjid-fikra/drafts"
import type { PortalFormValues } from "@/lib/masjid-fikra/form-validation"

type DraftNotice = "restored" | "saved" | "external-update" | null

type UseFormDraftOptions = {
  form: UseFormReturn<PortalFormValues>
  formId: string
  versionId: string
  defaultValues: PortalFormValues
}

export function useFormDraft({
  form,
  formId,
  versionId,
  defaultValues,
}: UseFormDraftOptions) {
  const storageKey = React.useMemo(
    () => getDraftKey(formId, versionId),
    [formId, versionId]
  )
  const initializedRef = React.useRef(false)
  const savingPausedRef = React.useRef(false)
  const skipNextSaveRef = React.useRef(false)
  const timerRef = React.useRef<number | undefined>(undefined)
  const [notice, setNotice] = React.useState<DraftNotice>(null)
  const [storageWarning, setStorageWarning] = React.useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = React.useState<number | null>(null)

  const removeStoredDraft = React.useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    try {
      removeDraft(window.localStorage, formId, versionId)
    } catch {
      setStorageWarning("Draft storage is unavailable in this browser.")
    }
    setLastSavedAt(null)
  }, [formId, versionId])

  React.useEffect(() => {
    try {
      const savedDraft = readDraft(window.localStorage, formId, versionId)
      if (savedDraft) {
        form.reset({
          answers: savedDraft.answers,
          submitter: savedDraft.submitter,
        })
        window.queueMicrotask(() => {
          setNotice("restored")
          setLastSavedAt(savedDraft.savedAt)
        })
      }
    } catch {
      window.queueMicrotask(() => {
        setStorageWarning(
          "Drafts cannot be saved in this browser. You can still submit the form."
        )
      })
    } finally {
      initializedRef.current = true
    }
  }, [form, formId, storageKey, versionId])

  React.useEffect(() => {
    const subscription = form.watch(() => {
      if (!initializedRef.current || savingPausedRef.current) return
      if (skipNextSaveRef.current) {
        skipNextSaveRef.current = false
        return
      }

      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        try {
          const draft = createDraft(formId, versionId, form.getValues())
          writeDraft(window.localStorage, draft)
          setLastSavedAt(draft.savedAt)
          setNotice("saved")
          setStorageWarning(null)
        } catch {
          setStorageWarning(
            "Your latest changes could not be saved locally. The form will still work."
          )
        }
      }, 450)
    })

    return () => {
      subscription.unsubscribe()
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [form, formId, storageKey, versionId])

  React.useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === storageKey && event.newValue) {
        setNotice("external-update")
      }
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [storageKey])

  const discardDraft = React.useCallback(() => {
    skipNextSaveRef.current = true
    removeStoredDraft()
    form.reset(defaultValues)
    setNotice(null)
    setStorageWarning(null)
  }, [defaultValues, form, removeStoredDraft])

  const clearAfterSubmit = React.useCallback((status: number) => {
    if (timerRef.current) window.clearTimeout(timerRef.current)

    if (status !== 201) return null

    savingPausedRef.current = true
    let cleared = false

    try {
      cleared = clearDraftForSubmissionStatus(
        window.localStorage,
        formId,
        versionId,
        status
      )
    } catch {
      setStorageWarning("Draft storage is unavailable in this browser.")
    }

    setLastSavedAt(null)
    setNotice(null)
    if (cleared) setStorageWarning(null)
    return cleared
  }, [formId, versionId])

  return {
    notice,
    storageWarning,
    lastSavedAt,
    discardDraft,
    clearAfterSubmit,
  }
}
