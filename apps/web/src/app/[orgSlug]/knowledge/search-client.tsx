"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export function KnowledgeSearch({ orgSlug, defaultQ }: { orgSlug: string; defaultQ?: string }) {
  const router = useRouter();
  return (
    <Input
      placeholder="Search knowledge…"
      defaultValue={defaultQ}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          const q = (e.target as HTMLInputElement).value;
          router.push(`/${orgSlug}/knowledge${q ? `?q=${encodeURIComponent(q)}` : ""}`);
        }
      }}
    />
  );
}
