"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function PrActions({
  orgId,
  orgSlug,
  prId,
  status,
}: {
  orgId: string;
  orgSlug: string;
  prId: string;
  status: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function review(state: "approved" | "changes_requested" | "commented") {
    setLoading(true);
    await fetch(`/api/v1/organizations/${orgId}/pull-requests/${prId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, body }),
    });
    setLoading(false);
    router.refresh();
  }

  async function merge() {
    setLoading(true);
    await fetch(`/api/v1/organizations/${orgId}/pull-requests/${prId}/merge`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  async function close() {
    setLoading(true);
    await fetch(`/api/v1/organizations/${orgId}/pull-requests/${prId}/close`, { method: "POST" });
    setLoading(false);
    router.push(`/${orgSlug}/approvals`);
  }

  async function openPr() {
    setLoading(true);
    await fetch(`/api/v1/organizations/${orgId}/pull-requests/${prId}/open`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  const canReview = status === "open" || status === "changes_requested";
  const canMerge = status === "approved";

  return (
    <div className="space-y-4">
      <Textarea placeholder="Review comment (optional)" value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        {status === "draft" && (
          <Button onClick={openPr} disabled={loading}>Submit for review</Button>
        )}
        {canReview && (
          <>
            <Button onClick={() => review("approved")} disabled={loading}>Approve</Button>
            <Button variant="secondary" onClick={() => review("changes_requested")} disabled={loading}>
              Request changes
            </Button>
            <Button variant="outline" onClick={() => review("commented")} disabled={loading}>
              Comment
            </Button>
          </>
        )}
        {canMerge && (
          <Button onClick={merge} disabled={loading}>Merge to main</Button>
        )}
        {status !== "merged" && status !== "closed" && (
          <Button variant="destructive" onClick={close} disabled={loading}>Close</Button>
        )}
      </div>
    </div>
  );
}
