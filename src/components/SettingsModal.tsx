import { useState, useEffect } from 'react';
import { Settings, Moon, Sun, Download, Globe, X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeChange?: (darkMode: boolean) => void;
}

export default function SettingsModal({ isOpen, onClose, onThemeChange }: SettingsModalProps) {
  const [darkMode, setDarkMode] = useState(true);
  const [accentColor, setAccentColor] = useState<'orange' | 'pink' | 'blue'>('orange');

  // Load settings from localStorage on mount
  useEffect(() => {
    console.log('SettingsModal mounted, isOpen:', isOpen);
    const savedDarkMode = localStorage.getItem('darkMode');
    const savedAccentColor = localStorage.getItem('accentColor');
    
    console.log('Saved darkMode from localStorage:', savedDarkMode);
    console.log('Document dark class:', document.documentElement.classList.contains('dark'));
    
    if (savedDarkMode !== null) setDarkMode(JSON.parse(savedDarkMode));
    if (savedAccentColor) {
      const color = savedAccentColor as 'orange' | 'pink' | 'blue';
      setAccentColor(color);
      applyAccentColor(color);
    }
  }, [isOpen]);

  // Save settings to localStorage
  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode;
    console.log('Toggle clicked! Current:', darkMode, 'New:', newDarkMode);
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
    
    // Apply theme to document
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      console.log('Added dark class');
    } else {
      document.documentElement.classList.remove('dark');
      console.log('Removed dark class');
    }
    
    // Emit callback to parent
    if (onThemeChange) {
      console.log('Calling onThemeChange with:', newDarkMode);
      onThemeChange(newDarkMode);
    }
  };

  const handleAccentColorChange = (color: 'orange' | 'pink' | 'blue') => {
    setAccentColor(color);
    localStorage.setItem('accentColor', color);
    applyAccentColor(color);
  };

  const applyAccentColor = (color: 'orange' | 'pink' | 'blue') => {
    const colorMap = {
      orange: { primary: '249, 115, 22', secondary: '236, 72, 153' },
      pink: { primary: '236, 72, 153', secondary: '225, 29, 72' },
      blue: { primary: '59, 130, 246', secondary: '34, 197, 94' },
    };
    
    const colors = colorMap[color];
    document.documentElement.style.setProperty('--accent-primary', colors.primary);
    document.documentElement.style.setProperty('--accent-secondary', colors.secondary);
    document.documentElement.setAttribute('data-accent', color);
  };

  const handleDownloadResume = () => {
    const resumeUrl = 'https://portfolio-backend-zphz.onrender.com/download/resume';
    const link = document.createElement('a');
    link.href = resumeUrl;
    link.download = 'resume.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const accentColors = [
    { name: 'orange', gradient: 'from-orange-500 to-pink-500', label: 'Orange' },
    { name: 'pink', gradient: 'from-pink-500 to-rose-500', label: 'Pink' },
    { name: 'blue', gradient: 'from-blue-500 to-cyan-500', label: 'Blue' },
  ];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 dark:bg-white/10 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl max-w-2xl w-full my-2 sm:my-8 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="inline-block p-2 sm:p-3 accent-gradient rounded-full">
              <Settings size={20} className="sm:w-6 sm:h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-light text-black dark:text-white">Settings</h1>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors flex-shrink-0"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-8 overflow-y-auto flex-1">
          {/* Dark/Light Mode */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2 text-black dark:text-white">
                  {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                  Theme
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Choose your preferred display mode</p>
              </div>
              <button
                onClick={handleDarkModeToggle}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  darkMode ? 'bg-gradient-to-r from-orange-500 to-pink-500' : 'bg-gray-400'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    darkMode ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Current mode: <span className="text-black dark:text-white font-semibold">{darkMode ? 'Dark' : 'Light'}</span>
            </p>
          </div>

          {/* Accent Color */}
          <div>
            <div>
              <h2 className="text-lg font-semibold mb-4 text-black dark:text-white">Accent Color (Upcoming Feature)</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Customize your portfolio's accent color</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {accentColors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => handleAccentColorChange(color.name as 'orange' | 'pink' | 'blue')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    accentColor === color.name
                      ? `border-black dark:border-white bg-gradient-to-br ${color.gradient}`
                      : 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 hover:border-gray-400 dark:hover:border-gray-600'
                  }`}
                >
                  <div className={`h-8 rounded-full bg-gradient-to-br ${color.gradient} mb-2`} />
                  <p className="text-sm font-semibold text-black dark:text-white">{color.label}</p>
                  {accentColor === color.name && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Active</p>}
                </button>
              ))}
            </div>
          </div>

          {/* Download Resume */}
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Download size={20} />
                  Download Resume
                </h2>
                <p className="text-sm text-gray-400 mt-1">Download the resume in PDF format</p>
              </div>
              <button
                onClick={handleDownloadResume}
                className="px-6 py-2 accent-gradient-to-r rounded-lg font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                Download
              </button>
            </div>
          </div>

          {/* Language */}
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2 text-black dark:text-white">
                  <Globe size={20} />
                  Language
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Choose your preferred language</p>
              </div>
              <div className="bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-2 rounded-lg">
                <p className="text-sm font-semibold">Upcoming</p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Language settings will be available soon. Currently, the portfolio is available in English.</p>
            </div>
          </div>

          {/* Settings Info */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-500">
              Your preferences are saved locally in your browser. They will be preserved across sessions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
