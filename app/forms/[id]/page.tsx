import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { ArrowLeft, LockKeyhole } from "lucide-react"
import { z } from "zod"

import { DynamicForm } from "@/components/forms/dynamic-form"
import { SiteShell } from "@/components/portal/site-shell"
import { PortalError } from "@/components/portal/state-panel"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getForm, getPortalBrandData } from "@/lib/masjid-fikra/client"
import { MasjidFikraError } from "@/lib/masjid-fikra/errors"

export default async function FormPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await connection()
  const { id } = await params

  if (!z.string().uuid().safeParse(id).success) notFound()

  const brandPromise = getPortalBrandData()
  let formDefinition

  try {
    formDefinition = await getForm(id)
  } catch (error) {
    if (error instanceof MasjidFikraError && error.status === 404) notFound()
    const brand = await brandPromise
    return (
      <SiteShell brand={brand}>
        <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
          <PortalError
            title="This form could not be loaded"
            message="The form service did not return a usable response. Please try again shortly."
          />
        </div>
      </SiteShell>
    )
  }

  const paid = formDefinition.requiresPayment || formDefinition.stripeMode !== "none"
  if (paid) notFound()

  const brand = await brandPromise
  const signedInOnly = formDefinition.submissionAuth === "signed_in"

  return (
    <SiteShell brand={brand}>
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-3xl px-5 pt-10 pb-9 sm:px-8 sm:pt-14">
          <Link
            href="/"
            className="label-meta group inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft
              aria-hidden="true"
              className="size-3.5 transition-transform duration-300 ease-out group-hover:-translate-x-1"
            />
            The register
          </Link>

          <h1 className="rise mt-8 font-heading text-[2.5rem] leading-[1.06] tracking-[-0.015em] text-balance sm:text-5xl">
            {formDefinition.name}
          </h1>

          <dl className="rise mt-8 grid grid-cols-2 gap-x-8 gap-y-3 border-t border-foreground/15 pt-5">
            <div>
              <dt className="label-meta text-muted-foreground">Version</dt>
              <dd className="mt-1 font-heading tabular-nums">
                No. {formDefinition.version.versionNumber}
              </dd>
            </div>
            <div>
              <dt className="label-meta text-muted-foreground">Submission</dt>
              <dd className="mt-1 font-heading">Online</dd>
            </div>
          </dl>
        </div>
        <div className="mx-auto h-px max-w-3xl bg-border" />
      </section>

      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        {signedInOnly ? (
          <Alert>
            <LockKeyhole aria-hidden="true" />
            <AlertTitle className="font-heading text-base">Sign-in is required</AlertTitle>
            <AlertDescription>
              This form only accepts signed-in submissions and cannot be completed through this public portal.
            </AlertDescription>
          </Alert>
        ) : (
          <DynamicForm
            key={formDefinition.version.id}
            formDefinition={formDefinition}
          />
        )}
      </div>
    </SiteShell>
  )
}
