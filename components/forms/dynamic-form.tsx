"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { AlertCircle, Save } from "lucide-react"
import {
  Controller,
  type FieldPath,
  type Resolver,
  useForm,
} from "react-hook-form"

import { DynamicField } from "@/components/forms/dynamic-field"
import { PhoneInput } from "@/components/reui/phone-input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useFormDraft } from "@/hooks/use-form-draft"
import {
  buildPortalFormSchema,
  getDefaultValues,
  getUnsupportedFields,
  normalizeAnswers,
  normalizeSubmitter,
  type PortalFormValues,
} from "@/lib/masjid-fikra/form-validation"
import {
  publicSubmissionErrorSchema,
  submissionResultSchema,
  type FormDefinition,
  type PublicSubmissionError,
  type SubmissionResult,
} from "@/lib/masjid-fikra/schemas"

function currentTimestamp() {
  return Date.now()
}

function clientError(error: unknown): PublicSubmissionError {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return {
        code: "SUBMISSION_TIMEOUT",
        message:
          "The request timed out, so we cannot confirm whether it was received. Your draft is still saved; review before trying again.",
      }
    }

    if (!error.response) {
      return {
        code: "NETWORK_ERROR",
        message:
          "The server could not be reached. Check your connection and try again; your draft is still saved.",
      }
    }

    const parsed = publicSubmissionErrorSchema.safeParse(error.response.data)
    if (parsed.success) return parsed.data
  }

  return {
    code: "UNEXPECTED_ERROR",
    message: "The submission could not be confirmed. Your saved draft has been kept.",
  }
}

function SubmitterInput({
  control,
  name,
  label,
  type = "text",
  required = false,
  autoComplete,
}: {
  control: ReturnType<typeof useForm<PortalFormValues>>["control"]
  name: "submitter.email" | "submitter.name" | "submitter.phone"
  label: string
  type?: React.HTMLInputTypeAttribute
  required?: boolean
  autoComplete?: string
}) {
  const inputId = name.replace(".", "-")
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={inputId}>
            {label}
            <span className="label-meta font-normal text-muted-foreground">
              {required ? "Required" : "Optional"}
            </span>
          </FieldLabel>
          <Input
            {...field}
            id={inputId}
            type={type}
            value={field.value ?? ""}
            autoComplete={autoComplete}
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}

