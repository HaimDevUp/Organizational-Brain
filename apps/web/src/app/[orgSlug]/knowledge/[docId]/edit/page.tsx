"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function EditKnowledgePage() {
  const { orgSlug, docId } = useParams<{ orgSlug: string; docId: string }>();
  const router = useRouter();
  const [orgId, setOrgId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((r) => r.json())
      .then((me) => {
        const org = me.organizations?.find((o: { slug: string }) => o.slug === orgSlug);
        if (!org) return;
        setOrgId(org.id);
        const roleSlugs = (me.roles ?? [])
          .filter((r: { organizationId: string }) => r.organizationId === org.id)
          .map((r: { roleSlug: string }) => r.roleSlug);
        setCanDelete(roleSlugs.includes("admin") || roleSlugs.includes("knowledge_manager"));
        return Promise.all([
          fetch(`/api/v1/organizations/${org.id}/knowledge/${docId}`).then((r) => r.json()),
          fetch(`/api/v1/organizations/${org.id}/knowledge/${docId}/content`).then((r) => r.json()),
        ]);
      })
      .then((data) => {
        if (!data) return;
        const [doc, { content: c }] = data;
        setTitle(doc.title);
        setContent(c);
      });
  }, [orgSlug, docId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setLoading(true);
    const res = await fetch(`/api/v1/organizations/${orgId}/knowledge/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    setLoading(false);
    if (res.ok) router.push(`/${orgSlug}/knowledge/${docId}`);
  }

  async function submitForApproval() {
    if (!orgId) return;
    setLoading(true);
    const prRes = await fetch(`/api/v1/organizations/${orgId}/pull-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: docId, title: `Update: ${title}`, content }),
    });
    if (prRes.ok) {
      const pr = await prRes.json();
      await fetch(`/api/v1/organizations/${orgId}/pull-requests/${pr.id}/open`, { method: "POST" });
      router.push(`/${orgSlug}/approvals/${pr.id}`);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!orgId) return;
    const confirmed = window.confirm(
      `Delete "${title}"?\n\nThe document will be archived and removed from search and the knowledge graph.`
    );
    if (!confirmed) return;

    setLoading(true);
    const res = await fetch(`/api/v1/organizations/${orgId}/knowledge/${docId}`, {
      method: "DELETE",
    });
    setLoading(false);
    if (res.ok) {
      router.push(`/${orgSlug}/knowledge`);
      return;
    }
    const data = await res.json().catch(() => ({}));
    alert(typeof data.detail === "string" ? data.detail : "Failed to delete document");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Edit document</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="content">Content</Label>
          <Textarea id="content" rows={12} value={content} onChange={(e) => setContent(e.target.value)} required />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>Save draft</Button>
          <Button type="button" variant="secondary" onClick={submitForApproval} disabled={loading}>
            Submit for approval
          </Button>
          {canDelete && (
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
              Delete
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
