import type { Metadata } from "next";
import { AccountPanel } from "@/components/auth/account-panel";

export const metadata: Metadata = {
  title: "My account",
};

export default function AccountPage() {
  return <AccountPanel />;
}
