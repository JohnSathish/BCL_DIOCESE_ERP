'use client';

import * as React from 'react';
import { cn } from '../lib/cn';
import { EmptyState } from './card';

export interface NavItem {
  href?: string;
  label: string;
  icon?: React.ReactNode;
  children?: NavItem[];
  /** Uppercase section accordion (DIOCESE, SACRAMENTS, …) */
  section?: boolean;
  /** Optional RBAC permission keys — filtered by host app before pass-in */
  permissions?: string[];
  roles?: string[];
}

function isActiveHref(activeHref: string | undefined, href: string | undefined) {
  if (!activeHref || !href) return false;
  if (href === '/diocese') return activeHref === '/diocese';
  return activeHref === href || activeHref.startsWith(href + '/');
}

function useCollapsedMode() {
  const [collapsed, setCollapsed] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    const apply = () => setCollapsed(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return collapsed;
}

function NavLink({
  item,
  activeHref,
  onNavigate,
  collapsed,
}: {
  item: NavItem;
  activeHref?: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const href = item.href || '#';
  const active = isActiveHref(activeHref, item.href);
  return (
    <a
      href={href}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className={cn(
        'bcl-sidebar__nav-item group relative flex h-10 items-center rounded-lg text-[13px] font-medium transition-colors duration-150',
        collapsed ? 'justify-center px-2' : 'gap-2.5 px-3',
        active
          ? 'is-active font-semibold text-[var(--bcl-nav-active)]'
          : 'text-[var(--bcl-sidebar-text)] hover:bg-[var(--bcl-nav-hover)]',
      )}
    >
      {active ? (
        <span
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full bg-[var(--bcl-nav-accent)]',
            collapsed ? 'h-6 w-[3px]' : 'h-6 w-[3px]',
          )}
          aria-hidden
        />
      ) : null}
      <span
        className={cn(
          'flex h-[18px] w-[18px] shrink-0 items-center justify-center [&>svg]:h-[18px] [&>svg]:w-[18px] [&>svg]:stroke-[1.75]',
          active
            ? 'text-[var(--bcl-nav-active)]'
            : 'text-[var(--bcl-sidebar-muted)] group-hover:text-[var(--bcl-sidebar-text)]',
        )}
      >
        {item.icon}
      </span>
      {!collapsed ? <span className="truncate tracking-tight">{item.label}</span> : null}
    </a>
  );
}

