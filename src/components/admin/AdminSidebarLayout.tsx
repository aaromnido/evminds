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
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
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
  { title: "Noticias", href: "/admin/noticias", icon: Newspaper, ready: true },
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
  /** Initial sidebar open state (read server-side from the sidebar_state
   * cookie) so the collapsed state survives View Transition re-hydration. */
  defaultOpen?: boolean;
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
  defaultOpen = true,
  children,
}: Props) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar>
        <SidebarHeader className="px-3 py-8">
          <a href="/admin" className="flex items-center justify-center">
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
                          // Active item uses the same background as the hover
                          // state (bg-sidebar-accent), which the base component
                          // already applies on both `hover:` and `data-active:`.
                          // py-3 = 12px (4px more than the base p-2).
                          className="py-3"
                          tooltip={item.title}
                        >
                          <item.icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton
                          disabled
                          tooltip={`${item.title} · próximamente`}
                          className="cursor-not-allowed py-3 opacity-60"
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
          <div className="flex flex-1 items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold leading-tight tracking-tight">
                {pageTitle}
              </h1>
              {pageDescription && (
                <p className="hidden truncate text-base text-muted-foreground sm:block">
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
        <main className="mx-auto w-full max-w-[1154px] flex-1 px-6 py-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
