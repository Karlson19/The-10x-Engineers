"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Wrench, Zap, ClipboardList } from "lucide-react";
import { useAuth } from "@/lib/store";
import { Card } from "@/components/ui/primitives";
import type { Role } from "@/lib/types";
import { Suspense } from "react";

const ROLE_HOME: Record<Role, string> = {
  CLIENT: "/dashboard",
  STAFF: "/queue",
  MANAGEMENT: "/overview",
};

const OPTIONS: {
  role: Role;
  title: string;
  body: string;
  icon: typeof Wrench;
  tone: string;
}[] = [
  {
    role: "CLIENT",
    title: "I need my car looked at",
    body: "Book a request, track status, and manage your vehicles.",
    icon: Wrench,
    tone: "border-client/30 hover:border-client bg-client-soft/40",
  },
  {
    role: "STAFF",
    title: "I'm a technician",
    body: "View your section's job queue and log parts & labour.",
    icon: Zap,
    tone: "border-staff/30 hover:border-staff bg-staff-soft/40",
  },
  {
    role: "MANAGEMENT",
    title: "I run Chrysmec",
    body: "See everything — bookings, jobs, stock, and analytics.",
    icon: ClipboardList,
    tone: "border-mgmt/30 hover:border-mgmt bg-mgmt-soft/40",
  },
];

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const login = useAuth((s) => s.login);

  function pick(role: Role) {
    login(role);
    const next = search.get("next");
    router.push(next ?? ROLE_HOME[role]);
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="font-display text-xl font-black uppercase tracking-tight text-paper">
          Chrysmec <span className="text-staff">Auto Center</span>
        </div>
        <p className="mt-2 text-sm text-paper/60">
          Demo sign-in — pick the role you want to explore. A real deployment
          uses email + password with JWT issuance (ADR-004).
        </p>
      </div>

      <div className="space-y-3">
        {OPTIONS.map(({ role, title, body, icon: Icon, tone }) => (
          <button key={role} onClick={() => pick(role)} className="block w-full text-left">
            <Card className={`flex items-center gap-4 border-2 p-4 transition-colors ${tone}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
                <Icon size={18} className="text-ink" />
              </div>
              <div>
                <div className="font-semibold text-ink">{title}</div>
                <div className="text-sm text-ink-soft">{body}</div>
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
