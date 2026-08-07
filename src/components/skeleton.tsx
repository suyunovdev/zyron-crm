// Professional shimmer-effektli skeleton komponentlar.
// .skeleton klassi globals.css'da (shimmer + dark-mode mos).

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

// Kartochka ustuni (stat/summary) skeletoni
export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

// Jadval skeletoni — sarlavha + qatorlar (avatar, matn, badge)
export function SkeletonTable({
  rows = 8,
  cols = 4,
  header = true,
  avatar = true,
}: { rows?: number; cols?: number; header?: boolean; avatar?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {header && (
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-6">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className={`h-3 ${i === 0 ? 'w-32 flex-1' : 'w-16'}`} />
          ))}
        </div>
      )}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-5 py-3.5">
            {avatar && <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-2.5 w-24" />
            </div>
            {Array.from({ length: Math.max(0, cols - 2) }).map((_, c) => (
              <Skeleton key={c} className="h-3.5 w-16 hidden sm:block" />
            ))}
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Kartochka to'ri skeletoni (guruh/o'qituvchi kartochkalari)
export function SkeletonCards({ count = 6, cols = 3 }: { count?: number; cols?: number }) {
  const colCls = cols === 4
    ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
    : cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3';
  return (
    <div className={`grid grid-cols-1 ${colCls} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-11 h-11 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          </div>
          <Skeleton className="h-2.5 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Detal sahifa (profil) header skeletoni
export function SkeletonDetailHeader() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
      <div className="flex items-start gap-4">
        <Skeleton className="w-16 h-16 rounded-2xl flex-shrink-0" />
        <div className="flex-1 space-y-2.5 pt-1">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-3 w-44" />
        </div>
      </div>
    </div>
  );
}

// To'liq detal sahifa skeletoni (header + statlar + kontent)
export function SkeletonDetailPage() {
  return (
    <div>
      <Skeleton className="h-4 w-24 mb-4" />
      <SkeletonDetailHeader />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <Skeleton className="h-2.5 w-20 mb-2" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>
      <SkeletonCards count={3} />
    </div>
  );
}