function NavGroup({
  item,
  activeHref,
  onNavigate,
  collapsed,
}: {
  item: NavItem;
  activeHref?: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const childActive = item.children?.some(
    (c) =>
      isActiveHref(activeHref, c.href) ||
      c.children?.some((gc) => isActiveHref(activeHref, gc.href)),
  );
  const [open, setOpen] = React.useState(Boolean(childActive || item.section));

  React.useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  const isSection = Boolean(item.section);

  if (collapsed) {
    return (
      <div className="space-y-0.5">
        {item.children?.map((child) =>
          child.children?.length ? (
            <NavGroup
              key={`${child.label}:${child.href || 'group'}`}
              item={child}
              activeHref={activeHref}
              onNavigate={onNavigate}
              collapsed
            />
          ) : (
            <NavLink
              key={`${child.label}:${child.href || 'link'}`}
              item={child}
              activeHref={activeHref}
              onNavigate={onNavigate}
              collapsed
            />
          ),
        )}
      </div>
    );
  }

  return (
    <div className={cn(isSection ? 'mt-3 first:mt-0' : 'space-y-0.5')}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg text-left transition-colors duration-150',
          isSection
            ? 'px-3 py-1.5'
            : cn(
                'h-10 gap-2.5 px-3 text-[13px] font-medium',
                childActive
                  ? 'text-[var(--bcl-nav-active)]'
                  : 'text-[var(--bcl-sidebar-text)] hover:bg-[var(--bcl-nav-hover)]',
              ),
        )}
        aria-expanded={open}
      >
        {!isSection && item.icon ? (
          <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-[var(--bcl-sidebar-muted)] [&>svg]:h-[18px] [&>svg]:w-[18px]">
            {item.icon}
          </span>
        ) : null}
        <span
          className={cn(
            'flex-1 truncate',
            isSection
              ? 'bcl-sidebar__section-label text-[10px] font-semibold uppercase tracking-[0.12em]'
              : 'font-medium',
          )}
        >
          {item.label}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-[var(--bcl-sidebar-muted)] transition-transform duration-200',
            open && 'rotate-180',
          )}
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-0.5 space-y-0.5">
            {item.children?.map((child) =>
              child.children?.length ? (
                <NavGroup
                  key={`${child.label}:${child.href || 'group'}`}
                  item={child}
                  activeHref={activeHref}
                  onNavigate={onNavigate}
                />
              ) : (
                <NavLink
                  key={`${child.label}:${child.href || 'link'}`}
                  item={child}
                  activeHref={activeHref}
                  onNavigate={onNavigate}
                />
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  brand,
  brandSub,
  brandMark,
  brandExtra,
  nav,
  userSlot,
  footerSlot,
  children,
  activeHref,
  contentClassName,
  layout = 'contained',
  topBar,
}: {
  brand: React.ReactNode;
  brandSub?: React.ReactNode;
  /** Crest initials override (e.g. SH, BCL) */
  brandMark?: string;
  /** Extra lines under brand (product line) */
  brandExtra?: React.ReactNode;
  nav: NavItem[];
  userSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
  children: React.ReactNode;
  activeHref?: string;
  contentClassName?: string;
  layout?: 'contained' | 'enterprise';
  topBar?: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const tabletCollapsed = useCollapsedMode();
  const crest =
    brandMark ||
    (typeof brand === 'string'
      ? brand
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 3)
      : 'BCL') ||
    'BCL';

  React.useEffect(() => {
    setMobileOpen(false);
  }, [activeHref]);

  const aside = (opts?: { forceExpanded?: boolean }) => {
    const collapsed = opts?.forceExpanded ? false : tabletCollapsed;
    return (
      <aside
        className={cn(
          'bcl-sidebar relative flex h-full min-h-0 flex-col overflow-hidden border-r border-[var(--bcl-sidebar-border)] text-[var(--bcl-sidebar-text)] transition-[width] duration-200',
          collapsed ? 'w-[72px]' : 'w-[var(--bcl-sidebar-width,260px)] max-w-[85vw]',
        )}
      >
        <div
          className={cn(
            'relative z-[1] flex min-h-[64px] items-center border-b border-[var(--bcl-sidebar-border)]',
            collapsed ? 'justify-center px-2 py-3' : 'gap-2.5 px-3 py-3',
          )}
        >
          <div className="bcl-sidebar__crest" title={typeof brand === 'string' ? brand : undefined}>
            {crest}
          </div>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <div className="bcl-sidebar__brand-title">{brand}</div>
              {brandSub ? (
                <p className="mt-0.5 text-[11px] leading-snug text-[var(--bcl-sidebar-muted)]">
                  {brandSub}
                </p>
              ) : null}
              {brandExtra}
            </div>
          ) : null}
        </div>

        <nav
          className={cn(
            'relative z-[1] flex-1 overflow-y-auto py-3',
            collapsed ? 'px-1.5' : 'px-2.5',
          )}
        >
          {nav.map((item) =>
            item.children?.length || item.section ? (
              <NavGroup
                key={`nav:${item.label}`}
                item={item}
                activeHref={activeHref}
                onNavigate={() => setMobileOpen(false)}
                collapsed={collapsed}
              />
            ) : (
              <NavLink
                key={`${item.label}:${item.href || 'link'}`}
                item={item}
                activeHref={activeHref}
                onNavigate={() => setMobileOpen(false)}
                collapsed={collapsed}
              />
            ),
          )}
        </nav>

        {userSlot ? (
          <div
            className={cn(
              'relative z-[1] border-t border-[var(--bcl-sidebar-border)] py-2.5',
              collapsed ? 'px-1.5' : 'px-2.5',
            )}
          >
            {collapsed ? (
              <div className="flex justify-center" title="Account">
                <div className="bcl-sidebar__crest !h-9 !w-9 !text-[0.6rem] !rounded-full">···</div>
              </div>
            ) : (
              userSlot
            )}
          </div>
        ) : null}
        {footerSlot && !collapsed ? (
          <div className="relative z-[1] border-t border-[var(--bcl-sidebar-border)] px-3 py-2">
            {footerSlot}
          </div>
        ) : null}
      </aside>
    );
  };

  return (
    <div
      className={cn(
        'min-h-screen bg-[var(--bcl-bg)]',
        'md:grid md:grid-cols-[72px_1fr] lg:grid-cols-[var(--bcl-sidebar-width,260px)_1fr]',
      )}
    >
      <div className="sticky top-0 hidden h-screen md:block">{aside()}</div>

      <div className="md:hidden">
        <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-[var(--bcl-border)] bg-[var(--bcl-surface)] px-4 py-3">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--bcl-border)] bg-[var(--bcl-surface)] text-[var(--bcl-text)]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-semibold text-[var(--bcl-text)]">{brand}</p>
            {brandSub ? <p className="truncate text-xs text-[var(--bcl-muted)]">{brandSub}</p> : null}
          </div>
        </div>
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 flex">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-slate-900/30"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative z-10 h-full shadow-lg">{aside({ forceExpanded: true })}</div>
          </div>
        ) : null}
      </div>

      <main className="min-w-0 bg-[var(--bcl-bg)]">
        {topBar}
        <div
          className={cn(
            layout === 'enterprise'
              ? 'w-full max-w-none p-6'
              : 'mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8',
            contentClassName,
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl text-[var(--bcl-text)]">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-[var(--bcl-muted)]">{description}</p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}

export function DataTable({
  columns,
  rows,
}: {
  columns: {
    key: string;
    header: string;
    render?: (row: Record<string, unknown>) => React.ReactNode;
  }[];
  rows: Record<string, unknown>[];
}) {
  if (!rows.length) {
    return <EmptyState title="No records" description="Nothing to show yet." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--bcl-border)] text-[var(--bcl-muted)]">
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-3 font-medium">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={String(row.id || i)}
              className="border-b border-[var(--bcl-border)]/70 transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
            >
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-3">
                  {c.render ? c.render(row) : String(row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
