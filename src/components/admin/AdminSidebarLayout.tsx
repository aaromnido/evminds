import { LayoutDashboard, FilePenLine, Newspaper, LogOut } from "lucide-react";
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
    ready: false,
  },
  { title: "Noticias", href: "/admin/noticias", icon: Newspaper, ready: false },
];

interface Props {
  userEmail: string;
  activePath: string;
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
  children,
}: Props) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-3 py-3">
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
                {NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    {item.ready ? (
                      <SidebarMenuButton
                        render={<a href={item.href} />}
                        isActive={activePath === item.href}
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
                ))}
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
        <header className="flex h-14 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger />
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
