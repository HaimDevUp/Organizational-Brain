export default function KnowledgeLoading() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-8 bg-muted rounded w-1/4" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-16 bg-muted rounded" />
      ))}
    </div>
  );
}
