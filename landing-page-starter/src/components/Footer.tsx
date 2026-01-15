import Link from 'next/link'
import { COPY } from '@/lib/copy'

export function Footer() {
  return (
    <footer className="py-12 px-4 border-t border-white/10">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Logo */}
          <div className="text-2xl font-black text-red-600">{COPY.footer.brand}</div>

          {/* Links */}
          <nav aria-label="Footer navigation">
            <ul className="flex gap-8 text-sm text-gray-400">
              {COPY.footer.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black rounded"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Copyright */}
          <p className="text-sm text-gray-500">{COPY.footer.copyright}</p>
        </div>
      </div>
    </footer>
  )
}
