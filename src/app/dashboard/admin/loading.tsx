import { Skeleton, SkeletonStatCards, SkeletonTable } from '@/components/skeleton';

export default function AdminLoading() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-36" />
      </div>
      <SkeletonStatCards count={4} />
      <SkeletonTable rows={6} cols={4} />
    </div>
  );
}
