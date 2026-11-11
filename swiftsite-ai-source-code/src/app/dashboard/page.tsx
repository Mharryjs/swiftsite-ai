import type { Metadata } from "next";
import { adminIsConfigured, hasAdminSession } from "@/lib/admin-auth";
import { Dashboard } from "./Dashboard";
import { AdminUnlock } from "./AdminUnlock";

export const metadata: Metadata = { title: "Owner dashboard — SwiftSite", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!(await hasAdminSession())) return <AdminUnlock configured={adminIsConfigured()} />;
  return <Dashboard />;
}
