import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ExternalLink, Pause, Pencil, Trash2, X } from 'lucide-react';
import { formatMonth, img, type StorySlide } from '../lib/api';
import { useStore } from '../lib/store';

const SLIDE_MS = 5000;
const HOLD_MS = 200; // a press longer than this pauses instead of navigating

/** A set of stories shown together, e.g. everything about one skill. */
export interface StoryGroup {
  id: string;
  title: string;
  avatar: ReactNode;
  slides: (StorySlide & { id?: string; created_at?: string })[];
}

interface Props {
  stories: StoryGroup[];
  startIndex: number;
  startSlide?: number;
  onClose: () => void;
  onSeen?: (group: StoryGroup) => void;
  /** Called each time a slide comes on screen. */
  onSlideShown?: (group: StoryGroup, slideIdx: number) => void;
  /** Small text next to the title; defaults to the slide's month. */
  subtitle?: (group: StoryGroup, slideIdx: number) => string;
  /** Admin pencil button. */
  onEdit?: (group: StoryGroup) => void;
  /** Admin delete button: the confirmation text and the action (the viewer closes afterwards). */
  deletion?: { prompt: (group: StoryGroup, slideIdx: number) => string; run: (group: StoryGroup, slideIdx: number) => Promise<void> };
  /** Bar at the bottom (likes, replies, activity). `setPaused` holds the story while typing. */
  footer?: (ctx: { group: StoryGroup; slideIdx: number; setPaused: (p: boolean) => void }) => ReactNode;
}

