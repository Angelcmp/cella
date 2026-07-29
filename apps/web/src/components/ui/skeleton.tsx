import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// Document skeleton
function DocumentSkeleton() {
  return (
    <div className="shadow-card border border-gray-800/30 rounded-lg p-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-start space-x-4 flex-1">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex items-center space-x-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
        <Skeleton className="h-5 w-5" />
      </div>
    </div>
  )
}

// Chat message skeleton
function ChatMessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className="group animate-fade-in">
      <div className="flex items-center space-x-3 mb-3">
        <Skeleton className={`w-8 h-8 rounded-full ${isUser ? 'bg-yellow-600/20' : 'bg-gray-700/50'}`} />
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      <div className="ml-11 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        {!isUser && (
          <Skeleton className="h-4 w-3/5" />
        )}
        {!isUser && (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-32" />
            <div className="space-y-1">
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Dashboard stats skeleton
function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="shadow-card p-6 rounded-lg border border-gray-800/30 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Upload area skeleton
function UploadSkeleton() {
  return (
    <div className="shadow-card border-2 border-dashed border-gray-600 rounded-lg p-12 text-center animate-fade-in">
      <div className="flex flex-col items-center space-y-4">
        <Skeleton className="h-16 w-16 rounded-lg" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    </div>
  )
}

export { 
  Skeleton, 
  DocumentSkeleton, 
  ChatMessageSkeleton, 
  DashboardStatsSkeleton,
  UploadSkeleton 
}