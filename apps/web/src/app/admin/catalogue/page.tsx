import type { Metadata } from "next";
import { CatalogueManager } from "@/components/admin/catalogue-manager";

export const metadata: Metadata = {
  title: "Service catalogue",
};

export default function AdminCataloguePage() {
  return <CatalogueManager />;
}
