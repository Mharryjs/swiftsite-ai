import { redirect } from "next/navigation";

// All owner controls now live behind the dashboard PIN.
export default function SettingsPage() {
  redirect("/dashboard");
}
