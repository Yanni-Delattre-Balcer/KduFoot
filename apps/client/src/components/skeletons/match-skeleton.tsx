import { Skeleton } from "@heroui/skeleton";
import { Card } from "@heroui/card";

export const MatchSkeleton = () => {
  return (
    <Card className="w-full h-auto p-5 space-y-4 bg-[#232120]/60 backdrop-blur-md border border-white/10 rounded-3xl shadow-xl overflow-hidden relative">
      {/* Premium Shimmer Overlay (Implicit in HeroUI Skeleton, but we enhance the card) */}
      <div className="flex justify-between items-center relative z-10">
        <Skeleton className="w-24 h-6 rounded-xl bg-default-200/50" />
        <Skeleton className="w-16 h-6 rounded-xl bg-default-200/50" />
      </div>
      
      <div className="flex gap-4 items-center relative z-10">
        <Skeleton className="w-14 h-14 rounded-2xl bg-default-300/30" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-3/4 h-6 rounded-lg bg-default-200/50" />
          <Skeleton className="w-1/2 h-4 rounded-lg bg-default-200/40" />
        </div>
      </div>

      <div className="pt-2 flex gap-3 relative z-10">
        <Skeleton className="w-24 h-9 rounded-2xl bg-violet-500/10" />
        <Skeleton className="w-24 h-9 rounded-2xl bg-default-200/30" />
        <Skeleton className="w-24 h-9 rounded-2xl bg-default-200/30" />
      </div>

      {/* Subtle background glow for premium feel */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-violet-600/10 blur-3xl rounded-full pointer-events-none" />
    </Card>
  );
};

export const MatchListSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <MatchSkeleton key={i} />
      ))}
    </div>
  );
};
