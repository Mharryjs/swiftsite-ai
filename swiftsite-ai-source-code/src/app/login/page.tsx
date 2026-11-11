import { redirect } from "next/navigation";

// Old sign-in bookmarks now open the no-email assistant.
export default function LoginPage() {
  redirect("/chat");
}
