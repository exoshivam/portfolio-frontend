import { useEffect, useState } from 'react';
import { Ban } from 'lucide-react';
import { api } from '../lib/api';

interface BlockedUser {
  id: string;
  email: string;
  username: string;
  name: string;
  blocked_at: string;
}

/** Admin-only list in Settings: people blocked from a comment, with Unblock. */
export default function BlockedUsers() {
  const [list, setList] = useState<BlockedUser[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<BlockedUser[]>('/admin/blocked-users')
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load blocked users'));
  }, []);

  const unblock = async (u: BlockedUser) => {
    setError('');
    try {
      await api(`/admin/users/${u.id}/block`, 'DELETE');
      setList((l) => l?.filter((x) => x.id !== u.id) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not unblock');
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold flex items-center gap-2 text-black dark:text-white">
        <Ban size={20} />
        Blocked users
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        Block someone from the ⊘ button on their comment. Unblocking lets them sign in again; deleted comments don't come back.
      </p>
      <ul className="mt-3 space-y-2">
        {list?.map((u) => (
          <li key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-800">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-black dark:text-white truncate">{u.name || `@${u.username}`}</p>
              <p className="text-xs text-gray-500 truncate">
                {u.email}
                {u.blocked_at && ` · blocked ${new Date(u.blocked_at).toLocaleDateString()}`}
              </p>
            </div>
            <button onClick={() => unblock(u)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-700 text-black dark:text-white hover:border-orange-500">
              Unblock
            </button>
          </li>
        ))}
        {list?.length === 0 && <li className="text-sm text-gray-500">Nobody is blocked.</li>}
        {list === null && !error && <li className="text-sm text-gray-500">Loading...</li>}
      </ul>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}
