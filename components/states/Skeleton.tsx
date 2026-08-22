export function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-16/10 w-full bg-white/10" />
      <div className="mx-auto max-w-170 space-y-3 px-4 py-8">
        <div className="h-6 w-2/3 rounded bg-black/10" />
        <div className="h-4 w-1/3 rounded bg-black/10" />
        <div className="h-4 w-full rounded bg-black/10" />
        <div className="h-4 w-5/6 rounded bg-black/10" />
      </div>
    </div>
  );
}
