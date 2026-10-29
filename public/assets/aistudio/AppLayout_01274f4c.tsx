import { useState } from 'react';
import { Outlet } from 'react-router-dom';
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
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Devotee Vedic Chatbot Assistant */}
      <DevoteeChatbot />

      {/* Google Sign-in / Missing info Profile Update Modal */}
      <ProfileUpdatePromptModal />
    </div>
  );
}
