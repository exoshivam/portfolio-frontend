import { lazy, Suspense, useEffect, useState } from 'react';
import { Grid3x3, Heart, Pin, Plus } from 'lucide-react';
import { img, type Post } from '../lib/api';
import { useStore } from '../lib/store';

const PostView = lazy(() => import('./InstagramProjectPost'));
const PostEditor = lazy(() => import('./PostEditor'));

export default function ProjectsGrid() {
  const { feed, user } = useStore();
  const [selected, setSelected] = useState<Post | null>(null);
  const [creating, setCreating] = useState(false);
  const posts = feed?.posts.filter((p) => p.category === 'projects');

  // Open a shared link (?post=<id>) once the feed is available.
  const linked = new URLSearchParams(window.location.search).get('post');
  useEffect(() => {
    if (!linked || !feed) return;
    const p = feed.posts.find((x) => x._id === linked);
    if (!p) return; // maybe only in the fresh feed, which is still loading
    setSelected(p);
    window.history.replaceState(null, '', window.location.pathname);
  }, [linked, feed]);

  return (
    <>
      <div className="border-t border-gray-200 dark:border-gray-800 px-2 md:px-0">
        <div className="relative flex items-center justify-center gap-2 py-3 border-b border-gray-200 dark:border-gray-800">
          <Grid3x3 size={16} className="text-black dark:text-white" />
          <span className="text-xs font-semibold tracking-widest text-black dark:text-white">PROJECTS</span>
          {user?.isAdmin && (
            <button
              onClick={() => setCreating(true)}
              className="absolute right-2 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:opacity-90"
            >
              <Plus size={14} /> New post
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1">
          {posts
            ? posts.map((p, i) => (
                <button
                  key={p._id}
                  onClick={() => setSelected(p)}
                  aria-label={p.title}
                  className="aspect-square relative group overflow-hidden bg-gray-300 dark:bg-gray-900"
                >
                  {p.image_urls[0] ? (
                    <img
                      src={img(p.image_urls[0], 480)}
                      alt=""
                      width={480}
                      height={480}
                      loading={i < 6 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center p-2 text-sm font-bold text-white bg-gradient-to-br from-orange-500/80 to-pink-600/80">
                      {p.title}
                    </span>
                  )}
                  {p.pinned && <Pin size={18} className="absolute top-2 right-2 text-white drop-shadow fill-white" aria-label="Pinned" />}
                  <span className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 text-white font-semibold opacity-0 group-hover:opacity-100">
                    <Heart size={18} fill="white" /> {p.likes}
                  </span>
                </button>
              ))
            : Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-900 animate-pulse" />)}
        </div>
      </div>

      <Suspense fallback={null}>
        {selected && <PostView post={selected} onClose={() => setSelected(null)} />}
        {creating && <PostEditor defaultCategory="projects" onClose={() => setCreating(false)} />}
      </Suspense>
    </>
  );
}
