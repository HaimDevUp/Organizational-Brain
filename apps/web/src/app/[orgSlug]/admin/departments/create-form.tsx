"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateDepartmentForm({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/v1/organizations/${orgId}/departments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug }),
    });
    router.refresh();
    setName("");
    setSlug("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end flex-wrap border p-4 rounded-lg">
      <div>
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label>Slug</Label>
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} required />
      </div>
      <Button type="submit">Add department</Button>
    </form>
  );
}
