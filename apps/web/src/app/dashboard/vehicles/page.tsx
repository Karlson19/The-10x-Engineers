import type { Metadata } from "next";
import { VehicleManager } from "@/components/vehicles/vehicle-manager";

export const metadata: Metadata = {
  title: "My vehicles",
};

export default function VehiclesPage() {
  return <VehicleManager />;
}
