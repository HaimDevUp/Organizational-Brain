"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function NewKnowledgePage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const me = await fetch("/api/v1/auth/me").then((r) => r.json());
    const org = me.organizations?.find((o: { slug: string }) => o.slug === orgSlug);
    if (!org) return;
    const res = await fetch(`/api/v1/organizations/${org.id}/knowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    setLoading(false);
    if (res.ok) {
      const doc = await res.json();
      router.push(`/${orgSlug}/knowledge/${doc.id}`);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">New document</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="content">Content (Markdown)</Label>
          <Textarea id="content" rows={12} value={content} onChange={(e) => setContent(e.target.value)} required />
        </div>
        <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Create"}</Button>
      </form>
    </div>
  );
}
