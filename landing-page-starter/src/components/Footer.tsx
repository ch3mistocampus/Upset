import Link from 'next/link'

export function Footer() {
  return (
    <footer className="py-12 px-4 border-t border-white/10">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Logo */}
          <div className="text-2xl font-black text-red-600">UPSET</div>

          {/* Links */}
          <div className="flex gap-8 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-sm text-gray-500">
            {new Date().getFullYear()} Upset. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
