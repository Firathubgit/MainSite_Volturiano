import React from 'react';

const DEFAULT_COLUMNS = [
  { title: 'Product', links: [{ label: 'Features', href: '#features' }, { label: 'Pricing', href: '#pricing' }] },
  { title: 'Company', links: [{ label: 'About', href: '#' }, { label: 'Contact', href: '#contact' }] },
  { title: 'Legal', links: [{ label: 'Privacy', href: '#' }, { label: 'Terms', href: '#' }] },
];

export default function FooterColumns({
  brand = 'Acme',
  tagline = 'A short line about what you do.',
  columns = DEFAULT_COLUMNS,
}) {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <p className="text-lg font-semibold tracking-tight text-white">{brand}</p>
          <p className="mt-3 max-w-xs text-sm text-zinc-400">{tagline}</p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h3 className="text-sm font-medium text-white">{column.title}</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {column.links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-zinc-400 transition hover:text-white">{link.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className="border-t border-white/10 px-6 py-6 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} {brand}. All rights reserved.
      </p>
    </footer>
  );
}
