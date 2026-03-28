import { Skeleton } from "@heroui/skeleton";
import { Card } from "@heroui/card";

export const ProfileSkeleton = () => {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse-gentle">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-6 items-center">
        <Skeleton className="w-48 h-4 rounded-lg bg-default-200/50" />
        <div className="relative">
          <Skeleton className="w-24 h-24 rounded-full bg-default-300/30" />
          <div className="absolute bottom-0 right-0">
            <Skeleton className="w-8 h-8 rounded-full bg-primary/20" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 w-full">
          <Skeleton className="w-1/3 h-8 rounded-lg bg-default-200/50" />
          <Skeleton className="w-24 h-6 rounded-full bg-default-200/40" />
        </div>
      </div>

      {/* Sections Skeletons */}
      <div className="space-y-8 w-full mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="w-32 h-4 ml-1 rounded-lg bg-default-200/30" />
            <Card className="p-4 space-y-4 bg-default-100/5 border border-white/5 rounded-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Skeleton className="h-10 rounded-xl bg-default-200/20" />
                <Skeleton className="h-10 rounded-xl bg-default-200/20" />
              </div>
              <Skeleton className="h-10 rounded-xl bg-default-200/20" />
            </Card>
          </div>
        ))}
      </div>

      {/* Action Buttons Skeleton */}
      <div className="pt-6 border-t border-white/10 space-y-3 max-w-md mx-auto w-full">
        <Skeleton className="h-12 rounded-xl bg-primary/20" />
        <Skeleton className="h-12 rounded-xl bg-default-200/20" />
        <Skeleton className="h-12 rounded-xl bg-danger/10" />
      </div>
    </div>
  );
};
