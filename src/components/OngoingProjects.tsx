import { lazy, Suspense, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, ChevronDown, Circle, ExternalLink, Hammer, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api, formatMonth, img, timeAgo, type ActiveProject } from '../lib/api';
import { useStore } from '../lib/store';

const OngoingEditor = lazy(() => import('./OngoingEditor'));
const PostEditor = lazy(() => import('./PostEditor'));

// Status pill and progress bar colours. Full class strings so Tailwind keeps them.
const STATUS: Record<string, { pill: string; bar: string }> = {
  Planning: { pill: 'bg-slate-500/15 text-slate-500 dark:text-slate-300', bar: 'from-slate-400 to-slate-500' },
  'In Progress': { pill: 'bg-blue-500/15 text-blue-600 dark:text-blue-400', bar: 'from-orange-500 to-pink-500' },
  Testing: { pill: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', bar: 'from-amber-400 to-orange-500' },
  'Almost done': { pill: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', bar: 'from-emerald-400 to-green-500' },
  Paused: { pill: 'bg-gray-500/15 text-gray-500', bar: 'from-gray-400 to-gray-500' },
};
const statusStyle = (s: string) => STATUS[s] ?? STATUS['In Progress'];

const toInput = (a: ActiveProject) => ({
  title: a.title,
  description: a.description,
  image_urls: a.image_urls,
  project_url: a.project_url,
  technologies: a.technologies,
  status: a.status,
  progress: a.progress,
  eta: a.eta,
  milestones: a.milestones,
});

function ProgressBar({ value, status }: { value: number; status: string }) {
  // Grows from zero when shown.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(value), 50);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div className="flex-1 bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 min-w-0 overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={`bg-gradient-to-r ${statusStyle(status).bar} h-full rounded-full transition-[width] duration-700 ease-out`} style={{ width: `${shown}%` }} />
    </div>
  );
}

function Row({ a, index, count, onEdit, onComplete }: { a: ActiveProject; index: number; count: number; onEdit: () => void; onComplete: () => void }) {
  const { user, reloadFeed } = useStore();
  const admin = !!user?.isAdmin;
  const [open, setOpen] = useState(false);
  const [slider, setSlider] = useState(a.progress);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => setSlider(a.progress), [a.progress]);

  const run = async (fn: () => Promise<unknown>) => {
    setError('');
    try {
      await fn();
      await reloadFeed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
  };
  const saveProgress = () => slider !== a.progress && run(() => api(`/active-projects/${a._id}/progress`, 'PATCH', { progress: slider }));
  const toggleMilestone = (i: number) =>
    run(() =>
      api(`/active-projects/${a._id}`, 'PUT', {
        ...toInput(a),
        milestones: a.milestones.map((m, j) => (j === i ? { ...m, done: !m.done } : m)),
      }),
    );

  const style = statusStyle(a.status);
  const hasMilestones = a.milestones.length > 0;

  return (
    <li className="border-b border-gray-200 dark:border-gray-800 last:border-b-0">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        {a.image_urls[0] ? (
          <img src={img(a.image_urls[0], 96)} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
        ) : (
          <span className="w-12 h-12 rounded-full shrink-0 bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white"><Hammer size={20} /></span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-black dark:text-white truncate">{a.title}</h3>
            {a.eta && <span className="text-[11px] text-gray-500 shrink-0">· ETA {formatMonth(a.eta)}</span>}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${style.pill}`}>{a.status}</span>
            <ProgressBar value={admin ? slider : a.progress} status={a.status} />
            <span className="text-xs text-gray-600 dark:text-gray-400 shrink-0 w-9 text-right">{admin ? slider : a.progress}%</span>
          </div>
        </div>
        <ChevronDown size={18} className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 pl-[4.75rem] space-y-3 text-sm">
          {a.description && <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{a.description}</p>}
          {a.technologies.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {a.technologies.map((t) => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{t}</span>
              ))}
            </div>
          )}
          {hasMilestones && (
            <ul className="space-y-1">
              {a.milestones.map((m, i) => (
                <li key={i}>
                  <button
                    onClick={() => admin && toggleMilestone(i)}
                    disabled={!admin}
                    className={`flex items-center gap-2 text-left ${admin ? 'hover:opacity-80' : 'cursor-default'}`}
                  >
                    {m.done ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> : <Circle size={16} className="text-gray-400 shrink-0" />}
                    <span className={m.done ? 'text-gray-500 line-through' : 'text-gray-800 dark:text-gray-200'}>{m.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            {a.project_url && (
              <a href={a.project_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-pink-500">
                Open project <ExternalLink size={13} />
              </a>
            )}
            {a.updated_at && <span className="text-xs text-gray-500">Updated {timeAgo(a.updated_at) === 'now' ? 'just now' : `${timeAgo(a.updated_at)} ago`}</span>}
          </div>

          {admin && (
            <div className="pt-3 mt-1 border-t border-dashed border-gray-300 dark:border-gray-700 space-y-3">
              {hasMilestones ? (
                <p className="text-xs text-gray-500">Progress follows the milestones: tick them above.</p>
              ) : (
                <label className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                  Progress
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={slider}
                    onChange={(e) => setSlider(Number(e.target.value))}
                    onPointerUp={saveProgress}
                    onKeyUp={saveProgress}
                    className="flex-1 accent-orange-500"
                    aria-label={`Progress of ${a.title}`}
                  />
                  <span className="w-9 text-right font-semibold">{slider}%</span>
                </label>
              )}
              {confirming ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex-1">Delete “{a.title}”?</span>
                  <button onClick={() => setConfirming(false)} className="px-2.5 py-1 rounded bg-gray-200 dark:bg-gray-800">Cancel</button>
                  <button onClick={() => run(() => api(`/active-projects/${a._id}`, 'DELETE'))} className="px-2.5 py-1 rounded bg-red-600 text-white">Delete</button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Edit', icon: <Pencil size={13} />, onClick: onEdit },
                    { label: 'Up', icon: <ArrowUp size={13} />, onClick: () => run(() => api(`/active-projects/${a._id}/move`, 'POST', { direction: -1 })), disabled: index === 0 },
                    { label: 'Down', icon: <ArrowDown size={13} />, onClick: () => run(() => api(`/active-projects/${a._id}/move`, 'POST', { direction: 1 })), disabled: index === count - 1 },
                    { label: 'Mark as completed', icon: <CheckCircle2 size={13} />, onClick: onComplete },
                  ].map((b) => (
                    <button key={b.label} onClick={b.onClick} disabled={b.disabled} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border border-gray-300 dark:border-gray-700 hover:border-orange-500 hover:text-orange-500 disabled:opacity-40">
                      {b.icon} {b.label}
                    </button>
                  ))}
                  <button onClick={() => setConfirming(true)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border border-gray-300 dark:border-gray-700 text-red-500 hover:border-red-500">
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              )}
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/** "Ongoing Projects" opened from the profile's counter. The admin can manage them here. */
export default function OngoingProjects({ onClose }: { onClose: () => void }) {
  const { feed, user } = useStore();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<ActiveProject | 'new' | null>(null);
  const [completing, setCompleting] = useState<ActiveProject | null>(null);
  const list = feed?.active_projects ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !editing && !completing && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, editing, completing]);

  const q = query.trim().toLowerCase();
  const shown = list.filter(
    (a) => !q || a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.technologies.some((t) => t.toLowerCase().includes(q)),
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ongoing-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col border border-gray-300 dark:border-gray-700"
      >
        <div className="flex items-center gap-3 p-4 border-b border-gray-300 dark:border-gray-700">
          <h2 id="ongoing-title" className="text-lg font-bold text-black dark:text-white flex-1">
            Ongoing Projects <span className="text-gray-500 font-normal text-sm">({list.length})</span>
          </h2>
          {user?.isAdmin && (
            <button onClick={() => setEditing('new')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-pink-500">
              <Plus size={14} /> New
            </button>
          )}
          <button onClick={onClose} aria-label="Close" className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">
            <X size={22} />
          </button>
        </div>

        {list.length > 3 && (
          <div className="p-4 border-b border-gray-300 dark:border-gray-700">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ongoing projects..."
              aria-label="Search ongoing projects"
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
          </div>
        )}

        <ul className="flex-1 overflow-y-auto">
          {shown.map((a) => (
            <Row key={a._id} a={a} index={list.indexOf(a)} count={list.length} onEdit={() => setEditing(a)} onComplete={() => setCompleting(a)} />
          ))}
          {!shown.length && (
            <li className="flex flex-col items-center justify-center h-32 text-gray-600 dark:text-gray-400 text-sm">
              {q ? 'No projects found' : user?.isAdmin ? 'Nothing in progress. Add one with "New".' : 'Nothing in progress right now.'}
            </li>
          )}
        </ul>
      </div>

      <Suspense fallback={null}>
        {editing && <OngoingEditor project={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
        {completing && (
          <PostEditor
            defaultCategory="projects"
            initial={{
              category: 'projects',
              title: completing.title,
              description: completing.description,
              project_url: completing.project_url,
              technologies: completing.technologies,
              image_urls: completing.image_urls,
            }}
            // The post now owns the image, so keep it in Cloudinary when removing the ongoing entry.
            onSaved={() => api(`/active-projects/${completing._id}?keep_images=1`, 'DELETE')}
            onClose={() => setCompleting(null)}
          />
        )}
      </Suspense>
    </div>
  );
}
