import "server-only"

import axios, { type AxiosInstance } from "axios"
import { z } from "zod"

import { normalizeApiError } from "@/lib/masjid-fikra/errors"
import {
  brandingSchema,
  formDefinitionSchema,
  formsListResponseSchema,
  masjidSchema,
  submissionRequestSchema,
  submissionResultSchema,
  type Branding,
  type FormDefinition,
  type FormListItem,
  type Masjid,
  type SubmissionRequest,
  type SubmissionResult,
} from "@/lib/masjid-fikra/schemas"

const environmentSchema = z.object({
  MASJID_FIKRA_BASE_URL: z.string().url(),
  MASJID_FIKRA_API_KEY: z.string().min(1),
})

let apiClient: AxiosInstance | undefined

function getApiClient() {
  if (apiClient) return apiClient

  const environment = environmentSchema.safeParse(process.env)
  if (!environment.success) {
    throw new Error("Masjid Fikra environment variables are not configured.")
  }

  apiClient = axios.create({
    baseURL: environment.data.MASJID_FIKRA_BASE_URL.replace(/\/$/, ""),
    timeout: 10_000,
    headers: {
      Authorization: `Bearer ${environment.data.MASJID_FIKRA_API_KEY}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  })

  return apiClient
}

async function requestAndParse<TSchema extends z.ZodTypeAny>(
  request: () => Promise<{ data: unknown }>,
  schema: TSchema
): Promise<z.output<TSchema>> {
  try {
    const response = await request()
    return schema.parse(response.data)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function getForms(): Promise<FormListItem[]> {
  const response = await requestAndParse(
    () => getApiClient().get("/forms"),
    formsListResponseSchema
  )
  return response.data
}

export function getForm(id: string): Promise<FormDefinition> {
  return requestAndParse(
    () => getApiClient().get(`/forms/${encodeURIComponent(id)}`),
    formDefinitionSchema
  )
}

export function getMasjid(): Promise<Masjid> {
  return requestAndParse(() => getApiClient().get("/masjid"), masjidSchema)
}

export function getBranding(): Promise<Branding> {
  return requestAndParse(() => getApiClient().get("/branding"), brandingSchema)
}

export async function submitForm(
  formId: string,
  input: SubmissionRequest
): Promise<SubmissionResult> {
  const payload = submissionRequestSchema.parse(input)
  return requestAndParse(
    () => getApiClient().post(`/forms/${encodeURIComponent(formId)}/submissions`, payload),
    submissionResultSchema
  )
}

export type PortalBrandData = {
  masjid: Masjid | null
  branding: Branding | null
}

export async function getPortalBrandData(): Promise<PortalBrandData> {
  const [masjidResult, brandingResult] = await Promise.allSettled([
    getMasjid(),
    getBranding(),
  ])

  return {
    masjid: masjidResult.status === "fulfilled" ? masjidResult.value : null,
    branding: brandingResult.status === "fulfilled" ? brandingResult.value : null,
  }
}
