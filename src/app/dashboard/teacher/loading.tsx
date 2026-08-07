import { Skeleton, SkeletonStatCards, SkeletonTable } from '@/components/skeleton';

export default function TeacherLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <SkeletonStatCards count={4} />
      <SkeletonTable rows={5} cols={3} />
    </div>
  );
}
