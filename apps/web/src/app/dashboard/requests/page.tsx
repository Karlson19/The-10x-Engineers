import type { Metadata } from "next";
import { RequestList } from "@/components/requests/request-list";

export const metadata: Metadata = {
  title: "My requests",
};

export default function RequestsPage() {
  return <RequestList />;
}
