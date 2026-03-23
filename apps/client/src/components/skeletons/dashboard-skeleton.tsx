import { Skeleton } from "@heroui/skeleton";
import { Card, CardBody } from "@heroui/card";

export const DashboardCardSkeleton = () => {
  return (
    <Card className="overflow-hidden border border-white/10 bg-zinc-900/60 rounded-2xl">
      <CardBody className="p-5 space-y-4">
        <div className="flex items-start gap-4">
          <Skeleton className="w-14 h-14 rounded-2xl bg-default-300/30 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-3/4 h-5 rounded-lg bg-default-200/50" />
            <Skeleton className="w-1/2 h-4 rounded-lg bg-default-200/40" />
          </div>
          <Skeleton className="w-20 h-7 rounded-full bg-default-200/30 shrink-0" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-14 rounded-xl bg-default-200/30" />
          <Skeleton className="h-14 rounded-xl bg-default-200/30" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="flex-1 h-10 rounded-xl bg-default-200/30" />
          <Skeleton className="flex-1 h-10 rounded-xl bg-default-200/30" />
        </div>
      </CardBody>
    </Card>
  );
};

export const DashboardListSkeleton = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <DashboardCardSkeleton key={i} />
      ))}
    </div>
  );
};
