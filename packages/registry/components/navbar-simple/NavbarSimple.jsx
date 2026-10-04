import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

const DEFAULT_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Contact', href: '#contact' },
];

export default function NavbarSimple({
  brand = 'Acme',
  links = DEFAULT_LINKS,
  ctaLabel = 'Get started',
  ctaHref = '#contact',
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#" className="text-lg font-semibold tracking-tight text-white">{brand}</a>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="text-sm text-zinc-400 transition hover:text-white">
              {link.label}
            </a>
          ))}
          <a href={ctaHref} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200">
            {ctaLabel}
          </a>
        </nav>

        <button
          type="button"
          className="text-white md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-4 border-t border-white/10 px-6 py-5 md:hidden">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="text-zinc-300" onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <a href={ctaHref} className="rounded-full bg-white px-4 py-2 text-center text-sm font-medium text-black">
            {ctaLabel}
          </a>
        </nav>
      )}
    </header>
  );
}
