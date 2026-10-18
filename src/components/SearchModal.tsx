import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Briefcase, Clock, ExternalLink, FileText, Github, Hammer, Linkedin, Mail, Search, Sparkles, TerminalSquare, TrendingUp, X, Zap } from 'lucide-react';
import { api, categoryLabel, img, type ActiveProject, type Experience, type Post, type Skill } from '../lib/api';
import { highlight, search, type ResultKind, type SearchItem } from '../lib/search';
import { SkillAvatar } from '../lib/skillIcons';
import { useStore } from '../lib/store';
import type { StoryGroup } from './StoryViewer';

const PostView = lazy(() => import('./InstagramProjectPost'));
const StoryViewer = lazy(() => import('./StoryViewer'));

type Ongoing = ActiveProject;
type LinkAction = { label: string; run: () => void; icon: ReactNode };
type Data = Post | Skill | Experience | Ongoing | LinkAction;

const GROUPS: { kind: ResultKind; label: string; max: number }[] = [
  { kind: 'link', label: 'Quick links', max: 4 },
  { kind: 'post', label: 'Projects & posts', max: 8 },
  { kind: 'skill', label: 'Skills', max: 5 },
  { kind: 'experience', label: 'Experience', max: 5 },
  { kind: 'ongoing', label: 'Ongoing projects', max: 4 },
];

