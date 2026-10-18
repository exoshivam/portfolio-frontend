import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { api, type User } from '../lib/api';
import { useStore } from '../lib/store';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

interface GoogleId {
  initialize(opts: { client_id: string; callback: (r: { credential: string }) => void }): void;
  renderButton(el: HTMLElement, opts: Record<string, unknown>): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let gsiPromise: Promise<void> | null = null;

/** Loads Google's sign-in script on first use instead of on every page load. */
function loadGoogle(): Promise<void> {
  gsiPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gsiPromise = null;
      reject(new Error('Could not load Google sign-in'));
    };
    document.head.appendChild(s);
  });
  return gsiPromise;
}

export default function SignInModal() {
  const { signInOpen, setSignInOpen, login } = useStore();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const close = () => setSignInOpen(false);

  useEffect(() => {
    if (!signInOpen) return;
    setError('');
    if (!CLIENT_ID) {
      setError('Google sign-in is not configured (VITE_GOOGLE_CLIENT_ID).');
      return;
    }
    let cancelled = false;
    loadGoogle()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async ({ credential }) => {
            setBusy(true);
            setError('');
            try {
              const res = await api<{ token: string; user: User }>('/auth/google', 'POST', { credential });
              login(res.token, res.user);
              setSignInOpen(false);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Sign-in failed');
            } finally {
              setBusy(false);
            }
          },
        });
        const dark = document.documentElement.classList.contains('dark');
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: dark ? 'filled_black' : 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: 300,
        });
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [signInOpen, login, setSignInOpen]);

  useEffect(() => {
    if (!signInOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSignInOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [signInOpen, setSignInOpen]);

  if (!signInOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-title"
        className="bg-gradient-to-br from-gray-100 dark:from-gray-900 to-white dark:to-black rounded-2xl w-full max-w-sm border border-gray-300 dark:border-gray-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-300 dark:border-gray-800">
          <h2 id="signin-title" className="text-2xl font-bold text-black dark:text-white">Sign In</h2>
          <button onClick={close} aria-label="Close" className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg">
            <X size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Sign in to comment on posts and get more chatbot messages.</p>
          <div ref={buttonRef} className="flex justify-center min-h-[44px]" />
          {busy && <p className="text-sm text-gray-500">Signing in...</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );
}