export default function StoryViewer({ stories, startIndex, startSlide = 0, onClose, onSeen, onSlideShown, subtitle, onEdit, deletion, footer }: Props) {
  const { user, reloadFeed } = useStore();
  const [storyIdx, setStoryIdx] = useState(startIndex);
  const [slideIdx, setSlideIdx] = useState(startSlide);
  const [footerPaused, setFooterPaused] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1 of the current slide
  const [held, setHeld] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const pressAt = useRef(0);
  const elapsed = useRef(0); // fraction of the current slide already shown

  const story = stories[storyIdx];
  const slide = story?.slides[slideIdx];
  const paused = held || hidden || confirming || footerPaused || (!!slide?.image_url && !loaded);

  useEffect(() => {
    if (story) onSeen?.(story);
  }, [story, onSeen]);

  useEffect(() => {
    if (story) onSlideShown?.(story, slideIdx);
    // only when the slide changes, not when the story list object is refreshed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id, slideIdx]);

  const goTo = useCallback(
    (sIdx: number, slIdx: number) => {
      if (sIdx < 0) {
        elapsed.current = 0;
        setProgress(0);
        return setSlideIdx(0);
      }
      if (sIdx >= stories.length) return onClose();
      setStoryIdx(sIdx);
      setSlideIdx(slIdx);
      elapsed.current = 0;
      setProgress(0);
      setLoaded(false);
    },
    [stories.length, onClose],
  );

  const next = useCallback(() => {
    if (!story) return;
    if (slideIdx + 1 < story.slides.length) goTo(storyIdx, slideIdx + 1);
    else goTo(storyIdx + 1, 0);
  }, [story, storyIdx, slideIdx, goTo]);

  const prev = useCallback(() => {
    if (slideIdx > 0) goTo(storyIdx, slideIdx - 1);
    else goTo(storyIdx - 1, 0);
  }, [storyIdx, slideIdx, goTo]);

  // Advance the progress bar while not paused.
  useEffect(() => {
    if (paused || !story) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsed.current += (now - last) / SLIDE_MS;
      last = now;
      if (elapsed.current >= 1) return next();
      setProgress(elapsed.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, story, storyIdx, slideIdx, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirming || footerPaused) return; // typing a reply or reading activity
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ') {
        e.preventDefault();
        setHeld((h) => !h);
      }
    };
    const onVisibility = () => setHidden(document.hidden);
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [next, prev, onClose, confirming, footerPaused]);

  if (!story || !slide) return null;

  const onPointerDown = () => {
    pressAt.current = Date.now();
    setHeld(true);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setHeld(false);
    if (Date.now() - pressAt.current > HOLD_MS) return; // it was a hold-to-pause
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < rect.width * 0.3) prev();
    else next();
  };

  const remove = async () => {
    if (!deletion) return;
    try {
      await deletion.run(story, slideIdx);
      await reloadFeed();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete');
    }
  };

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${story.title} story`}
        onClick={stop}
        className="relative h-full w-full sm:h-[92vh] sm:w-auto sm:aspect-[9/16] sm:rounded-2xl overflow-hidden bg-gray-950 select-none"
      >
        {/* Slide content */}
        {slide.image_url ? (
          <>
            <img src={img(slide.image_url, 400)} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-50" />
            <img
              key={slide.image_url}
              src={img(slide.image_url, 1080)}
              alt={slide.title || story.title}
              onLoad={() => setLoaded(true)}
              onError={() => setLoaded(true)}
              className="absolute inset-0 w-full h-full object-contain"
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 via-orange-600 to-pink-700" />
        )}

        {/* Tap zones: left 30% back, rest forward; press and hold to pause */}
        <div
          className="absolute inset-0 z-10"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={() => setHeld(false)}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* Top: progress bars and header */}
        <div className="absolute inset-x-0 top-0 z-20 p-3 pb-10 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          <div className="flex gap-1">
            {story.slides.map((_, i) => (
              <div key={i} className="h-0.5 flex-1 rounded-full bg-white/30 overflow-hidden">
                <div className="h-full bg-white" style={{ width: `${(i < slideIdx ? 1 : i === slideIdx ? progress : 0) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shrink-0">
              {story.avatar}
            </div>
            <span className="font-semibold text-sm truncate">{story.title}</span>
            {(() => {
              const sub = subtitle ? subtitle(story, slideIdx) : slide.date ? formatMonth(slide.date) : '';
              return sub && <span className="text-xs text-white/70 shrink-0">{sub}</span>;
            })()}
            {paused && held && <Pause size={14} className="text-white/80" />}
            <div className="ml-auto flex items-center gap-1 pointer-events-auto">
              {user?.isAdmin && onEdit && (
                <button onClick={() => onEdit(story)} aria-label="Edit stories" className="p-1.5 rounded-full hover:bg-white/15">
                  <Pencil size={18} />
                </button>
              )}
              {user?.isAdmin && deletion && (
                <button onClick={() => setConfirming(true)} aria-label="Delete story" className="p-1.5 rounded-full hover:bg-white/15">
                  <Trash2 size={18} />
                </button>
              )}
              <button onClick={onClose} aria-label="Close story" className="p-1.5 rounded-full hover:bg-white/15">
                <X size={22} />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom: caption */}
        {(slide.title || slide.text || slide.link) && (
          <div
            className={`absolute inset-x-0 z-20 p-5 text-white pointer-events-none ${
              slide.image_url
                ? `bottom-0 pt-16 bg-gradient-to-t from-black/85 via-black/50 to-transparent ${footer ? 'pb-24' : ''}`
                : 'top-1/2 -translate-y-1/2 text-center'
            }`}
          >
            {slide.title && <h3 className={`font-extrabold ${slide.image_url ? 'text-xl' : 'text-3xl'} leading-tight`}>{slide.title}</h3>}
            {slide.text && <p className={`mt-2 whitespace-pre-line ${slide.image_url ? 'text-sm text-white/90' : 'text-base text-white/95'}`}>{slide.text}</p>}
            {slide.link && (
              <a
                href={slide.link}
                target="_blank"
                rel="noopener noreferrer"
                onPointerDown={stop}
                onPointerUp={stop}
                className="pointer-events-auto mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black text-sm font-semibold"
              >
                Open link <ExternalLink size={14} />
              </a>
            )}
          </div>
        )}

        {footer && (
          <div className="absolute inset-x-0 bottom-0 z-30" onPointerDown={stop} onPointerUp={stop}>
            {footer({ group: story, slideIdx, setPaused: setFooterPaused })}
          </div>
        )}

        {confirming && (
          <div className="absolute inset-0 z-40 bg-black/70 flex items-center justify-center p-6">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 text-white text-center space-y-4 max-w-xs">
              <p>{deletion?.prompt(story, slideIdx)}</p>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => setConfirming(false)} className="flex-1 py-2 rounded-lg bg-gray-700">Cancel</button>
                <button onClick={remove} className="flex-1 py-2 rounded-lg bg-red-600 font-semibold">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
