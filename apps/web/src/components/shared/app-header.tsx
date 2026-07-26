import { AccountNav } from "@/components/shared/account-nav";
import { HeaderShell } from "@/components/shared/header-shell";

/** Signed-in pages. Only used inside AppProviders, where the session exists. */
export function AppHeader() {
  return <HeaderShell actions={<AccountNav />} />;
}
