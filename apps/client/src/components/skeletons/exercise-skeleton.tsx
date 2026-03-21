import { Skeleton } from "@heroui/skeleton";
import { Card } from "@heroui/card";

export const ExerciseSkeleton = () => {
  return (
    <Card className="w-full h-[240px] overflow-hidden bg-default-100/50 border border-white/5 rounded-2xl">
      <Skeleton className="w-full h-[140px]" />
      <div className="p-3 space-y-2">
        <Skeleton className="w-3/4 h-5 rounded-lg" />
        <Skeleton className="w-1/2 h-4 rounded-lg" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="w-12 h-6 rounded-full" />
          <Skeleton className="w-12 h-6 rounded-full" />
        </div>
      </div>
    </Card>
  );
};

export const ExerciseListSkeleton = () => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
        <ExerciseSkeleton key={i} />
      ))}
    </div>
  );
};
