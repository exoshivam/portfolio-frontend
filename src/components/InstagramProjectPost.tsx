import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, Pin, Share2, X } from 'lucide-react';
import { categoryLabel, img, postLink, type Post } from '../lib/api';
import { useLike, useStore } from '../lib/store';
import AdminMenu from './AdminMenu';
import AIOverview from './AIOverview';
import CommentsSection from './CommentsSection';
import PostEditor from './PostEditor';

interface Props {
  post: Post;
  onClose: () => void;
}

function NoImage({ title }: { title: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-orange-500/80 to-pink-600/80 text-white font-bold text-center">
      {title}
    </div>
  );
}

export default function InstagramProjectPost({ post: initial, onClose }: Props) {
  const { feed } = useStore();
  // Follow the live copy so edits, pins and likes show up immediately.
  const post = feed?.posts.find((p) => p._id === initial._id) ?? initial;
  const images = post.image_urls;
  const [index, setIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState('');
  const { liked, toggle, busy } = useLike(post);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !editing && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, editing]);

  useEffect(() => {
    if (index >= images.length) setIndex(0);
  }, [images.length, index]);

  const share = async () => {
    const url = postLink(post._id);
    if (navigator.share) {
      navigator.share({ title: post.title, url }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast('Link copied to clipboard!');
    } catch {
      setToast(url);
    }
    setTimeout(() => setToast(''), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg">{toast}</div>
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={post.title}
        className="bg-white dark:bg-black rounded-lg max-w-5xl w-full h-[90vh] flex flex-col md:flex-row overflow-hidden border border-gray-300 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full md:w-1/2 h-1/3 md:h-full relative bg-gray-100 dark:bg-black flex items-center justify-center group">
          {images.length ? (
            <img src={img(images[index], 1200)} alt={`${post.title} ${index + 1}`} className="w-full h-full object-contain" />
          ) : (
            <NoImage title={post.title} />
          )}
          {images.length > 1 && (
            <>
              <button
                onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 p-2 rounded-full text-white md:opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={() => setIndex((i) => (i + 1) % images.length)}
                aria-label="Next image"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 p-2 rounded-full text-white md:opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                <ChevronRight size={24} />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    aria-label={`Image ${i + 1}`}
                    className={`h-2 rounded-full transition-all ${i === index ? 'bg-white w-6' : 'bg-gray-500 w-2'}`}
                  />
                ))}
              </div>
            </>
          )}
          <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 p-2 rounded-full text-white md:hidden">
            <X size={22} />
          </button>
        </div>

        <div className="flex w-full md:w-1/2 h-2/3 md:h-full flex-col text-black dark:text-white border-t md:border-t-0 md:border-l border-gray-300 dark:border-gray-800">
          <div className="p-4 border-b border-gray-300 dark:border-gray-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-orange-500 to-pink-500" />
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{post.title}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  {post.pinned && <Pin size={12} className="text-orange-500" />}
                  {categoryLabel(post.category)}
                  {post.archived && <span className="ml-1 px-1.5 rounded bg-gray-500 text-white text-[10px]">ARCHIVED</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <AdminMenu post={post} onEdit={() => setEditing(true)} onDeleted={onClose} onArchiveChange={onClose} />
              <button onClick={onClose} aria-label="Close" className="hidden md:block p-1 text-gray-500 hover:text-black dark:hover:text-white">
                <X size={22} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {post.description && <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line">{post.description}</p>}

            <AIOverview post={post} />

            {post.technologies.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase">Technologies</p>
                <div className="flex flex-wrap gap-2">
                  {post.technologies.map((t) => (
                    <span key={t} className="px-3 py-1 bg-gray-200 dark:bg-gray-900 border border-gray-400 dark:border-gray-700 rounded-full text-xs text-gray-800 dark:text-gray-300">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {post.project_url && (
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase">Link</p>
                <a href={post.project_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-xs break-all">
                  {post.project_url}
                </a>
              </div>
            )}

            <div className="pt-4 border-t border-gray-300 dark:border-gray-800">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-3">Comments</p>
              <CommentsSection postId={post._id} />
            </div>
          </div>

          <div className="border-t border-gray-300 dark:border-gray-800 p-4 flex items-center gap-4">
            <button onClick={toggle} disabled={busy} aria-pressed={liked} aria-label={liked ? 'Unlike' : 'Like'} className="hover:opacity-70">
              <Heart size={24} fill={liked ? '#ef4444' : 'none'} color={liked ? '#ef4444' : 'currentColor'} />
            </button>
            <p className="text-sm font-semibold">
              {post.likes} {post.likes === 1 ? 'like' : 'likes'}
            </p>
            <button onClick={share} aria-label="Share" className="ml-auto hover:opacity-70">
              <Share2 size={22} />
            </button>
          </div>
        </div>
      </div>
      {editing && <PostEditor post={post} onClose={() => setEditing(false)} />}
    </div>
  );
}
