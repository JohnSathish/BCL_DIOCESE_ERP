'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Menu, X } from 'lucide-react';
import { useSacredHeartNav, useSacredHeartStrings } from './useSacredHeartI18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import type { MainNavItem } from './data';

type Props = {
  parishName: string;
  place?: string;
  email: string;
  phone: string;
  scrolled: boolean;
  activeHref: string;
  logoUrl?: string | null;
};

export function SacredHeartNav({
  parishName,
  place = 'Tura, Meghalaya',
  email,
  phone,
  scrolled,
  activeHref,
  logoUrl,
}: Props) {
  const mainNav = useSacredHeartNav() as MainNavItem[];
  const s = useSacredHeartStrings();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (menuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <div className="shp-topbar">
        <div className="shp-container-nav flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5">
              <span className="hidden sm:inline">{email}</span>
              <span className="sm:hidden">{s.topbarEmail}</span>
            </a>
            <span className="shp-topbar-sep" aria-hidden />
            <a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ml-auto">
            <a href="#mass-timings">{s.topbarMassTimes}</a>
            <span className="shp-topbar-sep hidden sm:block" aria-hidden />
            <a href="#events" className="hidden sm:inline">
              {s.topbarCalendar}
            </a>
            <span className="shp-topbar-sep hidden sm:block" aria-hidden />
            <a href="#contact">{s.topbarContact}</a>
            <span className="shp-topbar-sep" aria-hidden />
            <LanguageSwitcher compact variant="topbar" />
          </div>
        </div>
      </div>

      <header className={`shp-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="shp-header-inner shp-container-nav">
          <a href="#home" className="shp-brand" aria-label={`${parishName} home`}>
            <span className="shp-brand-mark" aria-hidden>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                <Heart className="h-5 w-5 fill-current" />
              )}
            </span>
            <span className="hidden min-[380px]:block min-w-0">
              <span className="block shp-display shp-brand-title truncate">{parishName}</span>
              <span className="mt-0.5 block text-[10px] uppercase tracking-[0.18em] text-[var(--shp-muted)]">
                {place}
              </span>
            </span>
          </a>

          <nav className="shp-primary-nav" aria-label="Primary">
            {mainNav.map((item) => (
              <a
                key={item.href + item.label}
                href={item.href}
                className={`shp-nav-link ${activeHref === item.href ? 'is-active' : ''}`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="shp-header-actions">
            <a href="#donate" className="shp-donate-btn">
              {s.donateShort} <Heart className="h-3.5 w-3.5 fill-current" aria-hidden />
            </a>
            <button
              type="button"
              className="shp-menu-toggle"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            className="shp-mobile-drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMenu}
          >
            <motion.div
              className="shp-mobile-panel"
              initial={{ x: 40 }}
              animate={{ x: 0 }}
              exit={{ x: 40 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Mobile navigation"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="shp-display text-xl text-[var(--shp-navy)]">{parishName}</p>
                <button type="button" onClick={closeMenu} aria-label="Close menu">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav aria-label="Mobile">
                {mainNav.map((item) => (
                  <a
                    key={item.href + item.label}
                    href={item.href}
                    className={`shp-mobile-link ${activeHref === item.href ? 'is-active' : ''}`}
                    onClick={closeMenu}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
              <a href="#donate" className="shp-btn shp-btn-primary mt-6 w-full" onClick={closeMenu}>
                {s.donate} <Heart className="h-4 w-4 fill-current" />
              </a>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
