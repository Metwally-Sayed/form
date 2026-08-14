import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-5 pt-20 sm:px-8 sm:pt-28">
      <Skeleton className="h-3 w-28 rounded-none" />
      <Skeleton className="mt-7 h-14 w-full max-w-2xl rounded-none" />
      <Skeleton className="mt-3 h-14 w-full max-w-lg rounded-none" />
      <div className="mt-14 border-t border-border">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-[3.5rem_1fr] items-baseline gap-6 border-b border-border py-8"
          >
            <Skeleton className="h-3 w-6 rounded-none" />
            <div className="space-y-2.5">
              <Skeleton className="h-6 w-2/3 rounded-none" />
              <Skeleton className="h-3.5 w-40 rounded-none" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
