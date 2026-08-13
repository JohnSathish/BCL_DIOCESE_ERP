'use client';

import * as React from 'react';
import { cn } from '../lib/cn';
import { EmptyState } from './card';

export interface NavItem {
  href?: string;
  label: string;
  icon?: React.ReactNode;
  children?: NavItem[];
  /** Uppercase section accordion (PARISH, SACRAMENTS, …) */
  section?: boolean;
}

function isActiveHref(activeHref: string | undefined, href: string | undefined) {
  if (!activeHref || !href) return false;
  if (href === '/diocese') return activeHref === '/diocese';
  return activeHref === href || activeHref.startsWith(href + '/');
}

function useTabletCollapsed() {
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
  nested,
  onNavigate,
  collapsed,
}: {
  item: NavItem;
  activeHref?: string;
  nested?: boolean;
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
        'bcl-sidebar__nav-item group relative flex items-center rounded-[14px] text-[13.5px] font-medium transition-all duration-200',
        collapsed ? 'justify-center px-2 py-2.5' : nested ? 'gap-3 px-3 py-2.5' : 'gap-3 px-3.5 py-2.5',
        active
          ? 'is-active font-semibold text-[var(--bcl-nav-active)]'
          : 'text-[var(--bcl-sidebar-text)] hover:bg-[var(--bcl-nav-hover)] hover:translate-x-0.5',
      )}
    >
      {active ? (
        <span
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full bg-[var(--bcl-nav-accent)] transition-all duration-200',
            collapsed ? 'h-8 w-1' : 'h-[62%] w-1 shadow-[0_0_14px_var(--bcl-glow-accent)]',
          )}
          aria-hidden
        />
      ) : null}
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center transition-colors duration-200 [&>svg]:h-[1.35rem] [&>svg]:w-[1.35rem] [&>svg]:stroke-[1.85]',
          active
            ? 'text-[var(--bcl-nav-active)]'
            : 'text-[var(--bcl-sidebar-muted)] group-hover:text-[var(--bcl-nav-active)]',
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
    <div className={cn(isSection ? 'mt-4 first:mt-0' : 'space-y-0.5')}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-2 rounded-[14px] text-left transition-all duration-150',
          isSection
            ? 'px-2 py-1.5'
            : cn(
                'gap-3 px-3.5 py-2.5 text-[13.5px] font-medium',
                childActive
                  ? 'text-[var(--bcl-nav-active)]'
                  : 'text-[var(--bcl-sidebar-text)] hover:bg-[var(--bcl-nav-hover)]',
              ),
        )}
      >
        {!isSection && item.icon ? (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[var(--bcl-sidebar-muted)] [&>svg]:h-6 [&>svg]:w-6">
            {item.icon}
          </span>
        ) : null}
        <span
          className={cn(
            'flex-1 truncate',
            isSection
              ? 'text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--bcl-sidebar-muted)]'
              : 'font-medium',
          )}
        >
          {item.label}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={cn(
            'h-4 w-4 shrink-0 text-[var(--bcl-sidebar-muted)] transition-transform duration-200',
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
          <div
            className={cn(
              'space-y-0.5',
              isSection ? 'mt-1' : 'ml-2 mt-0.5 border-l border-[var(--bcl-sidebar-border)] pl-2',
            )}
          >
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
                  nested
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
  /** Extra lines under brand (diocese name, product line) */
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
  const tabletCollapsed = useTabletCollapsed();
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
          collapsed ? 'w-20' : 'w-[var(--bcl-sidebar-width,300px)] max-w-[85vw]',
        )}
      >
        <div
          className={cn(
            'relative z-[1] border-b border-[var(--bcl-sidebar-border)]',
            collapsed ? 'px-2 py-4' : 'px-5 py-5',
          )}
        >
          <div className={cn('flex items-start gap-3', collapsed && 'justify-center')}>
            <div className="bcl-sidebar__crest" title={typeof brand === 'string' ? brand : undefined}>
              {crest}
            </div>
            {!collapsed ? (
              <div className="min-w-0 pt-0.5">
                <div className="bcl-sidebar__brand-title truncate">{brand}</div>
                {brandSub ? (
                  <p className="mt-0.5 text-[12px] leading-snug text-[var(--bcl-sidebar-muted)]">
                    {brandSub}
                  </p>
                ) : null}
                {brandExtra}
              </div>
            ) : null}
          </div>
          {!collapsed ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--bcl-success)_18%,transparent)] px-2.5 py-1 text-[10px] font-semibold text-[var(--bcl-success)]">
                <i className="h-1.5 w-1.5 rounded-full bg-[var(--bcl-success)]" aria-hidden />
                Connected
              </span>
              <span className="text-[10px] font-medium text-[var(--bcl-sidebar-muted)]">
                Last Sync · Today
              </span>
            </div>
          ) : (
            <div className="mt-3 flex justify-center" title="Connected · Last Sync Today">
              <i className="h-2 w-2 rounded-full bg-[var(--bcl-success)]" aria-hidden />
            </div>
          )}
        </div>

        <nav
          className={cn(
            'relative z-[1] flex-1 space-y-0.5 overflow-y-auto py-4',
            collapsed ? 'px-1.5' : 'px-3',
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
              'relative z-[1] border-t border-[var(--bcl-sidebar-border)] py-3',
              collapsed ? 'px-1.5' : 'px-3',
            )}
          >
            {collapsed ? (
              <div className="flex justify-center" title="Account">
                <div className="bcl-sidebar__crest !h-10 !w-10 !text-[0.65rem]">···</div>
              </div>
            ) : (
              userSlot
            )}
          </div>
        ) : null}
        {footerSlot && !collapsed ? (
          <div className="relative z-[1] border-t border-[var(--bcl-sidebar-border)] px-4 py-3">
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
        'md:grid md:grid-cols-[80px_1fr] lg:grid-cols-[var(--bcl-sidebar-width,300px)_1fr]',
      )}
    >
      {/* Desktop / tablet sidebar */}
      <div className="sticky top-0 hidden h-screen md:block">{aside()}</div>

      {/* Mobile top bar + drawer */}
      <div className="md:hidden">
        <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-[var(--bcl-border)] bg-[var(--bcl-surface)] px-4 py-3">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-[var(--bcl-radius)] border border-[var(--bcl-border)] bg-[var(--bcl-surface)] text-[var(--bcl-text)] shadow-[var(--bcl-shadow)]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--bcl-text)]">{brand}</p>
            {brandSub ? <p className="truncate text-xs text-[var(--bcl-muted)]">{brandSub}</p> : null}
          </div>
        </div>
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 flex">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative z-10 h-full shadow-xl">{aside({ forceExpanded: true })}</div>
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
