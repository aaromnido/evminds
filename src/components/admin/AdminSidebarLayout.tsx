import {
  LayoutDashboard,
  FilePenLine,
  Newspaper,
  LogOut,
  Plus,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";

interface NavItem {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
  ready: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard, ready: true },
  {
    title: "Artículos propios",
    href: "/admin/posts",
    icon: FilePenLine,
    ready: true,
  },
  { title: "Noticias", href: "/admin/noticias", icon: Newspaper, ready: false },
];

interface Props {
  userEmail: string;
  activePath: string;
  /** Page title shown in the top bar. */
  pageTitle: string;
  /** Optional subtitle under the title. */
  pageDescription?: string;
  /** Optional primary action rendered on the right of the top bar. */
  actionLabel?: string;
  actionHref?: string;
  children: React.ReactNode;
}

/**
 * Admin layout with a collapsible left sidebar (ADR-011). This is a hydrated
 * island (client:load): SidebarProvider holds the open/collapsed state. The
 * page content arrives as `children` from the Astro <slot> — server-rendered,
 * passed straight through; only the sidebar chrome hydrates.
 */
export default function AdminSidebarLayout({
  userEmail,
  activePath,
  pageTitle,
  pageDescription,
  actionLabel,
  actionHref,
  children,
}: Props) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-3 py-8">
          <a href="/admin" className="flex items-center">
            <img
              src="/logo.svg"
              alt="evminds"
              className="h-6 w-auto"
              width={617}
              height={102}
            />
          </a>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Contenido</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {NAV_ITEMS.map((item) => {
                  const active =
                    item.href === "/admin"
                      ? activePath === "/admin"
                      : activePath.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      {item.ready ? (
                        <SidebarMenuButton
                          render={<a href={item.href} />}
                          isActive={active}
                          // Darker tint than the default sidebar-accent so the
                          // active item reads clearly. Must use the SAME `data-active:`
                          // variant the component uses, so tailwind-merge replaces its
                          // bg-sidebar-accent instead of leaving both rules.
                          className="data-active:bg-foreground/10"
                          tooltip={item.title}
                        >
                          <item.icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton
                          disabled
                          tooltip={`${item.title} · próximamente`}
                          className="cursor-not-allowed opacity-60"
                        >
                          <item.icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-2">
          {userEmail && (
            <span className="truncate px-2 text-xs text-muted-foreground">
              {userEmail}
            </span>
          )}
          <form method="POST" action="/admin/logout">
            <SidebarMenuButton
              render={<button type="submit" />}
              tooltip="Cerrar sesión"
            >
              <LogOut />
              <span>Salir</span>
            </SidebarMenuButton>
          </form>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex items-center gap-3 border-b border-border px-4 py-6">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex flex-1 items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold leading-tight tracking-tight">
                {pageTitle}
              </h1>
              {pageDescription && (
                <p className="truncate text-xs text-muted-foreground">
                  {pageDescription}
                </p>
              )}
            </div>
            {actionLabel && actionHref && (
              <a
                href={actionHref}
                className={buttonVariants({ size: "lg", className: "shrink-0" })}
              >
                <Plus />
                {actionLabel}
              </a>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
