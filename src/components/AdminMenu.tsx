import { useEffect, useRef, useState } from 'react';
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from 'lucide-react';
import { api, type Post } from '../lib/api';
import { useStore } from '../lib/store';

interface AdminMenuProps {
  post: Post;
  onEdit: () => void;
  onDeleted?: () => void;
  onArchiveChange?: () => void;
}

/** The "⋯" menu on a post. Renders nothing unless the signed-in user is the admin. */
export default function AdminMenu({ post, onEdit, onDeleted, onArchiveChange }: AdminMenuProps) {
  const { user, reloadFeed } = useStore();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!user?.isAdmin) return null;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      await reloadFeed();
      setOpen(false);
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const item = 'w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50';

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Post options"
        aria-expanded={open}
        className="p-1 rounded-full text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
      >
        <MoreHorizontal size={20} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden text-black dark:text-white">
          {confirming ? (
            <div className="p-4 space-y-3">
              <p className="text-sm">Delete “{post.title}”? Its comments and images go too.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirming(false)} className="flex-1 px-3 py-1.5 text-sm rounded bg-gray-200 dark:bg-gray-800">
                  Cancel
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await api(`/projects/${post._id}`, 'DELETE');
                      onDeleted?.();
                    })
                  }
                  className="flex-1 px-3 py-1.5 text-sm rounded bg-red-600 text-white disabled:opacity-50"
                >
                  {busy ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                className={item}
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
              >
                <Pencil size={16} /> Edit
              </button>
              {!post.archived && (
                <button
                  className={item}
                  disabled={busy}
                  onClick={() => run(() => api(`/projects/${post._id}/pin`, 'PATCH', { pinned: !post.pinned }))}
                >
                  {post.pinned ? <PinOff size={16} /> : <Pin size={16} />} {post.pinned ? 'Unpin' : 'Pin to top'}
                </button>
              )}
              <button
                className={item}
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await api(`/projects/${post._id}/archive`, 'PATCH', { archived: !post.archived });
                    onArchiveChange?.();
                  })
                }
              >
                {post.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                {post.archived ? 'Unarchive (show again)' : 'Archive (hide from others)'}
              </button>
              <button className={`${item} text-red-600`} onClick={() => setConfirming(true)}>
                <Trash2 size={16} /> Delete
              </button>
            </>
          )}
          {error && <p className="px-4 pb-3 text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}
