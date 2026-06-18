export function DevAuthBanner() {
  if (process.env.DISABLE_AUTH !== "true") return null;
  const inProd = process.env.NODE_ENV === "production";
  return (
    <div className="bg-amber-500 text-amber-950 text-center text-sm py-1.5 px-4 font-medium">
      {inProd
        ? "Warning: authentication disabled in production (DISABLE_AUTH=true)"
        : "Dev mode: authentication disabled (DISABLE_AUTH=true)"}
    </div>
  );
}
