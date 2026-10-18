import { lazy, Suspense, useEffect, useState } from 'react';
import { Instagram, Home, Search, Compass, Briefcase, Mail, Settings, Menu, Download, LogOut, TerminalSquare, Bell } from 'lucide-react';
import { useStore } from '../lib/store';

// Each panel's code is downloaded the first time it is opened, not on page load.
const ContactModal = lazy(() => import('./ContactModal'));
const SettingsModal = lazy(() => import('./SettingsModal'));
const ExploreModal = lazy(() => import('./ExploreModal'));
const ExperienceModal = lazy(() => import('./ExperienceModal'));

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onModalClose?: () => void;
  onThemeChange?: (darkMode: boolean) => void;
}

export default function Sidebar({ activeTab, onTabChange, onModalClose, onThemeChange }: SidebarProps) {
  const { user, logout, setSignInOpen, setTerminalOpen, setInboxOpen, unread, setSearchOpen, openTab, setOpenTab } = useStore();
  const isLoggedIn = !!user;
  const [isOpen, setIsOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [experienceFocus, setExperienceFocus] = useState<string | undefined>();
  const [isExperienceOpen, setIsExperienceOpen] = useState(false);
  // Panels stay mounted after their first open so their slide animations keep working.
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const markOpened = (name: string) => setOpened((o) => (o.has(name) ? o : new Set(o).add(name)));
  const [previousTab, setPreviousTab] = useState<string>('Home');

  // Only the page-level sidebar (not the copies inside open pages) handles open requests.
  useEffect(() => {
    if (!openTab || onModalClose) return;
    setOpenTab(null);
    setPreviousTab(activeTab || 'Home');
    onTabChange?.(openTab.tab);
    if (openTab.tab === 'Explore') {
      markOpened('explore');
      setIsExploreOpen(true);
    } else if (openTab.tab === 'Experience') {
      setExperienceFocus(openTab.target);
      markOpened('experience');
      setIsExperienceOpen(true);
    } else if (openTab.tab === 'Settings') {
      markOpened('settings');
      setIsSettingsOpen(true);
    } else {
      markOpened('contact');
      setIsContactOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTab]);

  // Inside an open page, switching to another page closes this one and lets the page-level sidebar open
  // the next, so only one page is ever open (Home then really goes home).
  const openPage = (tab: 'Explore' | 'Experience' | 'Contact' | 'Settings', open: () => void) => {
    if (onModalClose) {
      onModalClose();
      setOpenTab({ tab });
      return;
    }
    setPreviousTab(activeTab || 'Home');
    onTabChange?.(tab);
    open();
  };

  const menuItems = [
    { icon: Home, label: 'Home', href: '#', onClick: () => { setPreviousTab('Home'); onTabChange?.('Home'); onModalClose?.(); } },
    { icon: Search, label: 'Search', href: '#', hint: '/', onClick: () => { setIsOpen(false); setSearchOpen(true); } },
    { icon: Compass, label: 'Explore', href: '#', onClick: () => openPage('Explore', () => { markOpened('explore'); setIsExploreOpen(true); }) },
    { icon: Briefcase, label: 'Experience', href: '#', onClick: () => openPage('Experience', () => { markOpened('experience'); setIsExperienceOpen(true); }) },
    { icon: Mail, label: 'Contact', href: '#', onClick: () => openPage('Contact', () => { markOpened('contact'); setIsContactOpen(true); }) },
    { icon: Settings, label: 'Settings', href: '#', onClick: () => openPage('Settings', () => { markOpened('settings'); setIsSettingsOpen(true); }) },
    { icon: TerminalSquare, label: 'Terminal', href: '#', hint: '⌘K', onClick: () => { setIsOpen(false); setTerminalOpen(true); } },
    ...(user?.isAdmin ? [{ icon: Bell, label: 'Inbox', href: '#', badge: unread, onClick: () => { setIsOpen(false); setInboxOpen(true); } }] : []),
  ] as { icon: typeof Home; label: string; href: string; onClick: () => void; hint?: string; badge?: number }[];

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-8 left-8 z-50 p-3 accent-gradient rounded-full lg:hidden hover:scale-110 transition-transform ${isOpen ? 'hidden' : ''}`}
      >
        <Menu size={24} />
      </button>

      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-64 shrink-0 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 z-40
        transform transition-transform duration-300 lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        overflow-y-auto flex flex-col
      `}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 accent-gradient rounded-full">
              <Instagram size={24} />
            </div>
            <span className="text-2xl font-bold text-black dark:text-white">Portfolio</span>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.label;
            return (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  if (item.onClick) {
                    e.preventDefault();
                    item.onClick();
                  }
                }}
                className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-900 text-black dark:text-white'
                }`}
              >
                <Icon size={24} className={`transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-600 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white'
                }`} />
                <span className="text-lg">{item.label}</span>
                {item.hint && <kbd className="ml-auto hidden lg:inline text-[10px] text-gray-500 border border-gray-300 dark:border-gray-700 rounded px-1.5 py-0.5">{item.hint}</kbd>}
                {!!item.badge && <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">{item.badge}</span>}
              </a>
            );
          })}
        </nav>

        {/* User Info Section */}
        {user && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-800">
            <div className="px-4 py-3 bg-gray-100 dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-800 rounded-xl flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Logged in as</p>
                <p className="text-sm font-semibold text-black dark:text-white truncate">
                  @{user.username}
                  {user.isAdmin && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-orange-500 text-white align-middle">ADMIN</span>}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                aria-label="Logout"
                className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Download and Auth Buttons - Mobile Only */}
        <div className="lg:hidden p-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
          <a
            href="/resume.pdf"
            download
            className="w-full flex items-center justify-center gap-2 p-2.5 text-orange-500 hover:text-orange-400 transition-colors border border-orange-500/40 rounded-lg hover:bg-orange-500/10"
            title="Download Resume"
          >
            <Download size={20} />
            <span className="font-semibold text-sm">Download CV</span>
          </a>
          {!isLoggedIn ? (
            <button
              onClick={() => {
                setSignInOpen(true);
                setIsOpen(false);
              }}
              className="w-full px-5 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold text-sm rounded-lg transition-all duration-200"
            >
              Sign In
            </button>
          ) : (
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 p-2.5 text-red-500 hover:text-red-400 transition-colors border border-red-500/30 rounded-lg hover:bg-red-500/10 font-medium text-sm"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          )}
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-white/10 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <Suspense fallback={null}>
        {opened.has('contact') && <ContactModal isOpen={isContactOpen} onClose={() => { setIsContactOpen(false); onTabChange?.(previousTab); }} activeTab={activeTab} onTabChange={onTabChange} />}
        {opened.has('settings') && <SettingsModal isOpen={isSettingsOpen} onClose={() => { setIsSettingsOpen(false); onTabChange?.(previousTab); }} onThemeChange={onThemeChange} activeTab={activeTab} onTabChange={onTabChange} />}
        {opened.has('explore') && <ExploreModal isOpen={isExploreOpen} onClose={() => { setIsExploreOpen(false); onTabChange?.(previousTab); }} activeTab={activeTab} onTabChange={onTabChange} />}
        {opened.has('experience') && <ExperienceModal isOpen={isExperienceOpen} focusId={experienceFocus} onClose={() => { setIsExperienceOpen(false); setExperienceFocus(undefined); onTabChange?.(previousTab); }} activeTab={activeTab} onTabChange={onTabChange} />}
      </Suspense>
    </>
  );
}