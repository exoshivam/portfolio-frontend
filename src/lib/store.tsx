import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError, type Feed, type Post, type User } from './api';

// The last feed is kept in localStorage so returning visitors see the page instantly,
// even while the backend is waking up; the fresh copy replaces it when it arrives.
const FEED_KEY = 'feed_cache_v1';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch {
    // storage full or disabled: the app still works, just without the cache
  }
}

export interface OpenTabRequest {
  tab: 'Explore' | 'Experience' | 'Contact' | 'Settings';
  target?: string; // e.g. an experience id to scroll to
}

interface Store {
  feed: Feed | null;
  feedError: boolean;
  reloadFeed: () => Promise<void>;
  patchPost: (id: string, change: Partial<Post>) => void;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  signInOpen: boolean;
  setSignInOpen: (open: boolean) => void;
  terminalOpen: boolean;
  setTerminalOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  /** A request (e.g. from search) to open one of the sidebar pages, optionally at an item. */
  openTab: OpenTabRequest | null;
  setOpenTab: (req: OpenTabRequest | null) => void;
  inboxOpen: boolean;
  setInboxOpen: (open: boolean) => void;
  unread: number; // admin inbox
  refreshUnread: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [feed, setFeed] = useState<Feed | null>(() => read<Feed>(FEED_KEY));
  const [feedError, setFeedError] = useState(false);
  const [user, setUser] = useState<User | null>(() => read<User>('user'));
  const [signInOpen, setSignInOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openTab, setOpenTab] = useState<OpenTabRequest | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const reloadFeed = useCallback(async () => {
    try {
      const fresh = await api<Feed>('/feed');
      setFeed(fresh);
      setFeedError(false);
      write(FEED_KEY, fresh);
    } catch {
      setFeedError(true);
    }
  }, []);

  const patchPost = useCallback((id: string, change: Partial<Post>) => {
    setFeed((f) => {
      if (!f) return f;
      const next = { ...f, posts: f.posts.map((p) => (p._id === id ? { ...p, ...change } : p)) };
      write(FEED_KEY, next);
      return next;
    });
  }, []);

  const login = useCallback((token: string, u: User) => {
    write('auth_token', token);
    write('user', u);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    write('auth_token', null);
    write('user', null);
    setUser(null);
  }, []);

  const isAdmin = !!user?.isAdmin;
  const refreshUnread = useCallback(() => {
    if (!isAdmin) return setUnread(0);
    api<{ unread: number }>('/admin/messages/unread')
      .then((r) => setUnread(r.unread))
      .catch(() => {});
  }, [isAdmin]);

  // Keep the admin's inbox badge fresh.
  useEffect(() => {
    refreshUnread();
    if (!isAdmin) return;
    const t = setInterval(refreshUnread, 60_000);
    return () => clearInterval(t);
  }, [isAdmin, refreshUnread]);

  useEffect(() => {
    reloadFeed();

    // Count one profile view per browser session; the server dedupes by IP.
    try {
      if (!sessionStorage.getItem('viewed')) {
        sessionStorage.setItem('viewed', '1');
        api('/views', 'POST').catch(() => {});
      }
    } catch {
      // sessionStorage unavailable
    }

    // Re-check a stored login: refreshes admin status and drops expired tokens.
    if (read('user')) {
      api<User>('/auth/me')
        .then((u) => {
          write('user', u);
          setUser(u);
        })
        .catch((e) => {
          if (e instanceof ApiError && e.status === 401) logout();
        });
    }
  }, [reloadFeed, logout]);

  return (
    <StoreContext.Provider
      value={{
        feed, feedError, reloadFeed, patchPost, user, login, logout, signInOpen, setSignInOpen,
        terminalOpen, setTerminalOpen, searchOpen, setSearchOpen, openTab, setOpenTab, inboxOpen, setInboxOpen, unread, refreshUnread,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside <StoreProvider>');
  return s;
}

/** Anonymous like toggle; the browser remembers what it liked, the server dedupes by IP. */
export function useLike(post: Post) {
  const { patchPost } = useStore();
  const key = `project_likes_${post._id}`;
  const [liked, setLiked] = useState(() => localStorageFlag(key));
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const next = !liked;
    setLiked(next);
    patchPost(post._id, { likes: Math.max(0, post.likes + (next ? 1 : -1)) });
    try {
      const res = await api<{ likes: number }>(`/projects/${post._id}/like`, 'PATCH', { action: next ? 'like' : 'unlike' });
      patchPost(post._id, { likes: res.likes });
      write(key, next ? 'true' : null);
    } catch {
      setLiked(!next);
      patchPost(post._id, { likes: post.likes });
    } finally {
      setBusy(false);
    }
  };
  return { liked, toggle, busy };
}

function localStorageFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}
