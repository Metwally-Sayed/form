import { connection } from "next/server"

import { FormCard } from "@/components/portal/form-card"
import { SiteShell } from "@/components/portal/site-shell"
import { EmptyForms, PortalError } from "@/components/portal/state-panel"
import { getForms, getPortalBrandData } from "@/lib/masjid-fikra/client"

export default async function Page() {
  await connection()

  const brand = await getPortalBrandData()
  let forms = null

  try {
    forms = await getForms()
  } catch {
    forms = null
  }

  const masjidName = brand.branding?.name ?? brand.masjid?.name ?? "your masjid"

  return (
    <SiteShell brand={brand}>
      <section className="relative overflow-hidden">
        {/* Khatim tessellation, bled off the right edge and faded into the
            page so it reads as watermark rather than wallpaper. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-24 hidden h-[26rem] w-[34rem] text-primary/[0.13] [mask-image:radial-gradient(ellipse_at_70%_30%,black,transparent_72%)] md:block"
        >
          <div className="khatim size-full" />
        </div>

        <div className="mx-auto max-w-5xl px-5 pt-16 pb-14 sm:px-8 sm:pt-24 sm:pb-20">
          <p className="rise label-meta flex items-center gap-3 text-brass">
            <span aria-hidden="true" className="h-px w-8 bg-brass" />
            The register
          </p>

          <h1 className="rise mt-7 max-w-3xl font-heading text-[2.75rem] leading-[1.04] tracking-[-0.015em] text-balance sm:text-6xl lg:text-7xl">
            Every form the masjid keeps,{" "}
            <span className="text-primary italic">in one open ledger.</span>
          </h1>

          <div className="rise mt-9 grid gap-x-12 gap-y-6 border-t border-foreground/15 pt-7 sm:grid-cols-[1.6fr_1fr]">
            <p className="max-w-xl text-[1.0625rem] leading-relaxed text-pretty text-muted-foreground">
              Choose an entry below to send information securely to {masjidName}. Nothing is
              transmitted until you submit, and your progress is held on this device while you
              work.
            </p>
            <dl className="grid content-start gap-3 text-sm">
              <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
                <dt className="label-meta text-muted-foreground">Credentials</dt>
                <dd className="font-heading">Server-side only</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
                <dt className="label-meta text-muted-foreground">Drafts</dt>
                <dd className="font-heading">Kept 24 hours</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-8 sm:px-8">
        <div className="rule-double flex items-baseline justify-between gap-4 pt-4 pb-3">
          <p className="label-meta text-muted-foreground">
            {forms && forms.length > 0 ? `${forms.length} published` : "Published forms"}
          </p>
          <p className="label-meta hidden text-muted-foreground sm:block">Availability</p>
        </div>

        {forms === null ? (
          <div className="py-10">
            <PortalError />
          </div>
        ) : forms.length === 0 ? (
          <div className="py-10">
            <EmptyForms />
          </div>
        ) : (
          <div>
            {forms.map((form, index) => (
              <div
                key={form.id}
                className="rise"
                style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
              >
                <FormCard form={form} index={index} />
              </div>
            ))}
          </div>
        )}
      </section>
    </SiteShell>
  )
}
