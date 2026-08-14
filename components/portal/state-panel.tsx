import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function PortalError({
  title = "Forms are temporarily unavailable",
  message = "We could not load the forms right now. Please try again in a few minutes.",
}: {
  title?: string
  message?: string
}) {
  return (
    <Alert variant="destructive" className="mx-auto max-w-2xl rounded-none border-x-0 p-4">
      <AlertTitle className="font-heading text-base">{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

export function EmptyForms() {
  return (
    <div className="border-y border-border py-16 text-center">
      <p className="label-meta text-muted-foreground">Nil return</p>
      <p className="mt-4 font-heading text-2xl">The register is empty</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Published community forms will be listed here as the masjid office adds them.
      </p>
    </div>
  )
}
