// @vitest-environment jsdom

import * as React from "react"
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useForm, type UseFormReturn } from "react-hook-form"

import { useFormDraft } from "@/hooks/use-form-draft"
import { createDraft, getDraftKey } from "@/lib/masjid-fikra/drafts"
import type { PortalFormValues } from "@/lib/masjid-fikra/form-validation"

const formId = "11111111-1111-4111-8111-111111111111"
const versionId = "22222222-2222-4222-8222-222222222222"
const defaultValues: PortalFormValues = {
  answers: { name: "" },
  submitter: { email: "", name: undefined, phone: undefined },
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("useFormDraft effect stability", () => {
  it("restores once without re-running its hydration effect", async () => {
    const draft = createDraft(formId, versionId, {
      answers: { name: "Aisha" },
      submitter: { email: "aisha@example.com" },
    })
    window.localStorage.setItem(getDraftKey(formId, versionId), JSON.stringify(draft))
    const storageRead = vi.spyOn(Storage.prototype, "getItem")

    let renders = 0
    function Harness() {
      renders += 1
      if (renders > 20) throw new Error("Draft hook entered a render loop")

      const form = useForm<PortalFormValues>({ defaultValues })
      const draftState = useFormDraft({
        form,
        formId,
        versionId,
        defaultValues,
      })

      return <span>{`${draftState.notice}:${form.getValues("answers.name")}`}</span>
    }

    render(<Harness />)

    expect(await screen.findByText("restored:Aisha")).toBeTruthy()
    expect(storageRead).toHaveBeenCalledTimes(1)
    expect(renders).toBeLessThan(10)
  })

  it("writes one debounced draft for one form value change", async () => {
    vi.useFakeTimers()
    const storageWrite = vi.spyOn(Storage.prototype, "setItem")
    let renders = 0
    let formApi: UseFormReturn<PortalFormValues> | undefined

    function Harness() {
      renders += 1
      if (renders > 20) throw new Error("Draft hook entered a render loop")

      const form = useForm<PortalFormValues>({ defaultValues })
      formApi = form
      const draftState = useFormDraft({
        form,
        formId,
        versionId,
        defaultValues,
      })

      return <span>{draftState.lastSavedAt ?? "not-saved"}</span>
    }

    render(<Harness />)
    await act(async () => {
      formApi!.setValue("answers.name", "Aisha")
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(storageWrite).toHaveBeenCalledTimes(1)
    expect(renders).toBeLessThan(10)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
    })
    expect(storageWrite).toHaveBeenCalledTimes(1)
  })
})
