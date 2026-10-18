import { lazy, Suspense, useEffect, useState } from 'react';
import { Briefcase, Calendar, ExternalLink, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, formatDuration, formatMonth, img, monthsBetween, totalMonths, type Experience } from '../lib/api';
import { useStore } from '../lib/store';
import Sidebar from './Sidebar';

const ExperienceEditor = lazy(() => import('./ExperienceEditor'));

interface Props {
  isOpen: boolean;
  focusId?: string; // scroll to this experience when opened
  onClose: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

/** Company logo inside an Instagram-style story ring; the ring spins for a current role. */
function StoryRing({ exp, size }: { exp: Experience; size: number }) {
  const current = !exp.end_date;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={`absolute inset-0 rounded-full ${
          current
            ? 'bg-[conic-gradient(from_0deg,#facc15,#ef4444,#ec4899,#f97316,#facc15)] animate-[spin_4s_linear_infinite]'
            : 'bg-gradient-to-tr from-gray-500 to-gray-700'
        }`}
      />
      <div className="absolute inset-[3px] rounded-full bg-white dark:bg-black p-[2px]">
        <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 dark:bg-gray-900 flex items-center justify-center font-bold text-orange-500" style={{ fontSize: size / 3 }}>
          {exp.logo_url ? <img src={img(exp.logo_url, size * 2)} alt="" className="w-full h-full object-cover" /> : exp.company.trim()[0]?.toUpperCase()}
        </div>
      </div>
      {current && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-px rounded-md text-[9px] font-bold tracking-wider text-white bg-gradient-to-r from-orange-500 to-pink-500 border-2 border-white dark:border-black">
          NOW
        </span>
      )}
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-700">
          {t}
        </span>
      ))}
    </div>
  );
}

