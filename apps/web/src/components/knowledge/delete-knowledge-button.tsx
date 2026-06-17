"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeleteKnowledgeButton({
  orgId,
  orgSlug,
  docId,
  title,
}: {
  orgId: string;
  orgSlug: string;
  docId: string;
  title: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${title}"?\n\nThe document will be archived and removed from search and the knowledge graph.`
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    const res = await fetch(`/api/v1/organizations/${orgId}/knowledge/${docId}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(typeof data.detail === "string" ? data.detail : "Failed to delete document");
      return;
    }

    router.push(`/${orgSlug}/knowledge`);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
        {loading ? "Deleting…" : "Delete"}
      </Button>
      {error && (
        <p className="text-xs text-destructive max-w-[12rem] text-right" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
