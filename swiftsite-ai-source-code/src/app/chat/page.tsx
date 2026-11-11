import type { Metadata } from "next";
import { Suspense } from "react";
import { Chat } from "@/components/assistant/Chat";
import { publicSettings } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "SwiftSite Assistant — Chat",
  description: "Talk, build websites, share files, and use helpful tools in your private SwiftSite workspace.",
};
export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const settings = await publicSettings();
  return (
    <Suspense fallback={null}>
      <Chat initialSettings={settings} />
    </Suspense>
  );
}
