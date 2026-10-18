import { lazy, Suspense, useEffect, useState } from 'react';
import { Archive, Cpu, Heart, Lightbulb, MessageCircle, Pin, Plus, Share2, Sparkles, Trophy, Zap } from 'lucide-react';
import { api, categoryLabel, img, postLink, type Category, type Post } from '../lib/api';
import { useLike, useStore } from '../lib/store';
import AdminMenu from './AdminMenu';
import CommentsSection from './CommentsSection';
import Sidebar from './Sidebar';

const PostView = lazy(() => import('./InstagramProjectPost'));
const PostEditor = lazy(() => import('./PostEditor'));

const ICONS: Record<Category, typeof Sparkles> = {
  projects: Sparkles,
  experiments: Zap,
  hackathons: Trophy,
  side_ideas: Lightbulb,
  iot_works: Cpu,
};

interface ExploreModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

function ExploreCard({ post, onOpen, onEdit, onToast }: { post: Post; onOpen: () => void; onEdit: () => void; onToast: (m: string) => void }) {
  const { liked, toggle, busy } = useLike(post);
  const [showComments, setShowComments] = useState(false);
  const Icon = ICONS[post.category];

  const share = async () => {
    const url = postLink(post._id);
    if (navigator.share) {
      navigator.share({ title: post.title, url }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      onToast('Link copied to clipboard!');
    } catch {
      onToast(url);
    }
  };

  return (
    <article className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg hover:border-gray-400 dark:hover:border-gray-700 transition-colors">
      <div className="px-4 py-3 flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
        <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
          <Icon size={20} />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-gray-800 dark:text-gray-300">r/{categoryLabel(post.category)}</div>
          <div className="text-gray-500">Posted by u/developer</div>
        </div>
        {post.pinned && (
          <span className="flex items-center gap-1 text-orange-500 font-semibold">
            <Pin size={14} /> Pinned
          </span>
        )}
        {post.archived && (
          <span className="flex items-center gap-1 text-gray-500 font-semibold">
            <Archive size={14} /> Archived
          </span>
        )}
        <AdminMenu post={post} onEdit={onEdit} />
      </div>

      <button onClick={onOpen} className="block w-full text-left px-4 text-black dark:text-white hover:text-orange-600 dark:hover:text-orange-400">
        <h3 className="text-base font-bold mb-2 line-clamp-2">{post.title}</h3>
      </button>
      {post.description && <p className="px-4 mb-3 text-sm text-gray-700 dark:text-gray-400 line-clamp-2">{post.description}</p>}

      <button onClick={onOpen} aria-label={`Open ${post.title}`} className="block w-full bg-gray-200 dark:bg-gray-800 aspect-video max-h-[70vh] overflow-hidden group">
        {post.image_urls[0] ? (
          <img src={img(post.image_urls[0], 1600)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <span className="w-full h-full flex items-center justify-center font-bold text-white bg-gradient-to-br from-orange-500/80 to-pink-600/80">{post.title}</span>
        )}
      </button>

      {post.technologies.length > 0 && (
        <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800/50 flex flex-wrap gap-1">
          {post.technologies.slice(0, 4).map((t) => (
            <span key={t} className="text-xs px-2 py-1 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full">
              {t}
            </span>
          ))}
          {post.technologies.length > 4 && <span className="text-xs px-2 py-1 text-gray-600 dark:text-gray-400">+{post.technologies.length - 4}</span>}
        </div>
      )}

      {!post.archived && (
      <div className="px-3 py-2 flex items-center justify-between text-gray-600 dark:text-gray-400 text-sm border-t border-gray-300 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <button onClick={toggle} disabled={busy} aria-pressed={liked} className="flex items-center gap-1.5 hover:text-orange-500 hover:bg-orange-500/10 px-2 py-1 rounded">
            <Heart size={16} className={liked ? 'fill-orange-500 text-orange-500' : ''} />
            <span className="text-xs">{post.likes}</span>
          </button>
          <button onClick={() => setShowComments((s) => !s)} aria-expanded={showComments} className="flex items-center gap-1.5 hover:text-blue-500 hover:bg-blue-500/10 px-2 py-1 rounded">
            <MessageCircle size={16} />
            <span className="text-xs">{showComments ? 'Hide' : 'Comments'}</span>
          </button>
          <button onClick={share} className="flex items-center gap-1.5 hover:text-green-500 hover:bg-green-500/10 px-2 py-1 rounded">
            <Share2 size={16} />
            <span className="text-xs">Share</span>
          </button>
        </div>
        {post.project_url && (
          <a href={post.project_url} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded hover:opacity-90 font-semibold">
            View →
          </a>
        )}
      </div>
      )}

      {showComments && (
        <div className="px-4 py-3 bg-gray-100 dark:bg-gray-800/30 border-t border-gray-300 dark:border-gray-800">
          <CommentsSection postId={post._id} />
        </div>
      )}
    </article>
  );
}

export default function ExploreModal({ isOpen, onClose, activeTab, onTabChange }: ExploreModalProps) {
  const { feed, user } = useStore();
  const [selected, setSelected] = useState<Post | null>(null);
  const [editing, setEditing] = useState<Post | 'new' | null>(null);
  const [toast, setToast] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [archived, setArchived] = useState<Post[] | null>(null);

  // Re-fetch when opened and after any admin action (each one reloads the feed).
  useEffect(() => {
    if (!isOpen || !showArchived || !user?.isAdmin) return;
    api<Post[]>('/admin/archived')
      .then(setArchived)
      .catch(() => setArchived([]));
  }, [isOpen, showArchived, user?.isAdmin, feed]);

  if (!isOpen) return null;
  const list = showArchived ? archived : feed?.posts ?? null;

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 2500);
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-black z-50 overflow-hidden flex flex-col lg:flex-row">
      {toast && <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg">{toast}</div>}

      <Sidebar activeTab={activeTab} onTabChange={onTabChange} onModalClose={onClose} />

      <div className="flex-1 flex flex-col overflow-hidden">

        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-950">
          <div className="pt-4 pb-28 px-3 lg:px-8 space-y-4">
            {user?.isAdmin && (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing('new')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-orange-500 hover:text-orange-500 font-semibold"
                >
                  <Plus size={18} /> New post
                </button>
                <button
                  onClick={() => setShowArchived((v) => !v)}
                  aria-pressed={showArchived}
                  className={`flex items-center gap-2 px-4 rounded-lg border-2 font-semibold ${
                    showArchived ? 'border-orange-500 text-orange-500' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-orange-500'
                  }`}
                >
                  <Archive size={18} /> {showArchived ? 'Back to feed' : 'Archived'}
                </button>
              </div>
            )}
            {showArchived && <p className="text-sm text-gray-500 px-1">Archived posts are hidden from everyone except you.</p>}

            {!list ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-80 rounded-lg bg-gray-200 dark:bg-gray-900 animate-pulse" />)}
              </div>
            ) : list.length === 0 ? (
              <div className="flex items-center justify-center h-96 text-gray-600 dark:text-gray-400 text-center">
                <div>
                  <Sparkles size={48} className="mx-auto mb-4 opacity-50" />
                  <p>{showArchived ? 'No archived posts' : 'No posts yet'}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4">
                  {list.map((p) => (
                    <ExploreCard key={p._id} post={p} onOpen={() => setSelected(p)} onEdit={() => setEditing(p)} onToast={showToast} />
                  ))}
                </div>
                {!showArchived && <p className="py-4 text-center text-gray-600 dark:text-gray-500 text-sm">That's all folks! More coming soon...</p>}
              </>
            )}
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        {selected && <PostView post={selected} onClose={() => setSelected(null)} />}
        {editing && (
          <PostEditor
            post={editing === 'new' ? undefined : editing}
            defaultCategory="experiments"
            onClose={() => setEditing(null)}
          />
        )}
      </Suspense>
    </div>
  );
}
