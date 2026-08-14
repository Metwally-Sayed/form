import type { CSSProperties, ReactNode } from "react"

import type { PortalBrandData } from "@/lib/masjid-fikra/client"

type SiteShellProps = {
  brand: PortalBrandData
  children: ReactNode
}

type BrandStyle = CSSProperties & {
  "--primary"?: string
  "--primary-foreground"?: string
  "--ring"?: string
  "--brand-soft"?: string
  "--brand-deep"?: string
}

function formatAddress(brand: PortalBrandData) {
  const address = brand.masjid?.address
  if (!address) return null
  const locality = [address.city, address.state, address.zip].filter(Boolean).join(", ")
  return [address.line1, address.line2, locality].filter(Boolean).join(", ")
}

export function SiteShell({ brand, children }: SiteShellProps) {
  const name = brand.branding?.name ?? brand.masjid?.name ?? "Masjid Fikra"
  const palette = brand.branding?.palette
  const address = formatAddress(brand)
  const style: BrandStyle | undefined = palette
    ? {
        "--primary": palette.primaryAccessible,
        "--primary-foreground": palette.onPrimary,
        "--ring": palette.primaryAccessible,
        "--brand-soft": palette.primarySoft,
        "--brand-deep": palette.primaryDeep,
      }
    : undefined

  return (
    <div style={style} className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-background/92 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-end gap-3.5 px-5 py-4 sm:px-8">
          {/* A ruled initial, set in the display serif — an institution's
              mark, not another rounded square with a glyph inside it. */}
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center border border-foreground/25 font-heading text-lg leading-none text-foreground"
          >
            {name.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-lg leading-tight">{name}</p>
            <p className="label-meta text-muted-foreground">Community forms</p>
          </div>
          <p className="label-meta hidden text-muted-foreground sm:block">Est. online</p>
        </div>
        <div className="h-px w-full bg-border" />
        <div className="h-[3px] w-full bg-primary" />
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-24 border-t border-foreground/15">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <p className="font-heading text-xl leading-tight">{name}</p>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Secure community forms, kept plainly and{" "}
                <span className="font-heading italic">held in confidence</span>.
              </p>
            </div>

            {address && (
              <div>
                <p className="label-meta border-b border-border pb-2 text-muted-foreground">
                  Address
                </p>
                <p className="mt-3 text-sm leading-relaxed">{address}</p>
              </div>
            )}

            <div>
              <p className="label-meta border-b border-border pb-2 text-muted-foreground">
                Contact
              </p>
              <div className="mt-3 grid gap-1.5 text-sm">
                {brand.masjid?.email && (
                  <a
                    className="w-fit underline decoration-border underline-offset-4 transition-colors hover:decoration-primary"
                    href={`mailto:${brand.masjid.email}`}
                  >
                    {brand.masjid.email}
                  </a>
                )}
                {brand.masjid?.phone && (
                  <a
                    className="w-fit tabular-nums underline decoration-border underline-offset-4 transition-colors hover:decoration-primary"
                    href={`tel:${brand.masjid.phone}`}
                  >
                    {brand.masjid.phone}
                  </a>
                )}
                {!brand.masjid?.email && !brand.masjid?.phone && (
                  <p className="text-muted-foreground">Contact the masjid office.</p>
                )}
              </div>
            </div>
          </div>

          <p className="border-t border-border py-6 text-xs leading-relaxed text-muted-foreground">
            Your saved draft stays only in this browser and is removed after a successful
            submission.
          </p>
        </div>
      </footer>
    </div>
  )
}
