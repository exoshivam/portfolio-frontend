import { useEffect, useState } from 'react';
import { Ban, Heart, Pencil, Trash2 } from 'lucide-react';
import { api, type Comment } from '../lib/api';
import { useStore } from '../lib/store';

function CommentItem({ comment, onChange, onRemove, onBlocked, onError }: {
  comment: Comment;
  onChange: (c: Comment) => void;
  onRemove: () => void;
  onBlocked: () => void;
  onError: (msg: string) => void;
}) {
  const { user, setSignInOpen } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text);
  const [busy, setBusy] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const isAuthor = user?.id === comment.userId;
  const canBlock = !!user?.isAdmin && !isAuthor;

  const call = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const toggleLike = () => {
    if (!user) return setSignInOpen(true);
    const next = !comment.liked;
    call(async () => {
      const res = await api<{ likes: number; liked: boolean }>(`/comments/${comment._id}/like`, 'PATCH', { action: next ? 'like' : 'unlike' });
      onChange({ ...comment, ...res });
    });
  };

  const save = () => {
    const text = draft.trim();
    if (!text || text === comment.text) return setEditing(false);
    call(async () => {
      onChange(await api<Comment>(`/comments/${comment._id}`, 'PUT', { text }));
      setEditing(false);
    });
  };

  const remove = () =>
    call(async () => {
      await api(`/comments/${comment._id}`, 'DELETE');
      onRemove();
    });

  const block = () =>
    call(async () => {
      await api(`/admin/users/${comment.userId}/block`, 'POST');
      onBlocked();
    });

  const iconBtn = 'text-gray-500 hover:text-black dark:hover:text-white disabled:opacity-50';

  return (
    <div className="flex gap-2 group">
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save();
                if (e.key === 'Escape') setEditing(false);
              }}
              maxLength={500}
              aria-label="Edit comment"
              className="flex-1 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm text-black dark:text-white focus:outline-none focus:border-blue-500"
            />
            <button onClick={save} disabled={busy} className="text-xs font-semibold text-blue-600 dark:text-blue-400">Save</button>
            <button onClick={() => setEditing(false)} className="text-xs text-gray-500">Cancel</button>
          </div>
        ) : (
          <p className="text-sm break-words">
            <span className="font-semibold text-black dark:text-white">@{comment.username}</span>
            <span className="text-gray-700 dark:text-gray-300 ml-2">{comment.text}</span>
          </p>
        )}
        <p className="text-xs text-gray-500 mt-0.5">
          {new Date(comment.created_at).toLocaleDateString()}
          {comment.edited_at && ' · edited'}
          {comment.likes > 0 && ` · ${comment.likes} ${comment.likes === 1 ? 'like' : 'likes'}`}
        </p>
        {confirmBlock && (
          <div role="alert" className="mt-1.5 p-2 rounded-lg border border-red-500/40 bg-red-500/10 text-xs text-gray-800 dark:text-gray-200">
            Block <b>@{comment.username}</b>? They will be signed out, can't sign in or comment again, and all their comments on the portfolio will be deleted.
            <div className="flex gap-2 mt-2">
              <button onClick={() => setConfirmBlock(false)} className="px-2.5 py-1 rounded bg-gray-200 dark:bg-gray-800">Cancel</button>
              <button onClick={block} disabled={busy} className="px-2.5 py-1 rounded bg-red-600 text-white disabled:opacity-60">{busy ? 'Blocking...' : 'Block user'}</button>
            </div>
          </div>
        )}
      </div>

      {!editing && (
        <div className="flex items-start gap-2 pt-0.5">
          {isAuthor && (
            <button onClick={() => { setDraft(comment.text); setEditing(true); }} aria-label="Edit comment" className={`${iconBtn} opacity-0 group-hover:opacity-100 focus:opacity-100`}>
              <Pencil size={13} />
            </button>
          )}
          {(isAuthor || user?.isAdmin) && (
            <button onClick={remove} disabled={busy} aria-label="Delete comment" className={`${iconBtn} hover:!text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100`}>
              <Trash2 size={13} />
            </button>
          )}
          {canBlock && (
            <button onClick={() => setConfirmBlock(true)} disabled={busy} aria-label={`Block @${comment.username}`} title="Block user" className={`${iconBtn} hover:!text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100`}>
              <Ban size={13} />
            </button>
          )}
          <button onClick={toggleLike} disabled={busy} aria-pressed={comment.liked} aria-label={comment.liked ? 'Unlike comment' : 'Like comment'} className={iconBtn}>
            <Heart size={13} className={comment.liked ? 'fill-red-500 text-red-500' : ''} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function CommentsSection({ postId }: { postId: string }) {
  const { user, setSignInOpen } = useStore();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  // Reload when the user changes so the "liked" flags match whoever is signed in.
  useEffect(() => {
    setComments(null);
    api<Comment[]>(`/projects/${postId}/comments`)
      .then(setComments)
      .catch(() => setComments([]));
  }, [postId, user?.id]);

  const post = async () => {
    const trimmed = text.trim();
    if (!trimmed || posting) return;
    setPosting(true);
    setError('');
    try {
      const c = await api<Comment>(`/projects/${postId}/comments`, 'POST', { text: trimmed });
      setComments((cs) => [c, ...(cs ?? [])]);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post the comment');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-3">
      {user ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && post()}
            placeholder="Add a comment..."
            maxLength={500}
            aria-label="Add a comment"
            className="flex-1 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 text-black dark:text-white"
          />
          <button
            onClick={post}
            disabled={posting || !text.trim()}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:text-gray-500 disabled:cursor-not-allowed font-semibold text-sm"
          >
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>
      ) : (
        <button onClick={() => setSignInOpen(true)} className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-orange-500 py-1">
          Sign in to comment
        </button>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="max-h-56 overflow-y-auto space-y-2">
        {comments === null ? (
          <p className="text-xs text-gray-500">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-gray-500">No comments yet</p>
        ) : (
          comments.map((c) => (
            <CommentItem
              key={c._id}
              comment={c}
              onChange={(updated) => setComments((cs) => cs?.map((x) => (x._id === c._id ? updated : x)) ?? null)}
              onRemove={() => setComments((cs) => cs?.filter((x) => x._id !== c._id) ?? null)}
              onBlocked={() => setComments((cs) => cs?.filter((x) => x.userId !== c.userId) ?? null)}
              onError={setError}
            />
          ))
        )}
      </div>
    </div>
  );
}
