import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LoginFormProps {
  errorMsg?: string;
}

/**
 * Login card built with shadcn components (ADR-010). Rendered statically by
 * login.astro — the <form> submits natively (method=POST) to the same route,
 * which handles auth server-side, so this needs no client-side JS.
 */
export default function LoginForm({ errorMsg }: LoginFormProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>evminds admin</CardTitle>
        <CardDescription>Accede para gestionar el contenido.</CardDescription>
      </CardHeader>
      <CardContent>
        <form method="POST" className="flex flex-col gap-4">
          {errorMsg ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {errorMsg}
            </p>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          <Button type="submit" size="lg" className="mt-1 w-full">
            Acceder
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
