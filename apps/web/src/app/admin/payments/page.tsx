import type { Metadata } from "next";
import { PaymentsLedger } from "@/components/admin/payments-ledger";

export const metadata: Metadata = {
  title: "Payments",
};

export default function AdminPaymentsPage() {
  return <PaymentsLedger />;
}
