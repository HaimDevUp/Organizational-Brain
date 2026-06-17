export default function BrainLoading() {
  return (
    <div className="animate-pulse space-y-4 max-w-3xl">
      <div className="h-8 bg-muted rounded w-1/3" />
      <div className="h-64 bg-muted rounded" />
      <div className="h-10 bg-muted rounded w-full" />
    </div>
  );
}
