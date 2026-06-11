import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Logout control: a shadcn Button (white) with a Lucide icon, wrapping a native
 * POST form to /admin/logout. Rendered statically by AdminShell — no hydration
 * needed; the form submit is native. The Button auto-sizes the leading icon.
 */
export default function LogoutButton() {
  return (
    <form method="POST" action="/admin/logout">
      <Button
        type="submit"
        variant="outline"
        size="sm"
        className="bg-white hover:bg-muted"
      >
        <LogOut />
        Salir
      </Button>
    </form>
  );
}
