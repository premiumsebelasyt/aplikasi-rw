import Link from "next/link";
import type { ReactNode } from "react";

export type AppIconName = "home" | "file" | "users" | "wallet" | "inbox" | "building" | "settings" | "bell" | "plus" | "family" | "chart" | "user" | "search" | "arrow";
export type AppIconTone = "green" | "blue" | "violet" | "amber" | "rose" | "cyan";

const iconPaths: Record<AppIconName, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  wallet: <><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H21v16H5.5A2.5 2.5 0 0 1 3 17.5zM3 7h18"/><path d="M16 13h5M17 13h.01"/></>,
  inbox: <><path d="M4 4h16v16H4zM4 13h4l2 3h4l2-3h4"/><path d="M12 8v4m-2-2 2 2 2-2"/></>,
  building: <><path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01M10 21v-4h4v4"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.4-2.4 1.4-1.1A7 7 0 0 1 7.5 14l-1.8-.3v-2.8l1.8-.3a7 7 0 0 1 .4-1.7L6.5 7.5l1.4-2.4 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 .4 1.7l1.8.3v2.8l-1.8.3a7 7 0 0 1-.4 1.7Z"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  family: <><path d="M3 20v-1a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v1"/><circle cx="8" cy="8" r="3"/><path d="M14 11a3 3 0 1 0 0-6M16 15h1a4 4 0 0 1 4 4v1"/></>,
  chart: <><path d="M4 19V5m0 14h17"/><path d="m7 15 4-4 3 2 5-7"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
};

const toneClasses: Record<AppIconTone, string> = {
  green: "bg-emerald-50 text-emerald-700",
  blue: "bg-sky-50 text-sky-700",
  violet: "bg-violet-50 text-violet-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  cyan: "bg-cyan-50 text-cyan-700",
};

export function AppIcon({ name, className = "h-5 w-5" }: { name: AppIconName; className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>{iconPaths[name]}</svg>;
}

export function IconTile({ name, tone = "green", className = "" }: { name: AppIconName; tone?: AppIconTone; className?: string }) {
  return <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${toneClasses[tone]} ${className}`}><AppIcon name={name} /></span>;
}

export function StatCard({ label, value, icon, tone = "green" }: { label: string; value: string | number; icon: AppIconName; tone?: AppIconTone }) {
  return <div className="flex min-h-[80px] items-center gap-3 rounded-2xl border border-[var(--border)] bg-white p-3.5 shadow-[0_2px_10px_rgba(16,77,50,.04)]">
    <IconTile name={icon} tone={tone} className="h-10 w-10 rounded-xl" />
    <div className="min-w-0"><p className="truncate text-[11px] leading-4 text-slate-500">{label}</p><p className="mt-0.5 text-lg font-bold leading-6 text-slate-900">{value}</p></div>
  </div>;
}

export function MenuCard({ title, description, href, icon, tone = "green", badge }: { title: string; description: string; href: string; icon: AppIconName; tone?: AppIconTone; badge?: string }) {
  return <Link href={href} className="flex min-h-[82px] items-center gap-3 rounded-2xl border border-[var(--border)] bg-white p-3 shadow-[0_2px_10px_rgba(16,77,50,.035)] transition active:scale-[.98]">
    <IconTile name={icon} tone={tone} className="h-10 w-10 rounded-xl" />
    <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5 text-[13px] font-semibold leading-4 text-slate-900"><span className="truncate">{title}</span>{badge && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{badge}</span>}</span><span className="mt-1 block text-[10px] leading-4 text-slate-500">{description}</span></span>
    <AppIcon name="arrow" className="h-4 w-4 shrink-0 rotate-[-45deg] text-slate-400" />
  </Link>;
}

export function SectionHeading({ title, action, href }: { title: string; action?: string; href?: string }) {
  return <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-base font-bold text-slate-900">{title}</h2>{action && href && <Link href={href} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-emerald-700">{action}<AppIcon name="arrow" className="h-3.5 w-3.5" /></Link>}</div>;
}
