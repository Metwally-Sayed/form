import { Skeleton } from "@/components/ui/skeleton"

export default function FormLoading() {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-14 sm:px-8">
      <Skeleton className="h-3 w-24 rounded-none" />
      <Skeleton className="mt-8 h-12 w-3/4 rounded-none" />
      <div className="mt-8 grid grid-cols-3 gap-8 border-t border-border pt-5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-16 rounded-none" />
            <Skeleton className="h-4 w-20 rounded-none" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-12 h-80 rounded-none" />
      <Skeleton className="mt-6 h-56 rounded-none" />
    </div>
  )
}