function ExperienceCard({ exp, onEdit }: { exp: Experience; onEdit: () => void }) {
  const { user, reloadFeed } = useStore();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const current = !exp.end_date;
  const months = monthsBetween(exp.start_date, exp.end_date);

  const remove = async () => {
    setBusy(true);
    try {
      await api(`/experiences/${exp._id}`, 'DELETE');
      await reloadFeed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete');
      setBusy(false);
    }
  };

  return (
    <li id={`exp-${exp._id}`} className="relative pl-12 sm:pl-16 scroll-mt-6">
      {/* timeline node */}
      <span className="absolute left-[11px] sm:left-[19px] top-7 flex h-4 w-4">
        {current && <span className="absolute inline-flex h-full w-full rounded-full bg-pink-500 opacity-60 animate-ping" />}
        <span className={`relative inline-flex h-4 w-4 rounded-full border-2 border-white dark:border-black ${current ? 'bg-gradient-to-br from-orange-500 to-pink-500' : 'bg-gray-500'}`} />
      </span>

      <article className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sm:p-6 hover:border-gray-400 dark:hover:border-gray-700 transition-colors">
        <header className="flex gap-4 items-start">
          <StoryRing exp={exp} size={56} />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-black dark:text-white leading-tight">{exp.role}</h3>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
              {exp.company_url ? (
                <a href={exp.company_url} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 inline-flex items-center gap-1">
                  {exp.company} <ExternalLink size={12} />
                </a>
              ) : (
                exp.company
              )}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-600 dark:text-gray-400">
              <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold">{exp.employment_type}</span>
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} />
                {formatMonth(exp.start_date)} – {current ? 'Present' : formatMonth(exp.end_date)}
                <span className="text-gray-400">·</span>
                <span className="font-semibold">{formatDuration(months)}</span>
              </span>
              {exp.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} /> {exp.location}
                </span>
              )}
            </div>
          </div>
          {user?.isAdmin && (
            <div className="flex gap-1 shrink-0">
              <button onClick={onEdit} aria-label="Edit experience" className="p-1.5 rounded-full text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
                <Pencil size={16} />
              </button>
              <button onClick={() => setConfirming(true)} aria-label="Delete experience" className="p-1.5 rounded-full text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </header>

        {confirming && (
          <div className="mt-4 p-3 rounded-lg border border-red-400/50 bg-red-500/5 flex flex-wrap items-center gap-3 text-sm">
            <span className="flex-1">Delete this experience?</span>
            <button onClick={() => setConfirming(false)} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-800">Cancel</button>
            <button onClick={remove} disabled={busy} className="px-3 py-1 rounded bg-red-600 text-white disabled:opacity-50">{busy ? 'Deleting...' : 'Delete'}</button>
            {error && <p className="w-full text-xs text-red-500">{error}</p>}
          </div>
        )}

        {exp.summary && <p className="mt-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{exp.summary}</p>}

        {exp.highlights.length > 0 && (
          <ul className="mt-4 space-y-2">
            {exp.highlights.map((h, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-orange-500 to-pink-500" />
                {h}
              </li>
            ))}
          </ul>
        )}

        {exp.technologies.length > 0 && (
          <div className="mt-4">
            <Chips items={exp.technologies} />
          </div>
        )}

        {exp.projects.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-2">Projects built here</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {exp.projects.map((p, i) => (
                <div key={i} className="relative rounded-xl p-[1px] bg-gradient-to-br from-orange-500/60 via-pink-500/40 to-transparent">
                  <div className="h-full rounded-[11px] bg-gray-50 dark:bg-gray-950 p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm text-black dark:text-white">{p.title}</h4>
                      {p.link && (
                        <a href={p.link} target="_blank" rel="noopener noreferrer" aria-label={`Open ${p.title}`} className="text-gray-500 hover:text-orange-500 shrink-0">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                    {p.description && <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line">{p.description}</p>}
                    <Chips items={p.technologies} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>
    </li>
  );
}

export default function ExperienceModal({ isOpen, focusId, onClose, activeTab, onTabChange }: Props) {
  const { feed, user } = useStore();
  const [editing, setEditing] = useState<Experience | 'new' | null>(null);

  useEffect(() => {
    if (!isOpen || !focusId) return;
    const t = setTimeout(() => document.getElementById(`exp-${focusId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    return () => clearTimeout(t);
  }, [isOpen, focusId]);
  if (!isOpen) return null;

  const list = feed?.experiences;
  const projectsCount = list?.reduce((n, e) => n + e.projects.length, 0) ?? 0;
  const companies = new Set(list?.map((e) => e.company.toLowerCase())).size;
  const stats = list?.length
    ? [
        { value: companies, label: companies === 1 ? 'company' : 'companies' },
        { value: formatDuration(totalMonths(list)), label: 'experience' },
        { value: projectsCount, label: projectsCount === 1 ? 'project built' : 'projects built' },
      ]
    : [];

  return (
    <div className="fixed inset-0 bg-white dark:bg-black z-50 overflow-hidden flex flex-col lg:flex-row">
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} onModalClose={onClose} />

      <div className="flex-1 overflow-y-auto">

        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10">
          <header className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 bg-clip-text text-transparent">
              Experience
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Where I've worked and what I built there</p>
          </header>

          {stats.length > 0 && (
            <div className="flex justify-center gap-8 sm:gap-14 mb-8">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="font-semibold text-lg text-black dark:text-white">{s.value}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Highlights row: tap a company to jump to it */}
          {list && list.length > 0 && (
            <div className="flex gap-5 overflow-x-auto pb-4 mb-6 border-b border-gray-200 dark:border-gray-800 justify-start sm:justify-center">
              {list.map((e) => (
                <button
                  key={e._id}
                  onClick={() => document.getElementById(`exp-${e._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="flex flex-col items-center gap-2 w-20 shrink-0 group"
                  title={`${e.role} at ${e.company}`}
                >
                  <div className="group-hover:scale-105 transition-transform">
                    <StoryRing exp={e} size={68} />
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate w-full text-center">{e.company}</span>
                </button>
              ))}
            </div>
          )}

          {user?.isAdmin && (
            <button
              onClick={() => setEditing('new')}
              className="w-full mb-6 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-orange-500 hover:text-orange-500 font-semibold"
            >
              <Plus size={18} /> Add experience
            </button>
          )}

          {!list ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }, (_, i) => <div key={i} className="h-56 rounded-2xl bg-gray-200 dark:bg-gray-900 animate-pulse" />)}
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-20 text-gray-600 dark:text-gray-400">
              <Briefcase size={48} className="mx-auto mb-4 opacity-50" />
              <p>{user?.isAdmin ? 'No experience yet. Add your first one above.' : 'Experience coming soon.'}</p>
            </div>
          ) : (
            <ol className="relative space-y-6">
              {/* the timeline line */}
              <span className="absolute left-[18px] sm:left-[26px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-orange-500 via-pink-500 to-transparent" aria-hidden />
              {list.map((e) => (
                <ExperienceCard key={e._id} exp={e} onEdit={() => setEditing(e)} />
              ))}
            </ol>
          )}
        </div>
      </div>

      <Suspense fallback={null}>
        {editing && <ExperienceEditor experience={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      </Suspense>
    </div>
  );
}
