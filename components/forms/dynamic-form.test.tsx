// @vitest-environment jsdom

import * as React from "react"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DynamicForm } from "@/components/forms/dynamic-form"
import { formDefinitionSchema } from "@/lib/masjid-fikra/schemas"

const axiosMock = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock("axios", () => ({
  default: {
    post: axiosMock.post,
    isAxiosError: (error: unknown) =>
      Boolean(error && typeof error === "object" && "isAxiosError" in error),
  },
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

const formDefinition = formDefinitionSchema.parse({
  id: "11111111-1111-4111-8111-111111111111",
  kind: "test",
  name: "Test form",
  slug: "test-form",
  status: "published",
  submissionAuth: "anonymous",
  requiresPayment: false,
  stripeMode: "none",
  version: {
    id: "22222222-2222-4222-8222-222222222222",
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
              fields: [
                {
                  id: "name",
                  key: "name",
                  kind: "short_text",
                  label: "Name",
                  required: true,
                },
                {
                  id: "choice",
                  key: "choice",
                  kind: "single_select",
                  label: "Choice",
                  required: true,
                  options: [
                    { label: "Yes", value: "yes" },
                    { label: "No", value: "no" },
                  ],
                },
                {
                  id: "topics",
                  key: "topics",
                  kind: "multi_select",
                  label: "Topics",
                  options: [
                    { label: "Arabic", value: "arabic" },
                    { label: "Youth", value: "youth" },
                  ],
                },
                {
                  id: "consent",
                  key: "consent",
                  kind: "checkbox",
                  label: "Consent",
                  required: true,
                },
              ],
            },
          ],
        },
      ],
    },
  },
  createdAt: "2026-08-14T00:00:00.000Z",
  updatedAt: "2026-08-14T00:00:00.000Z",
})

const rateLimitFormDefinition = formDefinitionSchema.parse({
  ...formDefinition,
  version: {
    ...formDefinition.version,
    schema: {
      pages: [
        {
          id: "page",
          title: "Page",
          sections: [
            {
              id: "section",
              title: "Section",
              fields: [formDefinition.version.schema.pages[0].sections[0].fields[0]],
            },
          ],
        },
      ],
    },
  },
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  axiosMock.post.mockReset()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("DynamicForm effect stability", () => {
  it("mounts in Strict Mode without a maximum-depth render loop", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const storageRead = vi.spyOn(Storage.prototype, "getItem")

    render(
      <React.StrictMode>
        <DynamicForm formDefinition={formDefinition} />
      </React.StrictMode>
    )

    await waitFor(() => expect(screen.getByLabelText(/Name/)).toBeTruthy())

    expect(storageRead.mock.calls.length).toBeLessThanOrEqual(2)
    expect(
      consoleError.mock.calls.some((call) =>
        call.some((value) => String(value).includes("Maximum update depth exceeded"))
      )
    ).toBe(false)
  })

  it("stops the rate-limit interval when the cooldown expires", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-14T12:00:00.000Z"))
    axiosMock.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 429,
        data: {
          code: "RATE_LIMITED",
          message: "Wait before retrying.",
          retryAfter: 2,
        },
      },
    })

    render(<DynamicForm formDefinition={rateLimitFormDefinition} />)
    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: "Aisha" },
    })
    fireEvent.change(screen.getByLabelText(/Email address/), {
      target: { value: "aisha@example.com" },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Submit form" }))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(screen.getByRole("button", { name: /Retry in/ })).toBeTruthy()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500)
    })

    expect(screen.getByRole("button", { name: "Submit form" })).toBeTruthy()
    expect(vi.getTimerCount()).toBe(0)
  })
})
