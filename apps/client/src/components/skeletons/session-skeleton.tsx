import { Skeleton } from "@heroui/skeleton";
import { Card } from "@heroui/card";

export const SessionSkeleton = () => {
  return (
    <Card className="w-full h-[120px] p-4 flex flex-row gap-4 items-center bg-default-100/50 border border-white/5 rounded-2xl">
      <Skeleton className="w-12 h-12 rounded-xl" />
      <div className="flex-1 space-y-3">
        <div className="flex justify-between">
          <Skeleton className="w-1/3 h-5 rounded-lg" />
          <Skeleton className="w-1/4 h-4 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="w-20 h-4 rounded-lg" />
          <Skeleton className="w-24 h-4 rounded-lg" />
        </div>
      </div>
    </Card>
  );
};

export const SessionListSkeleton = () => {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <SessionSkeleton key={i} />
      ))}
    </div>
  );
};
