"use client"

import { AlertTriangle } from "lucide-react"
import { Controller, type Control } from "react-hook-form"

import { PhoneInput } from "@/components/reui/phone-input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { isSupportedField, type PortalFormValues } from "@/lib/masjid-fikra/form-validation"
import type { FormField } from "@/lib/masjid-fikra/schemas"

function label(field: FormField) {
  return (
    <>
      {field.label}
      {/* ms-2 because FieldLegend renders inline, without the label's flex gap. */}
      <span className="label-meta ms-2 font-normal text-muted-foreground">
        {field.required ? "Required" : "Optional"}
      </span>
    </>
  )
}

function inputType(kind: string) {
  switch (kind) {
    case "email":
      return "email"
    case "date":
      return "date"
    case "datetime":
      return "datetime-local"
    case "number":
    case "currency":
      return "number"
    default:
      return "text"
  }
}

export function DynamicField({
  fieldDefinition,
  control,
}: {
  fieldDefinition: FormField
  control: Control<PortalFormValues>
}) {
  if (!isSupportedField(fieldDefinition)) {
    return (
      <Alert variant={fieldDefinition.required ? "destructive" : "default"}>
        <AlertTriangle aria-hidden="true" />
        <AlertTitle>{fieldDefinition.label}</AlertTitle>
        <AlertDescription>
          This field type ({fieldDefinition.kind}) is not supported by this website yet.
        </AlertDescription>
      </Alert>
    )
  }

  const name = `answers.${fieldDefinition.key}` as const
  const inputId = `field-${fieldDefinition.id}`

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const isInvalid = fieldState.invalid

        if (fieldDefinition.kind === "checkbox") {
          return (
            <Field orientation="horizontal" data-invalid={isInvalid}>
              <Checkbox
                id={inputId}
                name={field.name}
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
                onBlur={field.onBlur}
                aria-invalid={isInvalid}
              />
              <FieldContent>
                <FieldLabel htmlFor={inputId}>{label(fieldDefinition)}</FieldLabel>
                {fieldDefinition.helpText && (
                  <FieldDescription>{fieldDefinition.helpText}</FieldDescription>
                )}
                {isInvalid && <FieldError errors={[fieldState.error]} />}
              </FieldContent>
            </Field>
          )
        }

        if (fieldDefinition.kind === "multi_select") {
          const selected = Array.isArray(field.value) ? (field.value as string[]) : []
          return (
            <FieldSet data-invalid={isInvalid}>
              <FieldLegend variant="label">{label(fieldDefinition)}</FieldLegend>
              {fieldDefinition.helpText && (
                <FieldDescription>{fieldDefinition.helpText}</FieldDescription>
              )}
              <FieldGroup data-slot="checkbox-group">
                {fieldDefinition.options.map((option) => {
                  const optionId = `${inputId}-${option.value}`
                  return (
                    <Field key={option.value} orientation="horizontal" data-invalid={isInvalid}>
                      <Checkbox
                        id={optionId}
                        name={field.name}
                        checked={selected.includes(option.value)}
                        onCheckedChange={(checked) => {
                          const next = checked
                            ? [...selected, option.value]
                            : selected.filter((value) => value !== option.value)
                          field.onChange(next)
                          field.onBlur()
                        }}
                        aria-invalid={isInvalid}
                      />
                      <FieldLabel htmlFor={optionId}>{option.label}</FieldLabel>
                    </Field>
                  )
                })}
              </FieldGroup>
              {isInvalid && <FieldError errors={[fieldState.error]} />}
            </FieldSet>
          )
        }

        if (fieldDefinition.kind === "single_select") {
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={inputId}>{label(fieldDefinition)}</FieldLabel>
              <Select
                name={field.name}
                value={typeof field.value === "string" ? field.value : ""}
                onValueChange={(value) => field.onChange(value ?? "")}
              >
                <SelectTrigger id={inputId} className="w-full" aria-invalid={isInvalid}>
                  <SelectValue>{(value) => value || "Select an option"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {fieldDefinition.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldDefinition.helpText && (
                <FieldDescription>{fieldDefinition.helpText}</FieldDescription>
              )}
              {isInvalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )
        }

        if (fieldDefinition.kind === "phone") {
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={inputId}>{label(fieldDefinition)}</FieldLabel>
              <PhoneInput
                id={inputId}
                name={field.name}
                defaultCountry="EG"
                value={typeof field.value === "string" ? field.value : ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                autoComplete="tel"
                aria-invalid={isInvalid}
              />
              {fieldDefinition.helpText && (
                <FieldDescription>{fieldDefinition.helpText}</FieldDescription>
              )}
              {isInvalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )
        }

        if (fieldDefinition.kind === "long_text" || fieldDefinition.kind === "address") {
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={inputId}>{label(fieldDefinition)}</FieldLabel>
              <Textarea
                id={inputId}
                name={field.name}
                ref={field.ref}
                value={typeof field.value === "string" ? field.value : ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                rows={fieldDefinition.kind === "address" ? 3 : 5}
                autoComplete={fieldDefinition.kind === "address" ? "street-address" : undefined}
                aria-invalid={isInvalid}
              />
              {fieldDefinition.helpText && (
                <FieldDescription>{fieldDefinition.helpText}</FieldDescription>
              )}
              {isInvalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )
        }

        return (
          <Field data-invalid={isInvalid}>
            <FieldLabel htmlFor={inputId}>{label(fieldDefinition)}</FieldLabel>
            <Input
              id={inputId}
              name={field.name}
              ref={field.ref}
              type={inputType(fieldDefinition.kind)}
              step={fieldDefinition.kind === "currency" ? "0.01" : undefined}
              inputMode={fieldDefinition.kind === "currency" ? "decimal" : undefined}
              value={typeof field.value === "string" || typeof field.value === "number" ? field.value : ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              autoComplete={fieldDefinition.kind === "email" ? "email" : undefined}
              aria-invalid={isInvalid}
            />
            {fieldDefinition.helpText && (
              <FieldDescription>{fieldDefinition.helpText}</FieldDescription>
            )}
            {isInvalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )
      }}
    />
  )
}
