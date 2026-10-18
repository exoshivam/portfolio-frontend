import { lazy, Suspense, useState, type ReactNode } from 'react';
import { ChevronDown, Download, FileText, Globe, Info, Moon, Settings } from 'lucide-react';
import { getThemeMode, setThemeMode, type ThemeMode } from '../lib/theme';
import { useStore } from '../lib/store';
import Sidebar from './Sidebar';

const BlockedUsers = lazy(() => import('./BlockedUsers'));

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeChange?: (darkMode: boolean) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

function Card({ icon, title, hint, children, className = '' }: { icon: ReactNode; title: string; hint: string; children: ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col xl:min-h-0 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d1117] p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <span className="shrink-0 text-orange-500">{icon}</span>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-black dark:text-white">{title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{hint}</p>
        </div>
      </div>
      <div className="mt-6 flex-1 xl:min-h-0 flex flex-col">{children}</div>
    </section>
  );
}

/** A small drawing of the portfolio in light or dark for the theme cards. */
function MiniPage({ dark, split }: { dark: boolean; split?: boolean }) {
  if (split)
    return (
      <span className="flex-1 min-h-16 relative flex rounded-xl overflow-hidden">
        <MiniPage dark={false} />
        <span className="absolute inset-0 flex [clip-path:inset(0_0_0_50%)]"><MiniPage dark /></span>
      </span>
    );
  const line = dark ? 'bg-gray-700' : 'bg-gray-200';
  const panel = dark ? 'bg-gray-800' : 'bg-gray-100';
  return (
    <span className={`flex-1 min-h-16 flex flex-col rounded-xl border p-3 gap-2 ${dark ? 'bg-[#0b0e14] border-white/10' : 'bg-white border-gray-200'}`}>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-orange-500" />
        <span className={`w-2 h-2 rounded-full ${dark ? 'bg-orange-300' : 'bg-gray-300'}`} />
        <span className="ml-2 h-1.5 w-1/4 rounded bg-gradient-to-r from-orange-500 to-pink-500" />
        <span className={`h-1.5 flex-1 rounded ${line}`} />
      </span>
      <span className="flex-1 flex gap-2">
        <span className="w-1/5 space-y-1.5 pt-1">
          <span className={`block h-1.5 rounded ${line}`} />
          <span className={`block h-1.5 rounded ${line}`} />
          <span className={`block h-1.5 rounded ${line}`} />
          <span className={`block h-1.5 w-2/3 rounded ${line}`} />
        </span>
        <span className={`flex-1 rounded-md ${panel}`} />
        <span className={`flex-1 rounded-md ${panel}`} />
      </span>
    </span>
  );
}

/** Settings as a full page next to the sidebar, like Contact and Explore. Fits one screen on desktop. */
export default function SettingsModal({ isOpen, onClose, onThemeChange, activeTab, onTabChange }: SettingsModalProps) {
  const { user, feed } = useStore();
  const [mode, setMode] = useState<ThemeMode>(getThemeMode);

  const setTheme = (next: ThemeMode) => {
    setMode(next);
    onThemeChange?.(setThemeMode(next));
  };

  if (!isOpen) return null;
  const name = feed?.profile?.full_name ? feed.profile.full_name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : 'Shivam Kumar Yadav';

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#07090d] z-50 overflow-hidden flex flex-col lg:flex-row">
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} onModalClose={onClose} />

      <main className="flex-1 min-w-0 overflow-y-auto flex flex-col px-4 sm:px-8 lg:px-10 pt-24 lg:pt-6 pb-6">
        <header className="flex items-center gap-5 mb-5">
          <span className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/20">
            <Settings size={32} />
          </span>
          <div>
            <h1 className="text-4xl font-bold text-black dark:text-white">Settings</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">Make the portfolio look and work the way you like. Saved in this browser.</p>
          </div>
        </header>

        <div className="xl:flex-1 xl:min-h-0 grid gap-6 grid-cols-1 xl:grid-rows-[minmax(17rem,1fr)_auto]">
          <Card icon={<Moon size={30} />} title="Theme" hint="Choose your preferred display mode.">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 xl:min-h-0">
              {(
                [
                  { m: 'light', label: 'Light', sub: 'Clean and minimal' },
                  { m: 'dark', label: 'Dark', sub: 'Easy on the eyes' },
                  { m: 'system', label: 'System', sub: 'Follow your OS' },
                ] as const
              ).map((o) => (
                <button
                  key={o.m}
                  onClick={() => setTheme(o.m)}
                  aria-pressed={mode === o.m}
                  className={`flex flex-col gap-3 min-h-0 rounded-2xl border-2 p-3 text-left transition-colors ${
                    mode === o.m
                      ? 'border-orange-500 bg-orange-500/5 shadow-[0_0_24px_-6px] shadow-orange-500/40'
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/25'
                  }`}
                >
                  <MiniPage dark={o.m === 'dark'} split={o.m === 'system'} />
                  <span className="flex items-center gap-3 px-1">
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${mode === o.m ? 'border-orange-500' : 'border-gray-400 dark:border-gray-600'}`}>
                      {mode === o.m && <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-orange-500 to-pink-500" />}
                    </span>
                    <span>
                      <span className="block font-semibold text-black dark:text-white">{o.label}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">{o.sub}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <div className={`grid gap-6 grid-cols-1 md:grid-cols-2 ${user?.isAdmin ? 'xl:grid-cols-[1.25fr_1fr_0.85fr]' : ''}`}>
            <Card icon={<Download size={30} />} title="Resume" hint="Download the resume in PDF format.">
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#11161f] p-3">
                <span className="p-3 rounded-full bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300">
                  <FileText size={22} />
                </span>
                <span className="flex-1 min-w-[10rem]">
                  <span className="block font-semibold text-black dark:text-white truncate">{name}</span>
                  <span className="block text-sm text-gray-500 dark:text-gray-400">Full Stack Developer · Resume</span>
                </span>
                <a
                  href="/resume.pdf"
                  download
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-90 whitespace-nowrap"
                >
                  <Download size={16} /> Download
                </a>
              </div>
              <p className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Info size={14} /> The latest resume is downloaded.
              </p>
            </Card>

            <Card icon={<Globe size={30} />} title="Language" hint="Choose your preferred language for the interface.">
              <label className="relative flex items-center gap-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#11161f] px-4 py-3">
                <Globe size={20} className="text-gray-500 dark:text-gray-400" />
                <select aria-label="Language" defaultValue="en" className="flex-1 appearance-none bg-transparent font-medium text-black dark:text-white focus:outline-none cursor-pointer">
                  <option value="en">English</option>
                  <option value="hi" disabled>हिन्दी (coming soon)</option>
                </select>
                <ChevronDown size={18} className="pointer-events-none text-gray-500" />
              </label>
              <p className="mt-3 flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Info size={14} className="mt-0.5 shrink-0" /> Language settings will be available soon. Currently, the portfolio is available in English.
              </p>
            </Card>

            {user?.isAdmin && (
              <section className="md:col-span-2 xl:col-span-1 min-h-0 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d1117] p-6 max-h-72 overflow-y-auto">
                <Suspense fallback={null}>
                  <BlockedUsers />
                </Suspense>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
