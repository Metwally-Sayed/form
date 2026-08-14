import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="relative flex min-h-svh items-center overflow-hidden px-5 sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-32 h-[30rem] w-[38rem] text-primary/[0.12] [mask-image:radial-gradient(ellipse_at_65%_35%,black,transparent_70%)]"
      >
        <div className="khatim size-full" />
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <p className="label-meta flex items-center gap-3 text-brass">
          <span aria-hidden="true" className="h-px w-8 bg-brass" />
          Error 404
        </p>
        <h1 className="mt-7 font-heading text-5xl leading-[1.05] tracking-[-0.015em] text-balance sm:text-6xl">
          No such entry <span className="text-primary italic">in the register.</span>
        </h1>
        <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
          This form may have been removed, unpublished, or replaced with a newer link.
        </p>
        <Button className="mt-9" nativeButton={false} render={<Link href="/" />}>
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Back to the register
        </Button>
      </div>
    </main>
  )
}
