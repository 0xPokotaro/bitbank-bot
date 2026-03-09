"use client";

import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  {
    group: "概要",
    items: [
      {
        label: "ダッシュボード",
        href: "/",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
        ),
      },
    ],
  },
  {
    group: "分析",
    items: [
      {
        label: "KPI",
        href: "/",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        ),
      },
    ],
  },
];

export function AppSidebar() {
  return (
    <Sidebar className="border-r border-[#2c3235]">
      {/* Logo — h-9 を layout.tsx の header と揃える */}
      <SidebarHeader className="h-9 flex-row items-center gap-2 px-3 py-0 border-b border-[#2c3235] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-sm bg-orange-500 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-zinc-100 tracking-tight">bitbank Bot</span>
        </div>
      </SidebarHeader>

      {/* Nav */}
      <SidebarContent className="px-2 py-3">
        {navItems.map((section) => (
          <SidebarGroup key={section.group} className="mb-1 p-0">
            <SidebarGroupLabel className="px-2 mb-1 text-[10px] uppercase tracking-widest text-zinc-600">
              {section.group}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      asChild
                      className="h-8 rounded-none px-2 text-sm text-zinc-500 hover:bg-[#1c2025] hover:text-zinc-200 data-[active]:bg-[#1c2025] data-[active]:text-orange-400 data-[active]:border-l-2 data-[active]:border-orange-500 data-[active]:pl-[6px]"
                    >
                      <Link href={item.href} className="flex items-center gap-2">
                        <span className="text-zinc-600">{item.icon}</span>
                        {item.label}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-[#2c3235] px-3 py-2.5">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" />
            <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
          </svg>
          <span>Admin</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
