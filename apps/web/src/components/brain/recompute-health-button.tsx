"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RecomputeHealthButton({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function recompute() {
    setLoading(true);
    await fetch(`/api/v1/organizations/${orgId}/health`, { method: "POST" });
    router.refresh();
    setLoading(false);
  }

  return (
    <Button variant="outline" onClick={recompute} disabled={loading}>
      {loading ? "Recomputing…" : "Recompute scores"}
    </Button>
  );
}