export function DynamicForm({ formDefinition }: { formDefinition: FormDefinition }) {
  const router = useRouter()
  const schema = React.useMemo(() => buildPortalFormSchema(formDefinition), [formDefinition])
  const defaultValues = React.useMemo(() => getDefaultValues(formDefinition), [formDefinition])
  const form = useForm<PortalFormValues>({
    resolver: zodResolver(schema) as Resolver<PortalFormValues>,
    defaultValues,
    mode: "onBlur",
  })
  const draft = useFormDraft({
    form,
    formId: formDefinition.id,
    versionId: formDefinition.version.id,
    defaultValues,
  })
  const [submission, setSubmission] = React.useState<{
    result: SubmissionResult
    draftCleared: boolean
  } | null>(null)
  const [submissionError, setSubmissionError] = React.useState<PublicSubmissionError | null>(null)
  const [retryUntil, setRetryUntil] = React.useState<number | null>(null)
  const [now, setNow] = React.useState(() => Date.now())
  const unsupportedRequired = getUnsupportedFields(formDefinition).filter(
    (field) => field.required
  )

  React.useEffect(() => {
    if (!retryUntil) return
    const interval = window.setInterval(() => {
      const timestamp = Date.now()
      setNow(timestamp)
      if (timestamp >= retryUntil) setRetryUntil(null)
    }, 1_000)
    return () => window.clearInterval(interval)
  }, [retryUntil])

  const retrySeconds = retryUntil ? Math.max(0, Math.ceil((retryUntil - now) / 1_000)) : 0

  async function onSubmit(values: PortalFormValues) {
    if (retrySeconds > 0) return
    setSubmissionError(null)
    form.clearErrors()

    try {
      const response = await axios.post(
        `/api/forms/${formDefinition.id}/submissions`,
        {
          versionId: formDefinition.version.id,
          answers: normalizeAnswers(formDefinition, values.answers),
          submitter: normalizeSubmitter(values.submitter),
        },
        { timeout: 15_000 }
      )
      const result = submissionResultSchema.parse(response.data)

      const draftCleared = draft.clearAfterSubmit(response.status)
      if (draftCleared === null) {
        throw new Error("Submission response was not an unambiguous success.")
      }
      form.reset(defaultValues)
      setSubmission({ result, draftCleared })
    } catch (error) {
      const normalized = clientError(error)
      setSubmissionError(normalized)

      for (const [key, message] of Object.entries(normalized.fieldErrors ?? {})) {
        const path = (key.startsWith("submitter.") ? key : `answers.${key}`) as FieldPath<PortalFormValues>
        form.setError(path, { type: "server", message })
      }

      if (normalized.retryAfter) {
        const timestamp = currentTimestamp()
        const until = timestamp + normalized.retryAfter * 1_000
        setNow(timestamp)
        setRetryUntil(until)
      }
    }
  }

  if (submission) {
    return (
      <div className="rise border-y border-foreground/15 py-12">
        <p className="label-meta flex items-center gap-3 text-brass">
          <span aria-hidden="true" className="h-px w-8 bg-brass" />
          Entered into the register
        </p>
        <h2 className="mt-6 font-heading text-4xl leading-[1.08] text-balance">
          Received, <span className="text-primary italic">jazāk Allāhu khayran.</span>
        </h2>
        <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
          {submission.draftCleared
            ? "Your form was submitted successfully and the saved draft has been removed from this device."
            : "Your form was submitted successfully, but this browser did not allow us to remove its local draft."}
        </p>

        <dl className="mt-8 max-w-md border-t border-border pt-4">
          <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
            <dt className="label-meta text-muted-foreground">Reference</dt>
            <dd className="font-mono text-xs break-all">{submission.result.submissionId}</dd>
          </div>
        </dl>

        {!submission.draftCleared && (
          <Alert variant="destructive" className="mt-6 max-w-md">
            <AlertCircle aria-hidden="true" />
            <AlertTitle className="font-heading text-base">
              Clear this site&apos;s stored data
            </AlertTitle>
            <AlertDescription>
              Use your browser&apos;s privacy settings to remove this site&apos;s local data before closing this device.
            </AlertDescription>
          </Alert>
        )}

        <Button className="mt-9" nativeButton={false} render={<Link href="/" />}>
          Back to the register
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <div className="space-y-6">
        {draft.notice === "restored" && (
          <Alert>
            <Save aria-hidden="true" />
            <AlertTitle>Draft restored</AlertTitle>
            <AlertDescription>
              We restored the values previously saved in this browser.
            </AlertDescription>
          </Alert>
        )}

        {draft.notice === "external-update" && (
          <Alert>
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Draft changed in another tab</AlertTitle>
            <AlertDescription>
              This tab was not overwritten. Reload only if you want to use the other tab&apos;s latest saved values.
            </AlertDescription>
          </Alert>
        )}

        {draft.storageWarning && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Draft saving unavailable</AlertTitle>
            <AlertDescription>{draft.storageWarning}</AlertDescription>
          </Alert>
        )}

        {submissionError && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>We couldn&apos;t confirm your submission</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{submissionError.message}</p>
              {submissionError.code === "VERSION_STALE" && (
                <Button type="button" size="sm" variant="outline" onClick={() => router.refresh()}>
                  Reload latest form
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {unsupportedRequired.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>This form cannot be submitted here yet</AlertTitle>
            <AlertDescription>
              It contains required fields that this website does not support. Please contact the masjid for help.
            </AlertDescription>
          </Alert>
        )}

        {formDefinition.version.schema.pages.map((page, pageIndex) => (
          <div key={page.id} className="space-y-6">
            {formDefinition.version.schema.pages.length > 1 && (
              <div className="border-b border-foreground/15 pb-3">
                <p className="label-meta text-brass tabular-nums">
                  Page {pageIndex + 1} / {formDefinition.version.schema.pages.length}
                </p>
                <h2 className="mt-2 font-heading text-2xl leading-tight">{page.title}</h2>
              </div>
            )}

            {page.sections.map((section, sectionIndex) => (
              <Card key={section.id}>
                <CardHeader className="border-b">
                  <CardTitle className="text-xl">{section.title}</CardTitle>
                  <CardAction>
                    <span className="label-meta text-muted-foreground tabular-nums">
                      {String(sectionIndex + 1).padStart(2, "0")}
                    </span>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    {section.fields.map((fieldDefinition) => (
                      <DynamicField
                        key={fieldDefinition.id}
                        fieldDefinition={fieldDefinition}
                        control={form.control}
                      />
                    ))}
                  </FieldGroup>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-xl">Submission contact</CardTitle>
            <CardDescription>
              These details identify the person sending the form and are separate from the form answers above.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <SubmitterInput
                control={form.control}
                name="submitter.email"
                label="Email address"
                type="email"
                required
                autoComplete="email"
              />
              <FieldSeparator />
              <SubmitterInput
                control={form.control}
                name="submitter.name"
                label="Full name"
                autoComplete="name"
              />
              <Controller
                control={form.control}
                name="submitter.phone"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="submitter-phone">
                      Phone number
                      <span className="label-meta font-normal text-muted-foreground">Optional</span>
                    </FieldLabel>
                    <PhoneInput
                      id="submitter-phone"
                      name={field.name}
                      defaultCountry="EG"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      autoComplete="tel"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Sign-off bar: draft status on the left, one weighty action on the right. */}
        <div className="mt-12">
          <div className="flex flex-col-reverse gap-6 sm:flex-row sm:items-center sm:justify-end sm:gap-8">
            {draft.lastSavedAt && (
              <div className="sm:mr-auto">
                <p className="label-meta text-muted-foreground">
                  Draft saved{" "}
                  <span className="tabular-nums">
                    {new Date(draft.lastSavedAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={draft.discardDraft}
                  className="mt-1.5 text-sm text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-destructive hover:decoration-destructive"
                >
                  Discard this draft
                </button>
              </div>
            )}

            <Button
              type="submit"
              className="h-12 w-full px-8 text-[0.9375rem] sm:w-auto sm:min-w-52"
              disabled={
                form.formState.isSubmitting ||
                unsupportedRequired.length > 0 ||
                retrySeconds > 0
              }
            >
              {form.formState.isSubmitting
                ? "Submitting…"
                : retrySeconds > 0
                  ? `Retry in ${retrySeconds}s`
                  : "Submit form"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
