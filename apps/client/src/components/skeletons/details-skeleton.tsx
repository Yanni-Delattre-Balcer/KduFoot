import { Skeleton } from "@heroui/skeleton";
import { Card, CardBody } from "@heroui/card";

export const SessionDetailsSkeleton = () => {
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-pulse-gentle pt-8">
      <div className="flex justify-between items-start">
        <div className="space-y-3">
          <Skeleton className="w-64 h-10 rounded-lg bg-default-200/50" />
          <div className="flex gap-2">
            <Skeleton className="w-20 h-6 rounded-full bg-primary/20" />
            <Skeleton className="w-16 h-6 rounded-full bg-default-200/30" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="w-24 h-10 rounded-xl bg-secondary/10" />
          <Skeleton className="w-20 h-10 rounded-xl bg-default-100/30" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Skeleton className="w-48 h-6 rounded-lg bg-default-200/40" />
          {[1, 2, 3].map((i) => (
            <Card key={i} className="w-full">
              <CardBody className="flex flex-row gap-4 p-4">
                <Skeleton className="min-w-[80px] h-20 rounded-lg bg-primary/10" />
                <div className="flex flex-col grow justify-center space-y-2">
                  <Skeleton className="w-1/2 h-5 rounded-lg bg-default-200/40" />
                  <Skeleton className="w-full h-4 rounded-lg bg-default-200/20" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
        <div className="space-y-6">
          <Card className="p-4 space-y-4 bg-default-100/5 border border-white/5 rounded-2xl">
            <Skeleton className="w-full h-8 rounded-lg bg-default-200/30" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex justify-between py-1 border-b border-default-100"
                >
                  <Skeleton className="w-16 h-4 rounded-lg bg-default-200/20" />
                  <Skeleton className="w-20 h-4 rounded-lg bg-default-200/40" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export const ExerciseDetailsSkeleton = () => {
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-pulse-gentle pt-8">
      <div className="flex justify-between items-start">
        <div className="space-y-3">
          <Skeleton className="w-80 h-10 rounded-lg bg-default-200/50" />
          <div className="flex gap-2">
            <Skeleton className="w-24 h-6 rounded-full bg-primary/20" />
            <Skeleton className="w-24 h-6 rounded-full bg-secondary/20" />
            <Skeleton className="w-16 h-6 rounded-full bg-default-200/30" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="w-24 h-10 rounded-xl bg-secondary/10" />
          <Skeleton className="w-20 h-10 rounded-xl bg-default-100/30" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="min-h-[300px] bg-default-100/20">
          <Skeleton className="w-full h-full rounded-2xl bg-default-200/10" />
        </Card>
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <Card
              key={i}
              className="p-4 bg-default-100/5 border border-white/5 rounded-2xl space-y-4"
            >
              <Skeleton className="w-32 h-6 rounded-lg bg-default-200/40" />
              <div className="space-y-2">
                <Skeleton className="w-full h-4 rounded-lg bg-default-200/20" />
                <Skeleton className="w-3/4 h-4 rounded-lg bg-default-200/20" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
