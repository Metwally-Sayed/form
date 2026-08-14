import Link from "next/link"
import { ArrowRight } from "lucide-react"

import type { FormListItem } from "@/lib/masjid-fikra/schemas"

function formatKind(kind: string) {
  return kind
    .replace(/^system_/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

/** One line in the register. Full-width, hairline-ruled, numbered. */
function sameWords(a: string, b: string) {
  const strip = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "")
  return strip(a) === strip(b)
}

export function FormCard({ form, index }: { form: FormListItem; index: number }) {
  const unavailable = form.requiresPayment || form.stripeMode !== "none"
  const kind = formatKind(form.kind)
  // Most forms are named after their kind; don't print the same words twice.
  const showKind = !sameWords(kind, form.name)

  return (
    <Link
      href={`/forms/${form.id}`}
      className="group relative grid grid-cols-[2.5rem_1fr] items-baseline gap-x-4 gap-y-3 border-b border-border py-7 transition-colors hover:bg-accent/45 sm:grid-cols-[3.5rem_1fr_9rem] sm:gap-x-6"
    >
      <span className="label-meta pt-1 text-brass tabular-nums">
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="min-w-0">
        <h3 className="font-heading text-2xl leading-tight text-balance transition-transform duration-300 ease-out group-hover:translate-x-1 sm:text-[1.75rem]">
          {form.name}
        </h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {showKind && (
            <>
              {kind}
              <span className="mx-2 text-border">/</span>
            </>
          )}
          {form.submissionAuth === "signed_in" ? "Sign-in required" : "Open to the public"}
        </p>
      </div>

      <div className="col-start-2 flex items-center justify-between gap-4 sm:col-start-3 sm:justify-end">
        <span className="label-meta flex items-center gap-2 text-muted-foreground">
          <span
            aria-hidden="true"
            className={
              unavailable
                ? "size-1.5 rounded-full bg-destructive"
                : "size-1.5 rounded-full bg-primary"
            }
          />
          {unavailable ? "In person" : "Online"}
        </span>
        <ArrowRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-out group-hover:translate-x-1.5 group-hover:text-foreground"
        />
      </div>
    </Link>
  )
}
