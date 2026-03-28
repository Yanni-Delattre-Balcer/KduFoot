import { Skeleton } from "@heroui/skeleton";
import { Card } from "@heroui/card";

export const MatchDetailsSkeleton = () => {
  return (
    <div className="container mx-auto max-w-7xl px-2 sm:px-6 py-8 space-y-8 animate-pulse-gentle pb-24">
      {/* Top Navigation Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Skeleton className="w-24 h-10 rounded-xl bg-default-200/30" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Header Skeleton */}
          <Card className="p-6 bg-[#232120]/60 backdrop-blur-md border border-white/10 rounded-3xl">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-3">
                <Skeleton className="w-48 h-8 rounded-lg bg-default-200/50" />
                <Skeleton className="w-32 h-4 rounded-lg bg-default-200/30" />
              </div>
              <Skeleton className="w-16 h-16 rounded-2xl bg-default-300/20" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="w-20 h-6 rounded-full bg-primary/20" />
              <Skeleton className="w-20 h-6 rounded-full bg-default-200/30" />
            </div>
          </Card>

          {/* Info Grid Skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card
                key={i}
                className="p-4 bg-default-100/5 border border-white/5 rounded-2xl"
              >
                <Skeleton className="w-8 h-8 rounded-lg mb-2 bg-default-200/30" />
                <Skeleton className="w-full h-4 rounded-lg bg-default-200/20" />
              </Card>
            ))}
          </div>

          {/* Additional Info Skeleton */}
          <Card className="p-6 bg-default-100/5 border border-white/5 rounded-2xl space-y-4">
            <Skeleton className="w-40 h-6 rounded-lg bg-default-200/40" />
            <div className="space-y-2">
              <Skeleton className="w-full h-4 rounded-lg bg-default-200/20" />
              <Skeleton className="w-3/4 h-4 rounded-lg bg-default-200/20" />
            </div>
          </Card>
        </div>

        {/* Sidebar Skeleton */}
        <div className="flex flex-col gap-4">
          <Card className="p-6 bg-violet-600/10 border-2 border-violet-500/20 rounded-3xl space-y-6">
            <Skeleton className="w-full h-12 rounded-2xl bg-violet-500/30" />
            <div className="space-y-3">
              <Skeleton className="w-full h-4 rounded-lg bg-default-200/20" />
              <Skeleton className="w-2/3 h-4 rounded-lg bg-default-200/20" />
            </div>
            <Skeleton className="w-full h-14 rounded-2xl bg-violet-500/20" />
          </Card>
        </div>
      </div>
    </div>
  );
};
