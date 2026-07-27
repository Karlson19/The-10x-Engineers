"use client";

import { useQuery } from "@tanstack/react-query";
import { Car } from "lucide-react";
import { fetchVehicles } from "@/lib/api";
import { useAuth } from "@/lib/store";
import { Card } from "@/components/ui/primitives";

export default function VehiclesPage() {
  const user = useAuth((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ["client", "vehicles", user?.id],
    queryFn: () => fetchVehicles(user!.id),
    enabled: !!user,
  });

  return (
    <div>
      <div className="label-eyebrow">Garage</div>
      <h1 className="mt-1 font-display text-2xl">My vehicles</h1>

      <div className="mt-5 space-y-3">
        {isLoading && <div className="h-20 animate-pulse rounded-card bg-paper-dim/60" />}
        {data?.map((v) => (
          <Card key={v.id} className="flex items-center gap-4 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-client-soft text-client">
              <Car size={20} />
            </div>
            <div>
              <div className="font-semibold text-ink">
                {v.make} {v.model} · {v.year}
              </div>
              <div className="font-mono text-xs text-ink-faint">{v.registrationNo}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
