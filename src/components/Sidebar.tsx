import { useState, useEffect } from 'react';
import { Instagram, Home, Search, Compass, Mail, Settings, Menu, Download, LogOut } from 'lucide-react';
import ContactModal from './ContactModal';
import SettingsModal from './SettingsModal';
import ExploreModal from './ExploreModal';
import SearchModal from './SearchModal';

interface SidebarProps {
  isLoggedIn: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onModalClose?: () => void;
  onThemeChange?: (darkMode: boolean) => void;
  onLogout?: () => void;
  onSignIn?: () => void;
}

export default function Sidebar({ isLoggedIn, activeTab, onTabChange, onModalClose, onThemeChange, onLogout, onSignIn }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [user, setUser] = useState<{ username: string; email: string } | null>(null);
  const [previousTab, setPreviousTab] = useState<string>('Home');

  useEffect(() => {
    // Update user info whenever login state changes
    if (isLoggedIn) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          setUser(JSON.parse(userStr));
        } catch (error) {
          console.error('Error parsing user:', error);
        }
      }
    } else {
      setUser(null);
    }
  }, [isLoggedIn]);

  const menuItems = [
    { icon: Home, label: 'Home', href: '#', onClick: () => { setPreviousTab('Home'); onTabChange?.('Home'); onModalClose?.(); } },
    { icon: Search, label: 'Search', href: '#', onClick: () => { setPreviousTab(activeTab || 'Home'); onTabChange?.('Search'); setIsSearchOpen(true); } },
    { icon: Compass, label: 'Explore', href: '#', onClick: () => { setPreviousTab(activeTab || 'Home'); onTabChange?.('Explore'); setIsExploreOpen(true); } },
    { icon: Mail, label: 'Contact', href: '#', onClick: () => { setPreviousTab(activeTab || 'Home'); onTabChange?.('Contact'); setIsContactOpen(true); } },
    { icon: Settings, label: 'Settings', href: '#', onClick: () => { console.log('Settings clicked'); setPreviousTab(activeTab || 'Home'); onTabChange?.('Settings'); setIsSettingsOpen(true); console.log('isSettingsOpen set to true'); } },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-8 left-8 z-50 p-3 accent-gradient rounded-full lg:hidden hover:scale-110 transition-transform ${isOpen ? 'hidden' : ''}`}
      >
        <Menu size={24} />
      </button>

      <aside className={`
        fixed lg:sticky lg:top-0 left-0 h-screen w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 z-40
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
              </a>
            );
          })}
        </nav>

        {/* User Info Section */}
        {user && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-800">
            <div className="px-4 py-3 bg-gray-100 dark:bg-gray-900 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Logged in as</p>
              <p className="text-sm font-semibold text-black dark:text-white truncate">@{user.username}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        )}

        {/* Download and Auth Buttons - Mobile Only */}
        <div className="lg:hidden p-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
          <a
            href="https://portfolio-backend-zphz.onrender.com/public/uploads/projects/resume.pdf"
            download
            className="w-full flex items-center justify-center gap-2 p-2.5 text-orange-500 hover:text-orange-400 transition-colors border border-orange-500 rounded-lg hover:bg-orange-500/10"
            title="Download Resume"
          >
            <Download size={20} />
            <span className="font-semibold">Download Resume</span>
          </a>
          {!isLoggedIn ? (
            <button
              onClick={() => {
                onSignIn?.();
                setIsOpen(false);
              }}
              className="w-full px-6 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
            >
              Sign In
            </button>
          ) : (
            <button
              onClick={() => {
                onLogout?.();
                setIsOpen(false);
              }}
              className="w-full px-6 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              Logout
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

      <ContactModal isOpen={isContactOpen} onClose={() => { setIsContactOpen(false); onTabChange?.(previousTab); }} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => { setIsSettingsOpen(false); onTabChange?.(previousTab); }} onThemeChange={onThemeChange} />
      <ExploreModal isOpen={isExploreOpen} onClose={() => { setIsExploreOpen(false); onTabChange?.(previousTab); }} activeTab={activeTab} onTabChange={onTabChange} />
      <SearchModal isOpen={isSearchOpen} onClose={() => { setIsSearchOpen(false); onTabChange?.(previousTab); }} />
    </>
  );
}
