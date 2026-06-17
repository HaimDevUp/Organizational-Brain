"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  GitPullRequest,
  LayoutDashboard,
  Settings,
  Users,
  Building2,
  Shield,
  Brain,
  AlertTriangle,
  Activity,
  Bot,
  GraduationCap,
  UserCheck,
  BarChart3,
  Sparkles,
  Network,
} from "lucide-react";

const nav = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/brain", label: "Organizational Brain", icon: Brain },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/graph", label: "Knowledge Graph", icon: Network },
  { href: "/knowledge/propose", label: "AI Propose", icon: Sparkles },
  { href: "/approvals", label: "Approvals", icon: GitPullRequest },
  { href: "/gaps", label: "Knowledge Gaps", icon: AlertTriangle },
  { href: "/health", label: "Health", icon: Activity },
  { href: "/contradictions", label: "Contradictions", icon: AlertTriangle },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/onboarding", label: "Onboarding", icon: GraduationCap },
  { href: "/experts", label: "Experts", icon: UserCheck },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin", label: "Admin", icon: Settings },
  { href: "/admin/monitoring", label: "Monitoring", icon: Activity },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/departments", label: "Departments", icon: Building2 },
  { href: "/admin/roles", label: "Roles", icon: Shield },
];

export function OrgSidebar({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();
  const base = `/${orgSlug}`;

  return (
    <aside className="w-56 border-r bg-card min-h-screen p-4">
      <div className="mb-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Organization</p>
        <p className="font-semibold truncate">{orgSlug}</p>
      </div>
      <nav className="space-y-1">
        {nav.map((item) => {
          const href = `${base}${item.href}`;
          const active =
            item.href === ""
              ? pathname === base
              : pathname.startsWith(href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
