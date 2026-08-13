'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Home,
  Church,
  HandHeart,
  Cross,
  Flame,
  CalendarDays,
  Heart,
  Phone,
  Search,
  UserRound,
  Menu,
  X,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { useSacredHeartNav, useSacredHeartStrings } from './useSacredHeartI18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import type { MainNavItem } from './data';

const ICONS: Record<MainNavItem['icon'], LucideIcon> = {
  home: Home,
  church: Church,
  hands: HandHeart,
  cross: Cross,
  flame: Flame,
  calendar: CalendarDays,
  heart: Heart,
  phone: Phone,
};

type Props = {
  parishName: string;
  place?: string;
  scrolled: boolean;
  activeHref: string;
};

export function SacredHeartNav({
  parishName,
  place = 'Tura, Meghalaya',
  scrolled,
  activeHref,
}: Props) {
  const mainNav = useSacredHeartNav() as MainNavItem[];
  const s = useSacredHeartStrings();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (menuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  function openMenu(key: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenKey(key);
  }

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenKey(null), 160);
  }

  function isActive(item: MainNavItem) {
    if (activeHref === item.href) return true;
    const all = [
      ...(item.children || []),
      ...((item.mega || []).flatMap((c) => c.items) || []),
    ];
    return all.some((c) => c.href === activeHref);
  }

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    const flat = mainNav.flatMap((item) => [
      item,
      ...(item.children || []),
      ...((item.mega || []).flatMap((c) => c.items) || []),
    ]);
    const match = flat.find((l) => (l.label || '').toLowerCase().includes(q));
    if (match) {
      window.location.hash = match.href;
      setSearchOpen(false);
      setMenuOpen(false);
    }
  }

  return (
    <header className={`shp-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="shp-header-inner shp-container-nav">
        <a href="#home" className="shp-brand">
          <span className="shp-brand-mark">
            <Heart className="h-5 w-5 fill-current lg:h-[1.35rem] lg:w-[1.35rem]" />
          </span>
          <span className="hidden min-[420px]:block">
            <span className="block shp-display shp-brand-title text-[var(--shp-navy)]">
              {parishName}
            </span>
            <span className="mt-0.5 block text-[10px] uppercase tracking-[0.2em] text-[var(--shp-muted)] lg:text-[11px]">
              {place}
            </span>
          </span>
        </a>

        <nav className="shp-primary-nav" aria-label="Primary">
          {mainNav.map((item) => {
            const Icon = ICONS[item.icon];
            const hasPanel = Boolean(item.children?.length || item.mega?.length);
            const active = isActive(item);
            const open = openKey === item.label;

            return (
              <div
                key={item.label}
                className="shp-nav-item"
                onMouseEnter={() => (hasPanel ? openMenu(item.label) : setOpenKey(null))}
                onMouseLeave={scheduleClose}
              >
                <a
                  href={item.href}
                  className={`shp-nav-link ${active ? 'is-active' : ''} ${open ? 'is-open' : ''}`}
                  aria-expanded={hasPanel ? open : undefined}
                  aria-haspopup={hasPanel ? 'true' : undefined}
                >
                  <Icon className="shp-nav-ico" aria-hidden />
                  <span>{item.label}</span>
                  {hasPanel ? (
                    <ChevronDown className={`shp-nav-caret ${open ? 'is-open' : ''}`} aria-hidden />
                  ) : null}
                </a>

                <AnimatePresence>
                  {open && item.mega ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="shp-mega"
                      onMouseEnter={() => openMenu(item.label)}
                      onMouseLeave={scheduleClose}
                    >
                      <p className="shp-mega-title">{item.label}</p>
                      <div className="shp-mega-grid">
                        {item.mega.map((col) => (
                          <div key={col.title}>
                            <p className="shp-mega-col-title">{col.title}</p>
                            <ul className="shp-mega-list">
                              {col.items.map((child) => (
                                <li key={child.label}>
                                  <a href={child.href} onClick={() => setOpenKey(null)}>
                                    {child.label}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}

                  {open && item.children && !item.mega ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.2 }}
                      className="shp-dropdown"
                      onMouseEnter={() => openMenu(item.label)}
                      onMouseLeave={scheduleClose}
                    >
                      {item.children.map((child) => (
                        <a key={child.label} href={child.href} onClick={() => setOpenKey(null)}>
                          {child.label}
                        </a>
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        <div className="shp-header-actions">
          <div className="shp-lang-switch hidden sm:block">
            <LanguageSwitcher compact />
          </div>
          <button
            type="button"
            className={`shp-icon-btn ${searchOpen ? 'is-on' : ''}`}
            aria-label="Search"
            aria-expanded={searchOpen}
            onClick={() => {
              setSearchOpen((v) => !v);
              setMenuOpen(false);
            }}
          >
            {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </button>
          <Link href="/login" className="shp-login-btn">
            <UserRound className="h-3.5 w-3.5" />
            {s.login}
          </Link>
          <a href="#donate" className="shp-donate-btn">
            <Heart className="h-3.5 w-3.5 fill-current" />
            <span className="hidden min-[380px]:inline">{s.donate}</span>
            <span className="min-[380px]:hidden">{s.donateShort}</span>
          </a>
          <button
            type="button"
            className="shp-icon-btn shp-menu-toggle"
            onClick={() => {
              setMenuOpen((v) => !v);
              setSearchOpen(false);
            }}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {searchOpen ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="shp-search-panel"
          >
            <form onSubmit={onSearchSubmit} className="shp-container-nav flex gap-2 py-3">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={s.searchPlaceholder}
                className="flex-1 rounded-full border border-[var(--shp-border)] bg-[var(--shp-cream)]/50 px-4 py-2.5 text-sm outline-none focus:border-[var(--shp-burgundy)]"
              />
              <button type="submit" className="shp-btn shp-btn-primary !px-5 !py-2.5 text-xs">
                {s.searchGo}
              </button>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            className="shp-drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="shp-drawer-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <div className="shp-drawer-head">
                <p className="shp-display text-xl text-[var(--shp-burgundy)]">{parishName}</p>
                <div className="flex items-center gap-2">
                  <LanguageSwitcher compact />
                  <button
                  type="button"
                  className="shp-icon-btn"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
                </div>
              </div>
              <div className="shp-drawer-body">
                {mainNav.map((item) => {
                  const Icon = ICONS[item.icon];
                  const expandable = Boolean(item.children?.length || item.mega?.length);
                  const open = mobileOpen === item.label;
                  const kids = [
                    ...(item.children || []),
                    ...((item.mega || []).flatMap((c) => c.items) || []),
                  ];
                  return (
                    <div key={item.label} className="shp-drawer-group">
                      {expandable ? (
                        <button
                          type="button"
                          className={`shp-drawer-link ${isActive(item) ? 'is-active' : ''}`}
                          onClick={() => setMobileOpen(open ? null : item.label)}
                        >
                          <span className="inline-flex items-center gap-3">
                            <Icon className="h-4 w-4 opacity-70" />
                            {item.label}
                          </span>
                          <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
                        </button>
                      ) : (
                        <a
                          href={item.href}
                          className={`shp-drawer-link ${isActive(item) ? 'is-active' : ''}`}
                          onClick={() => setMenuOpen(false)}
                        >
                          <span className="inline-flex items-center gap-3">
                            <Icon className="h-4 w-4 opacity-70" />
                            {item.label}
                          </span>
                        </a>
                      )}
                      <AnimatePresence>
                        {open && kids.length ? (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="shp-drawer-sub">
                              {kids.map((child) => (
                                <a
                                  key={child.label}
                                  href={child.href}
                                  onClick={() => setMenuOpen(false)}
                                >
                                  {child.label}
                                </a>
                              ))}
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
              <div className="shp-drawer-foot">
                <a
                  href="#donate"
                  className="shp-donate-btn shp-donate-btn--block"
                  onClick={() => setMenuOpen(false)}
                >
                  <Heart className="h-4 w-4 fill-current" />
                  Donate Now
                </a>
                <Link
                  href="/login"
                  className="shp-login-btn shp-login-btn--block"
                  onClick={() => setMenuOpen(false)}
                >
                  <UserRound className="h-4 w-4" />
                  Login
                </Link>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
