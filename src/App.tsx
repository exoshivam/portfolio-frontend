import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Bell, Download, LogOut } from 'lucide-react';
import ProfileHeader from './components/ProfileHeader';
import SkillsHighlights from './components/SkillsHighlights';
import ProjectsGrid from './components/ProjectsGrid';
import Sidebar from './components/Sidebar';
import { useStore } from './lib/store';

const SignInModal = lazy(() => import('./components/SignInModal'));
const Terminal = lazy(() => import('./components/Terminal'));
const SearchModal = lazy(() => import('./components/SearchModal'));
const AdminInbox = lazy(() => import('./components/AdminInbox'));
// The chatbot (markdown renderer + intro video) is not needed to show the page, so it
// loads once the browser is idle after the first paint.
const ChatbotWidget = lazy(() => import('./components/ChatbotWidget'));

function useIdle(): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    const done = () => setIdle(true);
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(done, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(done, 1500);
    return () => clearTimeout(t);
  }, []);
  return idle;
}

function App() {
  const { feed, feedError, user, logout, signInOpen, setSignInOpen, terminalOpen, setTerminalOpen, searchOpen, setSearchOpen, inboxOpen, setInboxOpen, unread } = useStore();
  const [activeTab, setActiveTab] = useState('Home');
  const [toast, setToast] = useState<string | null>(null);
  const idle = useIdle();

  // Greet on sign-in (not on page load with an existing session).
  const prevUser = useRef(user);
  useEffect(() => {
    if (user && !prevUser.current) {
      setToast(`Logged in as ${user.username}`);
      const t = setTimeout(() => setToast(null), 3000);
      prevUser.current = user;
      return () => clearTimeout(t);
    }
    prevUser.current = user;
  }, [user]);

  // ⌘K / Ctrl+K toggles the terminal from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setTerminalOpen(!terminalOpen);
      }
      // "/" opens search, unless the visitor is typing in a field.
      const el = e.target as HTMLElement;
      const typing = el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [terminalOpen, setTerminalOpen, setSearchOpen]);

  const handleThemeChange = (isDark: boolean) => {
    document.documentElement.classList.toggle('dark', isDark);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-300 flex">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onThemeChange={handleThemeChange} />

      <main className="flex-1 relative flex flex-col w-full min-w-0">
        {toast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in-out whitespace-nowrap">
            {toast}
          </div>
        )}
        {feedError && !feed && (
          <div className="m-4 p-3 rounded-lg border border-red-400 text-red-600 dark:text-red-400 text-sm text-center">
            Couldn't load the portfolio. Check your connection and refresh.
          </div>
        )}

        <div className="hidden lg:flex fixed top-6 right-6 z-40 items-center gap-4">
          <a href="/resume.pdf" download className="p-2 text-orange-500 hover:text-orange-400 transition-colors hover:scale-110 transform" title="Download Resume">
            <Download size={24} />
          </a>
          {user?.isAdmin && (
            <button onClick={() => setInboxOpen(true)} aria-label={`Inbox, ${unread} unread`} title="Inbox" className="relative p-2 text-orange-500 hover:text-orange-400 transition-colors hover:scale-110 transform">
              <Bell size={24} />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
          )}
          {!user ? (
            <button
              onClick={() => setSignInOpen(true)}
              className="px-5 py-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white text-sm font-medium rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md shadow-orange-500/20"
            >
              Sign In
            </button>
          ) : (
            <div className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-md shadow-sm">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-orange-500 to-pink-500 text-white text-[11px] font-bold flex items-center justify-center shadow-inner flex-shrink-0">
                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 max-w-[110px] truncate">
                @{user.username}
              </span>
              <button
                onClick={logout}
                title="Logout"
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors ml-0.5 group"
              >
                <LogOut size={13} className="group-hover:translate-x-0.5 transition-transform" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>

        <div className="max-w-5xl w-full mx-auto">
          <ProfileHeader />
          <SkillsHighlights />
          <ProjectsGrid />

          <div className="border-t border-gray-200 dark:border-gray-800 py-8 px-4 mt-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Inspired from Instagram</p>
            <p className="text-xs text-gray-500 dark:text-gray-600">
              © {new Date().getFullYear()} {feed?.profile?.full_name || 'Developer'}. All rights reserved.
            </p>
          </div>
        </div>
      </main>

      <Suspense fallback={null}>
        {signInOpen && <SignInModal />}
        {terminalOpen && <Terminal />}
        {searchOpen && <SearchModal />}
        {inboxOpen && user?.isAdmin && <AdminInbox />}
        {idle && <ChatbotWidget />}
      </Suspense>
    </div>
  );
}

export default App;
