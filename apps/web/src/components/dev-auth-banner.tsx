export function DevAuthBanner() {
  if (process.env.DISABLE_AUTH !== "true" || process.env.NODE_ENV === "production") {
    return null;
  }
  return (
    <div className="bg-amber-500 text-amber-950 text-center text-sm py-1.5 px-4 font-medium">
      Dev mode: authentication disabled (DISABLE_AUTH=true)
    </div>
  );
}
