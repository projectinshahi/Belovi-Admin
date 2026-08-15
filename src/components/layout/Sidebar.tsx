'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  LayoutGrid,
  Shirt,
  Layers,
  Package,
  Image as ImageIcon,
  Building2,
  FileText,
  Sparkles,
  NotebookText,
  Users,
  Mail,
  LogOut,
  X,
  Settings,
} from 'lucide-react';
import { clearAdminSession } from '@/lib/adminSession';
import Logo from '@/components/ui/Logo';
import { NAV_ITEMS } from './navigation';

// Icons live here rather than in navigation.ts so that module stays a plain
// route table the Navbar can read without pulling in JSX.
const ICONS = {
  dashboard: LayoutGrid,
  products: Shirt,
  categories: Layers,
  orders: Package,
  banners: ImageIcon,
  'featured-collection': Sparkles,
  'studio-notes': NotebookText,
  about: Building2,
  brochures: FileText,
  customers: Users,
  newsletter: Mail,
  settings: Settings,
} as const;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function Wordmark() {
  return (
    <Link
      href="/dashboard"
      aria-label="BELOVI Studio — overview"
      className="block group"
    >
      <Logo tone="ivory" priority className="h-[26px]" />
      <span className="block eyebrow-tight text-muted mt-2 transition-colors duration-300 ease-editorial group-hover:text-ivory">
        Admin
      </span>
    </Link>
  );
}

function SidebarNav({
  onNavClick,
  onLogout,
}: {
  onNavClick: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <nav className="flex-1 overflow-y-auto thin-scrollbar py-6 px-4">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = ICONS[item.key];
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavClick}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex items-center gap-3 px-4 py-3 transition-colors duration-300 ease-editorial ${
                    isActive
                      ? 'bg-ivory/[0.07] text-ivory'
                      : 'text-ivory/45 hover:text-ivory hover:bg-ivory/[0.04]'
                  }`}
                >
                  {/* Active marker: a vivid red rule. */}
                  <span
                    aria-hidden
                    className={`absolute left-0 top-0 bottom-0 w-[3px] bg-forest transition-opacity duration-300 ease-editorial ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <Icon size={16} strokeWidth={1.5} aria-hidden className="shrink-0 group-hover:scale-110 transition-transform duration-300" />
                  <span className="font-sans text-[12px] uppercase tracking-[0.14em]">
                    {item.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-ivory/10 shrink-0">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-ivory/45 hover:text-ivory hover:bg-ivory/[0.04] transition-colors duration-300 ease-editorial group"
        >
          <LogOut size={16} strokeWidth={1.5} aria-hidden className="shrink-0 group-hover:-translate-x-1 transition-transform duration-300" />
          <span className="font-sans text-[12px] uppercase tracking-[0.14em]">
            Sign Out
          </span>
        </button>
      </div>
    </>
  );
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const reduce = useReducedMotion();

  const handleLogout = () => {
    clearAdminSession();
    router.push('/admin-login');
  };

  return (
    <>
      {/* -- Desktop: in-flow, always visible ------------------------------- */}
      <aside className="hidden lg:flex w-[248px] bg-cream flex-col shrink-0 border-r border-line-dark shadow-[4px_0_24px_rgba(0,0,0,0.1)] z-20">
        <div className="h-[76px] px-6 flex items-center shrink-0 border-b border-ivory/10">
          <Wordmark />
        </div>
        <SidebarNav onNavClick={() => {}} onLogout={handleLogout} />
      </aside>

      {/* -- Mobile: overlay drawer ----------------------------------------- */}
      <AnimatePresence>
        {isOpen && (
          <div className="lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm"
            />
            <motion.aside
              initial={reduce ? { opacity: 0 } : { x: '-100%' }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: '-100%' }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-[248px] bg-cream flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.2)]"
            >
              <div className="h-[68px] px-6 flex items-center justify-between shrink-0 border-b border-black/10">
                <Wordmark />
                <button
                  onClick={onClose}
                  aria-label="Close navigation"
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-ivory/20 text-ivory/60 hover:text-ivory hover:border-ivory/50 transition-colors duration-300 ease-editorial"
                >
                  <X size={15} />
                </button>
              </div>
              <SidebarNav onNavClick={onClose} onLogout={handleLogout} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
