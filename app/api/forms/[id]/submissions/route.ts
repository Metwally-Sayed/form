import { z, type ZodError } from "zod"

import { getForm, submitForm } from "@/lib/masjid-fikra/client"
import { normalizeApiError, toPublicSubmissionError } from "@/lib/masjid-fikra/errors"
import {
  buildPortalFormSchema,
  flattenFields,
  getUnsupportedFields,
  normalizeAnswers,
  normalizeSubmitter,
} from "@/lib/masjid-fikra/form-validation"
import {
  submissionRequestSchema,
  type FormDefinition,
} from "@/lib/masjid-fikra/schemas"

function zodFieldErrors(error: ZodError) {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    if (issue.path[0] === "answers" && typeof issue.path[1] === "string") {
      errors[issue.path[1]] = issue.message
    } else if (issue.path[0] === "submitter" && typeof issue.path[1] === "string") {
      errors[`submitter.${issue.path[1]}`] = issue.message
    }
  }
  return Object.keys(errors).length ? errors : undefined
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  options?: { fieldErrors?: Record<string, string>; retryAfter?: number }
) {
  const headers = options?.retryAfter
    ? { "Retry-After": String(options.retryAfter) }
    : undefined

  return Response.json(
    {
      code,
      message,
      ...(options?.fieldErrors ? { fieldErrors: options.fieldErrors } : {}),
      ...(options?.retryAfter ? { retryAfter: options.retryAfter } : {}),
    },
    { status, headers }
  )
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) {
    return errorResponse(400, "INVALID_FORM_ID", "The form link is invalid.")
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return errorResponse(400, "INVALID_JSON", "The submission body must be valid JSON.")
  }

  const requestInput = submissionRequestSchema.safeParse(json)
  if (!requestInput.success) {
    return errorResponse(422, "INVALID_SUBMISSION", "Review the highlighted fields.", {
      fieldErrors: zodFieldErrors(requestInput.error),
    })
  }

  let formDefinition: FormDefinition | undefined

  try {
    formDefinition = await getForm(id)

    if (formDefinition.status !== "published") {
      return errorResponse(404, "FORM_NOT_AVAILABLE", "This form is not currently published.")
    }
    if (formDefinition.requiresPayment || formDefinition.stripeMode !== "none") {
      return errorResponse(
        422,
        "PAYMENT_FORM_UNSUPPORTED",
        "Payment-backed forms cannot be submitted through this portal."
      )
    }
    if (formDefinition.submissionAuth === "signed_in") {
      return errorResponse(
        403,
        "SIGNED_IN_REQUIRED",
        "This form requires a signed-in submitter."
      )
    }
    if (requestInput.data.versionId !== formDefinition.version.id) {
      return errorResponse(
        409,
        "VERSION_STALE",
        "This form changed while you were completing it. Your draft is safe; reload the latest version."
      )
    }

    const unsupportedRequired = getUnsupportedFields(formDefinition).filter(
      (field) => field.required
    )
    if (unsupportedRequired.length) {
      return errorResponse(
        422,
        "UNSUPPORTED_REQUIRED_FIELDS",
        "This form contains required fields that this portal cannot submit."
      )
    }

    const validatedValues = buildPortalFormSchema(formDefinition).safeParse({
      answers: requestInput.data.answers,
      submitter: requestInput.data.submitter,
    })
    if (!validatedValues.success) {
      return errorResponse(422, "INVALID_ANSWERS", "Review the highlighted fields.", {
        fieldErrors: zodFieldErrors(validatedValues.error),
      })
    }

    const result = await submitForm(id, {
      versionId: formDefinition.version.id,
      answers: normalizeAnswers(formDefinition, validatedValues.data.answers),
      submitter: normalizeSubmitter(validatedValues.data.submitter),
    })

    return Response.json(
      {
        submissionId: result.submissionId,
        approvalRequestId: result.approvalRequestId ?? null,
        status: result.status,
      },
      { status: 201 }
    )
  } catch (caught) {
    const error = normalizeApiError(caught)
    const allowedKeys = new Set(
      formDefinition ? flattenFields(formDefinition).map((field) => field.key) : []
    )
    const publicError = toPublicSubmissionError(error, allowedKeys)

    return errorResponse(publicError.status, publicError.body.code, publicError.body.message, {
      fieldErrors: publicError.body.fieldErrors,
      retryAfter: publicError.body.retryAfter,
    })
  }
}
