import { Skeleton } from "@heroui/skeleton";
import { Card } from "@heroui/card";

export const MatchSkeleton = () => {
  return (
    <Card className="w-full h-[180px] p-4 space-y-3 bg-default-100/50 border border-white/5 rounded-2xl">
      <div className="flex justify-between items-center">
        <Skeleton className="w-24 h-6 rounded-lg" />
        <Skeleton className="w-16 h-6 rounded-lg" />
      </div>
      <div className="flex gap-4 items-center">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-3/4 h-5 rounded-lg" />
          <Skeleton className="w-1/2 h-4 rounded-lg" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="w-20 h-8 rounded-full" />
        <Skeleton className="w-20 h-8 rounded-full" />
        <Skeleton className="w-20 h-8 rounded-full" />
      </div>
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