const HISTORY_KEY = 'searchHistory';
function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function Highlighted({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlight(text, query).map((p, i) =>
        p.hit ? (
          <mark key={i} className="bg-transparent text-orange-500 font-semibold">{p.text}</mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/** Spotlight-style search over everything on the site. Opens with "/" or the sidebar. */
export default function SearchModal() {
  const { feed, user, setSearchOpen, setOpenTab, setTerminalOpen } = useStore();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [history, setHistory] = useState<string[]>(loadHistory);
  const [openPost, setOpenPost] = useState<Post | null>(null);
  const [stories, setStories] = useState<{ groups: StoryGroup[]; start: number } | null>(null);
  const [popular, setPopular] = useState<{ q: string; count: number; results: number }[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const logged = useRef('');
  // Closing pops the history entry added on open, so the phone's Back button also closes search.
  const close = () => {
    if (window.history.state?.search) window.history.back();
    else setSearchOpen(false);
  };

  const contact = feed?.profile?.contact;
  const skills = useMemo(() => feed?.skills ?? [], [feed]);

  // Everything searchable, rebuilt when the feed changes.
  const items = useMemo((): SearchItem<Data>[] => {
    if (!feed) return [];
    const out: SearchItem<Data>[] = [];
    for (const p of feed.posts) {
      out.push({
        key: 'post-' + p._id,
        kind: 'post',
        title: p.title,
        subtitle: [categoryLabel(p.category), p.technologies.slice(0, 4).join(', ')].filter(Boolean).join(' · '),
        fields: [
          { text: p.title, weight: 3 },
          { text: p.technologies.join(' '), weight: 2 },
          { text: categoryLabel(p.category), weight: 1.5 },
          { text: p.description, weight: 1 },
        ],
        data: p,
      });
    }
    for (const s of feed.skills) {
      const storyText = (s.slides ?? []).map((sl) => `${sl.title} ${sl.text}`).join(' ');
      out.push({
        key: 'skill-' + s._id,
        kind: 'skill',
        title: s.name,
        subtitle: s.slides?.length ? `${s.slides.length} ${s.slides.length === 1 ? 'story' : 'stories'}` : 'Skill',
        fields: [{ text: s.name, weight: 3 }, { text: 'skill ' + storyText, weight: 1 }],
        data: s,
      });
    }
    for (const e of feed.experiences ?? []) {
      out.push({
        key: 'exp-' + e._id,
        kind: 'experience',
        title: `${e.role} · ${e.company}`,
        subtitle: [e.employment_type, e.location].filter(Boolean).join(' · '),
        fields: [
          { text: `${e.role} ${e.company}`, weight: 3 },
          { text: [...e.technologies, ...e.projects.flatMap((p) => [p.title, ...p.technologies])].join(' '), weight: 2 },
          { text: `experience job work ${e.employment_type} ${e.summary} ${e.highlights.join(' ')} ${e.projects.map((p) => p.description).join(' ')}`, weight: 1 },
        ],
        data: e,
      });
    }
    for (const a of feed.active_projects ?? []) {
      out.push({
        key: 'ongoing-' + a.title,
        kind: 'ongoing',
        title: a.title,
        subtitle: `${a.status} · ${a.progress}% done`,
        fields: [
          { text: a.title, weight: 3 },
          { text: a.technologies.join(' '), weight: 2 },
          { text: `ongoing in progress ${a.description}`, weight: 1 },
        ],
        data: a,
      });
    }
    const links: (LinkAction & { aliases: string })[] = [
      { label: 'Contact', aliases: 'contact email message hire reach phone', icon: <Mail size={18} />, run: () => setOpenTab({ tab: 'Contact' }) },
      { label: 'Experience', aliases: 'experience work jobs internship career', icon: <Briefcase size={18} />, run: () => setOpenTab({ tab: 'Experience' }) },
      { label: 'Explore all posts', aliases: 'explore posts feed hackathons experiments', icon: <Sparkles size={18} />, run: () => setOpenTab({ tab: 'Explore' }) },
      { label: 'Resume', aliases: 'resume cv download', icon: <FileText size={18} />, run: () => window.open('/resume.pdf', '_blank', 'noopener') },
      { label: 'Terminal', aliases: 'terminal command shell sudo hire', icon: <TerminalSquare size={18} />, run: () => setTerminalOpen(true) },
      ...(contact?.github ? [{ label: 'GitHub', aliases: 'github code repositories', icon: <Github size={18} />, run: () => window.open(contact.github, '_blank', 'noopener') }] : []),
      ...(contact?.linkedin ? [{ label: 'LinkedIn', aliases: 'linkedin profile connect', icon: <Linkedin size={18} />, run: () => window.open(contact.linkedin, '_blank', 'noopener') }] : []),
    ];
    for (const l of links) {
      out.push({ key: 'link-' + l.label, kind: 'link', title: l.label, subtitle: 'Go to', fields: [{ text: l.label, weight: 3 }, { text: l.aliases, weight: 1.5 }], data: l });
    }
    return out;
  }, [feed, contact, setOpenTab, setTerminalOpen]);

  const results = useMemo(() => search(items, query), [items, query]);
  // Grouped for display, flattened for keyboard navigation.
  const groups = useMemo(
    () =>
      GROUPS.map((g) => ({ ...g, rows: results.filter((r) => r.item.kind === g.kind).slice(0, g.max) }))
        .filter((g) => g.rows.length)
        .sort((a, b) => b.rows[0].score - a.rows[0].score),
    [results],
  );
  const flat = groups.flatMap((g) => g.rows);

  useEffect(() => setActive(0), [query]);

  // Anonymous search stats: log a query once the visitor pauses typing.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || user?.isAdmin) return;
    const t = setTimeout(() => {
      if (logged.current === q.toLowerCase()) return;
      logged.current = q.toLowerCase();
      api('/search-log', 'POST', { q, results: results.length }).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [query, results.length, user?.isAdmin]);

  useEffect(() => {
    if (!user?.isAdmin) return;
    api<{ q: string; count: number; results: number }[]>('/admin/search-stats').then(setPopular).catch(() => setPopular([]));
  }, [user?.isAdmin]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  // Back button / swipe-back closes search instead of leaving the page.
  useEffect(() => {
    window.history.pushState({ ...window.history.state, search: true }, '');
    const onPop = () => setSearchOpen(false);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [setSearchOpen]);

  // Esc closes and "/" jumps back to the box, wherever focus is inside the dialog.
  const viewing = !!openPost || !!stories; // those views handle their own keys
  useEffect(() => {
    if (viewing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewing]);

  const remember = (q: string) => {
    const t = q.trim();
    if (!t) return;
    const next = [t, ...history.filter((h) => h.toLowerCase() !== t.toLowerCase())].slice(0, 6);
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable
    }
  };

  const openSkill = (s: Skill) => {
    const withStories = skills.filter((x) => x.slides?.length);
    const start = withStories.findIndex((x) => x._id === s._id);
    if (start < 0) {
      close();
      document.getElementById('skills-row')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setStories({
      groups: withStories.map((x) => ({ id: x._id, title: x.name, avatar: <SkillAvatar skill={x} size={32} />, slides: x.slides ?? [] })),
      start,
    });
  };

  const choose = (item: SearchItem<Data>) => {
    remember(query);
    switch (item.kind) {
      case 'post':
        return setOpenPost(item.data as Post);
      case 'skill':
        return openSkill(item.data as Skill);
      case 'experience':
        close();
        return setOpenTab({ tab: 'Experience', target: (item.data as Experience)._id });
      case 'ongoing': {
        const url = (item.data as Ongoing).project_url;
        if (url) window.open(url, '_blank', 'noopener');
        return close();
      }
      case 'link':
        close();
        return (item.data as LinkAction).run();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!flat.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % flat.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + flat.length) % flat.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(flat[active].item);
    }
  };

  if (openPost) {
    return (
      <Suspense fallback={null}>
        <PostView post={openPost} onClose={() => setOpenPost(null)} />
      </Suspense>
    );
  }
  if (stories) {
    return (
      <Suspense fallback={null}>
        <StoryViewer stories={stories.groups} startIndex={stories.start} onClose={() => setStories(null)} />
      </Suspense>
    );
  }

  const thumb = (item: SearchItem<Data>) => {
    const box = 'w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center';
    switch (item.kind) {
      case 'post': {
        const p = item.data as Post;
        return p.image_urls[0] ? (
          <img src={img(p.image_urls[0], 96)} alt="" className={`${box} object-cover`} />
        ) : (
          <span className={`${box} bg-gradient-to-br from-orange-500 to-pink-500 text-white`}><Sparkles size={16} /></span>
        );
      }
      case 'skill':
        return <span className={`${box} rounded-full`}><SkillAvatar skill={item.data as Skill} size={40} /></span>;
      case 'experience': {
        const e = item.data as Experience;
        return e.logo_url ? (
          <img src={img(e.logo_url, 96)} alt="" className={`${box} object-cover rounded-full`} />
        ) : (
          <span className={`${box} rounded-full bg-orange-500/15 text-orange-500`}><Briefcase size={18} /></span>
        );
      }
      case 'ongoing':
        return <span className={`${box} bg-sky-500/15 text-sky-500`}><Hammer size={18} /></span>;
      case 'link':
        return <span className={`${box} bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300`}>{(item.data as LinkAction).icon}</span>;
    }
  };

  const topProjects = [...(feed?.posts ?? [])].sort((a, b) => b.likes - a.likes).slice(0, 4);
  const chips = [...skills.slice(0, 5).map((s) => s.name), 'AI', 'IoT', 'Hackathons'];
  let index = -1;

  return (
    <div className="fixed inset-0 z-[85] bg-black/60 backdrop-blur-sm flex items-start justify-center sm:pt-[10vh]" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className="w-full h-full sm:h-auto sm:max-w-2xl sm:mx-4 sm:rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col sm:max-h-[75vh] overflow-hidden text-black dark:text-white"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <Search size={20} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, skills, experience…"
            aria-label="Search"
            aria-controls="search-results"
            className="flex-1 bg-transparent outline-none text-base placeholder-gray-500"
          />
          {query && (
            <button onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="Clear search" className="text-gray-400 hover:text-black dark:hover:text-white">
              <X size={18} />
            </button>
          )}
          <button
            onClick={close}
            title="Close (Esc)"
            aria-label="Close search"
            className="hidden sm:inline text-[10px] text-gray-500 border border-gray-300 dark:border-gray-700 rounded px-1.5 py-0.5 hover:text-black dark:hover:text-white hover:border-gray-500"
          >
            esc
          </button>
          <button onClick={close} className="sm:hidden text-sm font-semibold text-orange-500 pl-1">
            Cancel
          </button>
        </div>

        <div ref={listRef} id="search-results" className="flex-1 overflow-y-auto p-2">
          {query.trim() ? (
            flat.length ? (
              groups.map((g) => (
                <div key={g.kind} className="mb-2">
                  <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{g.label}</p>
                  {g.rows.map((r) => {
                    index++;
                    const i = index;
                    return (
                      <button
                        key={r.item.key}
                        data-active={i === active}
                        onMouseMove={() => i !== active && setActive(i)}
                        onClick={() => choose(r.item)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left ${i === active ? 'bg-orange-500/10' : ''}`}
                      >
                        {thumb(r.item)}
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium truncate"><Highlighted text={r.item.title} query={query} /></span>
                          <span className="block text-xs text-gray-500 truncate"><Highlighted text={r.item.subtitle} query={query} /></span>
                        </span>
                        {r.item.kind === 'ongoing' && (r.item.data as Ongoing).project_url && <ExternalLink size={14} className="text-gray-400 shrink-0" />}
                        {i === active && <kbd className="hidden sm:inline text-[10px] text-gray-500 border border-gray-300 dark:border-gray-700 rounded px-1.5">↵</kbd>}
                      </button>
                    );
                  })}
                </div>
              ))
            ) : (
              <div className="text-center py-14 px-6 text-gray-500">
                <Search size={36} className="mx-auto mb-3 opacity-40" />
                <p className="font-medium text-gray-700 dark:text-gray-300">No results for “{query}”</p>
                <p className="text-sm mt-1">Try a technology (React, Go), a project name, or a word like “hackathon”.</p>
              </div>
            )
          ) : (
            <div className="space-y-5 p-2">
              <div className="flex flex-wrap gap-2">
                {chips.map((c) => (
                  <button key={c} onClick={() => setQuery(c)} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-orange-500 hover:text-orange-500">
                    <Zap size={11} className="inline mr-1 -mt-0.5" />
                    {c}
                  </button>
                ))}
              </div>

              {history.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-1 mb-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Recent</p>
                    <button
                      onClick={() => {
                        setHistory([]);
                        try {
                          localStorage.removeItem(HISTORY_KEY);
                        } catch {
                          // storage unavailable
                        }
                      }}
                      className="text-xs text-orange-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  {history.map((h) => (
                    <button key={h} onClick={() => setQuery(h)} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-900">
                      <Clock size={15} className="text-gray-400" /> {h}
                    </button>
                  ))}
                </div>
              )}

              {topProjects.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 px-1 mb-2">Popular projects</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {topProjects.map((p) => (
                      <button key={p._id} onClick={() => setOpenPost(p)} className="text-left rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-orange-500 group">
                        <div className="aspect-video bg-gray-200 dark:bg-gray-900 overflow-hidden">
                          {p.image_urls[0] && <img src={img(p.image_urls[0], 320)} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}
                        </div>
                        <div className="px-2 py-1.5">
                          <p className="text-xs font-semibold truncate">{p.title}</p>
                          <p className="text-[11px] text-gray-500">❤️ {p.likes}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {user?.isAdmin && (
                <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-orange-500 mb-2">
                    <TrendingUp size={13} /> What visitors search (30 days) · only you see this
                  </p>
                  {!popular ? (
                    <p className="text-xs text-gray-500">Loading…</p>
                  ) : popular.length === 0 ? (
                    <p className="text-xs text-gray-500">No searches yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {popular.map((p) => (
                        <button
                          key={p.q}
                          onClick={() => setQuery(p.q)}
                          title={p.results === 0 ? 'Found nothing: maybe add this to your portfolio' : `${p.results} results`}
                          className={`px-2.5 py-1 rounded-full text-xs border ${p.results === 0 ? 'border-red-400/60 text-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                        >
                          {p.q} <span className="text-gray-500">×{p.count}</span>
                          {p.results === 0 && <span className="ml-1">· no results</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-4 px-4 py-2 border-t border-gray-200 dark:border-gray-800 text-[11px] text-gray-500">
          <span><kbd className="font-sans">↑↓</kbd> navigate</span>
          <span><kbd className="font-sans">↵</kbd> open</span>
          <button onClick={close} className="hover:text-black dark:hover:text-white"><kbd className="font-sans">esc</kbd> close</button>
          <button
            onClick={() => {
              inputRef.current?.focus();
              inputRef.current?.select();
            }}
            className="ml-auto hover:text-black dark:hover:text-white"
          >
            Press <kbd className="px-1 border border-gray-300 dark:border-gray-700 rounded">/</kbd> anywhere to search
          </button>
        </div>
      </div>
    </div>
  );
}
