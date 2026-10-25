import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { NotificationBell } from "@/components/navigation/NotificationBell";

/** One application frame for authenticated pages; individual pages own their domain content. */
export function AppShell({ children }: { children: ReactNode }) {
  return <div className="app-shell min-h-screen bg-[var(--background)] text-[var(--foreground)]">{children}</div>;
}

/** Shared dashboard frame used by every role so page structure stays predictable. */
export function DashboardLayout({
  eyebrow,
  title,
  subtitle,
  brand = false,
  notificationCount,
  action,
  children,
  contentWidth = "max-w-5xl",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  brand?: boolean;
  notificationCount?: number | null;
  action?: ReactNode;
  children: ReactNode;
  contentWidth?: "max-w-3xl" | "max-w-5xl";
}) {
  return (
    <main className="dashboard-page min-h-screen bg-[var(--background)] pb-28 text-slate-800">
      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} brand={brand} notificationCount={notificationCount} action={action} />
      <div className={`dashboard-content mx-auto w-full ${contentWidth} space-y-5 px-4 py-5`}>
        {children}
      </div>
    </main>
  );
}

/** Shared role and identity introduction at the top of dashboards. */
export function DashboardIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="dashboard-intro rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-900 p-5 text-white shadow-[0_10px_24px_rgba(5,115,70,.14)]">
      <p className="type-eyebrow text-emerald-100">{eyebrow}</p>
      <h2 className="type-dashboard-title mt-1 break-words">{title}</h2>
      <p className="type-secondary mt-1 text-emerald-100">{description}</p>
    </section>
  );
}

/** Shared title/header geometry for list, detail, and form pages. */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  backHref,
  action,
  notificationCount,
  brand,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  backHref?: string;
  action?: ReactNode;
  notificationCount?: number | null;
  brand?: boolean;
}) {
  return (
    <header className="app-page-header sticky top-0 z-30 border-b border-[var(--border)] bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex min-h-11 max-w-5xl items-center gap-3">
        {backHref && <Link href={backHref} aria-label="Kembali" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-emerald-600"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="m15 18-6-6 6-6" /></svg></Link>}
        {brand && <Image src="/rw16-nuansa-indah.png" alt="Logo RW 16" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />}
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="type-eyebrow break-words text-slate-500">{eyebrow}</p>}
          <h1 className="type-page-title break-words text-slate-900">{title}</h1>
          {subtitle && <p className="type-secondary break-words text-slate-500">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
        <NotificationBell countOverride={notificationCount} />
      </div>
    </header>
  );
}
