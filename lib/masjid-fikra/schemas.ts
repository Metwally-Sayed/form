import { z } from "zod"

const nullableString = z.string().nullable()

export const formOptionSchema = z
  .object({
    label: z.string(),
    value: z.string(),
  })
  .passthrough()

export const formFieldSchema = z
  .object({
    id: z.string(),
    key: z.string().min(1),
    kind: z.string().min(1),
    label: z.string(),
    helpText: z.string().optional(),
    required: z.boolean().optional().default(false),
    options: z.array(formOptionSchema).optional().default([]),
    useAsSubmitterEmail: z.boolean().optional(),
    dynamicSource: z.string().optional(),
    visibleIf: z.unknown().optional(),
  })
  .passthrough()

export const formSectionSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    fields: z.array(formFieldSchema),
  })
  .passthrough()

export const formPageSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    sections: z.array(formSectionSchema),
  })
  .passthrough()

export const renderedFormSchema = z
  .object({
    pages: z.array(formPageSchema),
    version: z.number().optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough()

export const formListItemSchema = z
  .object({
    id: z.string().uuid(),
    kind: z.string(),
    name: z.string(),
    slug: z.string(),
    submissionAuth: z.enum(["anonymous", "signed_in", "either"]),
    requiresPayment: z.boolean(),
    stripeMode: z.enum(["none", "one_time", "subscription"]),
    currentVersionId: z.string().uuid().nullable(),
    currentVersionNumber: z.number().int().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough()

export const formsListResponseSchema = z.object({
  data: z.array(formListItemSchema),
  hasMore: z.boolean(),
  nextCursor: z.string().uuid().nullable(),
})

export const formDefinitionSchema = z
  .object({
    id: z.string().uuid(),
    kind: z.string(),
    name: z.string(),
    slug: z.string(),
    status: z.enum(["draft", "published", "archived"]),
    submissionAuth: z.enum(["anonymous", "signed_in", "either"]),
    requiresPayment: z.boolean(),
    stripeMode: z.enum(["none", "one_time", "subscription"]),
    version: z.object({
      id: z.string().uuid(),
      versionNumber: z.number().int(),
      schema: renderedFormSchema,
    }),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough()

export const masjidSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string(),
    name: z.string(),
    legalName: nullableString,
    ein: nullableString,
    about: nullableString,
    website: nullableString,
    phone: nullableString,
    email: nullableString,
    logoUrl: nullableString,
    heroUrl: nullableString,
    address: z.object({
      line1: nullableString,
      line2: nullableString,
      city: nullableString,
      state: nullableString,
      zip: nullableString,
    }),
    acceptsOnlineDonations: z.boolean(),
  })
  .passthrough()

export const brandingSchema = z
  .object({
    version: z.number().int(),
    updatedAt: z.string(),
    name: z.string(),
    slug: z.string(),
    logoUrl: nullableString,
    theme: z.string(),
    themePrimary: nullableString,
    palette: z.object({
      primary: z.string(),
      primaryDeep: z.string(),
      primarySoft: z.string(),
      onPrimary: z.string(),
      onPrimaryDeep: z.string(),
      primaryAccessible: z.string(),
      autoDarkened: z.boolean(),
    }),
    templateSlug: z.string(),
  })
  .passthrough()

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
)

export const submitterSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  name: optionalTrimmedString,
  phone: optionalTrimmedString,
})

export const submissionRequestSchema = z.object({
  versionId: z.string().uuid(),
  answers: z.record(z.string(), z.unknown()),
  submitter: submitterSchema,
})

export const submissionResultSchema = z
  .object({
    submissionId: z.string().uuid(),
    approvalRequestId: z.string().uuid().nullable().optional(),
    status: z.literal("submitted"),
    returnToken: z.string().optional(),
  })
  .passthrough()

export const apiErrorSchema = z
  .object({
    error: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  })
  .passthrough()

export const publicSubmissionErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  fieldErrors: z.record(z.string(), z.string()).optional(),
  retryAfter: z.number().int().positive().optional(),
})

export type FormOption = z.infer<typeof formOptionSchema>
export type FormField = z.infer<typeof formFieldSchema>
export type FormSection = z.infer<typeof formSectionSchema>
export type FormPage = z.infer<typeof formPageSchema>
export type FormListItem = z.infer<typeof formListItemSchema>
export type FormDefinition = z.infer<typeof formDefinitionSchema>
export type Masjid = z.infer<typeof masjidSchema>
export type Branding = z.infer<typeof brandingSchema>
export type Submitter = z.infer<typeof submitterSchema>
export type SubmissionRequest = z.infer<typeof submissionRequestSchema>
export type SubmissionResult = z.infer<typeof submissionResultSchema>
export type PublicSubmissionError = z.infer<typeof publicSubmissionErrorSchema>
