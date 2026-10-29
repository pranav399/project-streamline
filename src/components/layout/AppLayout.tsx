import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Flame, Landmark, ExternalLink } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { DevoteeChatbot } from '../chat/DevoteeChatbot';
import { ProfileUpdatePromptModal } from '../auth/ProfileUpdatePromptModal';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  return (
    <div className="flex h-screen overflow-hidden bg-saffron-50/40 dark:bg-slate-950">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        unreadNotifs={unreadNotifs}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onMobileMenu={() => setMobileOpen(true)}
          unreadNotifs={unreadNotifs}
          setUnreadNotifs={setUnreadNotifs}
        />
        <main className="flex-1 overflow-y-auto scrollbar-thin flex flex-col justify-between">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>

          {/* Footer with Temple Heritage Redirect URL */}
          <footer className="mt-12 border-t border-saffron-200/80 bg-white/95 px-4 py-8 text-xs text-saffron-900 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300">
            <div className="mx-auto max-w-7xl">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                {/* Brand Info */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-saffron-500 to-vermillion-600 text-white shadow-soft">
                      <Flame className="h-4 w-4" />
                    </div>
                    <span className="font-display text-sm font-bold text-saffron-950 dark:text-white">PoojaConnect</span>
                    <span className="text-saffron-300 dark:text-slate-600">•</span>
                    <span className="text-[11px] text-saffron-600 dark:text-slate-400">Vedic Rituals, Pandits & Samagri</span>
                  </div>
                  <p className="max-w-md text-[11.5px] text-saffron-700/80 dark:text-slate-400 leading-relaxed">
                    Connecting devotees with verified Vedic scholars for authentic home, temple, and virtual rituals.
                  </p>
                </div>

                {/* Temple Heritage Click Redirect Section */}
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="https://india-temple-heritage-portal-three.vercel.app/#/"
                    target="_blank"
                    rel="noopener noreferrer"
                    id="footer-temple-heritage-link"
                    className="group inline-flex items-center gap-2 rounded-xl border border-saffron-300 bg-gradient-to-r from-saffron-50 to-marigold-50 px-4 py-2.5 text-xs font-bold text-saffron-900 shadow-soft transition-all duration-200 hover:scale-[1.03] hover:border-saffron-500 hover:shadow-pop dark:border-saffron-800/80 dark:from-slate-800 dark:to-slate-850 dark:text-saffron-200"
                    title="Click to visit the India Temple Heritage Portal"
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-saffron-500 text-white shadow-xs group-hover:scale-110 transition-transform">
                      <Landmark className="h-3.5 w-3.5" />
                    </div>
                    <span>Temple Heritage</span>
                    <ExternalLink className="h-3.5 w-3.5 text-saffron-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform dark:text-saffron-400" />
                  </a>
                </div>
              </div>

              {/* Navigation links & Copyright */}
              <div className="mt-6 flex flex-col gap-3 border-t border-saffron-100 pt-4 text-[11px] text-saffron-600 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-4">
                  <Link to="/app/services" className="hover:text-saffron-900 dark:hover:text-white transition">Book a Pooja</Link>
                  <Link to="/app/pandits" className="hover:text-saffron-900 dark:hover:text-white transition">Find Pandits</Link>
                  <Link to="/app/shop" className="hover:text-saffron-900 dark:hover:text-white transition">Samagri Shop</Link>
                  <Link to="/app/sankalp-patra" className="hover:text-saffron-900 dark:hover:text-white transition">Sankalp Patra</Link>
                  <a
                    href="https://india-temple-heritage-portal-three.vercel.app/#/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-saffron-700 hover:text-saffron-900 dark:text-saffron-300 dark:hover:text-white flex items-center gap-1"
                  >
                    <span>Temple Heritage Portal</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p>© {new Date().getFullYear()} PoojaConnect. Har Har Mahadev 🙏</p>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Devotee Vedic Chatbot Assistant */}
      <DevoteeChatbot />

      {/* Google Sign-in / Missing info Profile Update Modal */}
      <ProfileUpdatePromptModal />
    </div>
  );
}
