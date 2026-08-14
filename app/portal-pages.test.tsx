// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import HomePage from "@/app/page"
import FormPage from "@/app/forms/[id]/page"

const clientMocks = vi.hoisted(() => ({
  getForm: vi.fn(),
  getForms: vi.fn(),
  getPortalBrandData: vi.fn(),
}))

vi.mock("next/server", () => ({
  connection: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND")
  }),
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock("@/lib/masjid-fikra/client", () => clientMocks)

const openForm = {
  id: "11111111-1111-4111-8111-111111111111",
  kind: "inquiry",
  name: "Open form",
  slug: "open-form",
  submissionAuth: "anonymous" as const,
  requiresPayment: false,
  stripeMode: "none" as const,
  currentVersionId: "22222222-2222-4222-8222-222222222222",
  currentVersionNumber: 1,
  createdAt: "2026-08-14T00:00:00.000Z",
  updatedAt: "2026-08-14T00:00:00.000Z",
}

const paidForm = {
  ...openForm,
  id: "33333333-3333-4333-8333-333333333333",
  name: "Paid form",
  slug: "paid-form",
  requiresPayment: true,
  stripeMode: "subscription" as const,
}

const paidFormDefinition = {
  ...paidForm,
  status: "published" as const,
  submissionAuth: "either" as const,
  version: {
    id: "44444444-4444-4444-8444-444444444444",
    versionNumber: 1,
    schema: {
      pages: [],
    },
  },
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("public portal payment-form availability", () => {
  it("omits payment-backed forms from the public directory", async () => {
    clientMocks.getPortalBrandData.mockResolvedValue({ masjid: null, branding: null })
    clientMocks.getForms.mockResolvedValue([openForm, paidForm])

    render(await HomePage())

    expect(screen.getByText("Open form")).toBeTruthy()
    expect(screen.queryByText("Paid form")).toBeNull()
  })

  it("does not render the checkout-required screen for a direct paid-form URL", async () => {
    clientMocks.getPortalBrandData.mockResolvedValue({ masjid: null, branding: null })
    clientMocks.getForm.mockResolvedValue(paidFormDefinition)

    await expect(
      FormPage({ params: Promise.resolve({ id: paidForm.id }) })
    ).rejects.toThrow("NEXT_NOT_FOUND")
  })
})
