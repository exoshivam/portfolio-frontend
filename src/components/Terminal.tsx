import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { api, ApiError, categoryLabel, CATEGORIES, formatMonth, liveStories, type Category } from '../lib/api';
import { useStore } from '../lib/store';

// A playful terminal (⌘K / Ctrl+K) for exploring the portfolio with commands.


interface Line {
  id: number;
  node: ReactNode;
}

interface HireDraft {
  step: 'name' | 'email' | 'message' | 'confirm';
  name: string;
  email: string;
  message: string;
}

const COMMANDS: Record<string, string> = {
  help: 'list commands',
  about: 'who is Shivam',
  whoami: 'who are you',
  skills: 'tech I work with',
  projects: 'featured projects',
  posts: 'everything posted, optionally one section: posts hackathons',
  open: 'open item n from the last list: open 2',
  experience: 'where I have worked',
  stories: 'live 24h stories',
  github: 'open my GitHub',
  linkedin: 'open my LinkedIn',
  contact: 'ways to reach me',
  resume: 'download my resume',
  ask: 'ask the AI about me: ask what did he build with React?',
  'sudo hire-shivam': 'send me a hiring message ✉️',
  neofetch: 'system info, portfolio edition',
  theme: 'theme dark | theme light',
  history: 'commands you ran',
  date: 'current date',
  echo: 'print text',
  clear: 'clear the screen (Ctrl+L)',
  exit: 'close the terminal (Esc)',
  shutdown: 'power off the portfolio 🔌',
};
const COMPLETIONS = [...Object.keys(COMMANDS).filter((c) => !c.includes(' ')), 'sudo', 'ls', 'cd', 'coffee', 'poweroff', 'reboot'];

const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-400 underline underline-offset-2 hover:text-sky-300">
    {children}
  </a>
);
const Dim = ({ children }: { children: ReactNode }) => <span className="text-gray-500">{children}</span>;
const Hi = ({ children }: { children: ReactNode }) => <span className="text-orange-400">{children}</span>;

// "shivam.dev" in figlet's standard font (built from its glyphs so every row lines up).
const BANNER = [
  "      _      _                                  _",
  " ___ | |__  (_)__   __  __ _  _ __ ___       __| |  ___ __   __",
  "/ __|| '_ \\ | |\\ \\ / / / _` || '_ ` _ \\     / _` | / _ \\\\ \\ / /",
  "\\__ \\| | | || | \\ V / | (_| || | | | | | _ | (_| ||  __/ \\ V /",
  "|___/|_| |_||_|  \\_/   \\__,_||_| |_| |_|(_) \\__,_| \\___|  \\_/",
].join('\n');

const LIGHT = 'relative w-3 h-3 rounded-full flex items-center justify-center shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.25)]';

/** The dark symbol inside a traffic light, shown while the pointer is over the group (or a light has focus). */
function Glyph({ d, stroke }: { d: string; stroke?: boolean }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className="w-3 h-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
      <path d={d} fill={stroke ? 'none' : 'rgba(0,0,0,0.6)'} stroke={stroke ? 'rgba(0,0,0,0.6)' : 'none'} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * After "shutdown": the page collapses like an old CRT, then the tab tries to close. Browsers only let a
 * page close tabs that a script opened, so usually a black "safe to close" screen stays; any key reboots.
 */
function PowerOff() {
  const [safe, setSafe] = useState(false);
  useEffect(() => {
    const root = document.getElementById('root');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.body.style.background = '#000';
    if (root && !reduce) root.classList.add('crt-off');
    const t = setTimeout(() => {
      window.close(); // works only if a script opened this tab
      setSafe(true);
    }, reduce ? 0 : 750);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!safe) return;
    const reboot = () => location.reload();
    window.addEventListener('keydown', reboot);
    window.addEventListener('pointerdown', reboot);
    return () => {
      window.removeEventListener('keydown', reboot);
      window.removeEventListener('pointerdown', reboot);
    };
  }, [safe]);
  return createPortal(
    <div role="status" className="fixed inset-0 z-[200] bg-black flex items-center justify-center font-mono text-sm text-gray-400 cursor-default">
      {safe && (
        <div className="text-center space-y-3 animate-[fadeIn_0.6s_ease-out]">
          <p className="text-orange-400">It&apos;s now safe to close this tab.</p>
          <p className="text-gray-600 text-xs">Press any key to reboot</p>
        </div>
      )}
    </div>,
    document.body,
  );
}

export default function Terminal() {
  const { feed, user, setTerminalOpen } = useStore();
  const [lines, setLines] = useState<Line[]>(() =>
    [

      <pre className="text-orange-400 leading-tight text-[9px] sm:text-xs overflow-x-auto">{BANNER}</pre>,
      <span>
        Welcome{user ? `, ${user.name || user.username}` : ''}! Type <Hi>help</Hi> to see what you can do. Try <Hi>sudo hire-shivam</Hi> 😉
      </span>,
      <Dim>Tips: ↑/↓ history · Tab completes · Ctrl+L clears · Esc closes</Dim>,
    ].map((node, id) => ({ id, node })),
  );
  const [input, setInput] = useState('');
  const [maximized, setMaximized] = useState(false);
  const [poweredOff, setPoweredOff] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [hire, setHire] = useState<HireDraft | null>(null);
  const lastList = useRef<{ label: string; url: string }[]>([]);
  const chat = useRef<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const nextId = useRef(100); // ids below are used by the welcome banner
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const profile = feed?.profile;
  const who = user?.username ?? 'guest';
  const prompt = (
    <span>
      <span className="text-emerald-400">{who}@shivam</span>
      <span className="text-gray-400">:</span>
      <span className="text-sky-400">~</span>
      <span className="text-gray-400">$</span>
    </span>
  );

  const print = (...nodes: ReactNode[]) => setLines((ls) => [...ls, ...nodes.map((node) => ({ id: nextId.current++, node }))]);
  const close = () => setTerminalOpen(false);

  // Maximising also puts the browser itself in full screen (hiding tabs and the address bar) where the
  // browser allows it. Leaving full screen with Esc restores the window; closing the terminal leaves it.
  const enteredFullscreen = useRef(false);
  const toggleMax = () => {
    const next = !maximized;
    setMaximized(next);
    if (!document.fullscreenEnabled) return; // e.g. iPhone Safari: the window still fills the page
    if (next && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => (enteredFullscreen.current = true), () => {});
    } else if (!next && enteredFullscreen.current && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };
  useEffect(() => {
    const onChange = () => {
      if (document.fullscreenElement) return;
      if (enteredFullscreen.current) setMaximized(false);
      enteredFullscreen.current = false;
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      if (enteredFullscreen.current && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [lines, busy]);

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);

  const openUrl = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  const listItems = (items: { label: string; url: string; extra?: string }[]) => {
    lastList.current = items.filter((i) => i.url);
    let n = 0;
    print(
      ...items.map((it) => (
        <span>
          {it.url ? <Hi>[{++n}]</Hi> : <Dim>[ - ]</Dim>} {it.label} {it.extra && <Dim>· {it.extra}</Dim>}
        </span>
      )),
    );
    if (lastList.current.length) print(<Dim>Type "open &lt;n&gt;" to open one.</Dim>);
  };

  // ---- sudo hire-shivam: a small step-by-step form ----

  const startHire = () => {
    const d: HireDraft = { step: 'name', name: user?.name || user?.username || '', email: user?.email || '', message: '' };
    print(<span className="text-emerald-400">[sudo] access granted. Let's get Shivam hired! 🚀</span>, <Dim>Ctrl+C to cancel at any step.</Dim>);
    askHire(d);
  };

  const askHire = (d: HireDraft) => {
    setHire(d);
    const q = {
      name: `Your name${d.name ? ` [${d.name}]` : ''}:`,
      email: `Your email${d.email ? ` [${d.email}]` : ''}:`,
      message: 'What role or project do you have in mind?',
      confirm: 'Send this to Shivam? (y/n)',
    }[d.step];
    print(<span className="text-yellow-300">? {q}</span>);
  };

  const answerHire = async (raw: string) => {
    if (!hire) return;
    const v = raw.trim();
    const d = { ...hire };
    if (d.step === 'name') {
      d.name = v || d.name;
      if (!d.name) return print(<span className="text-red-400">Name is required.</span>);
      return askHire({ ...d, step: 'email' });
    }
    if (d.step === 'email') {
      d.email = v || d.email;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return print(<span className="text-red-400">That doesn't look like an email.</span>);
      return askHire({ ...d, step: 'message' });
    }
    if (d.step === 'message') {
      if (v.length < 5) return print(<span className="text-red-400">Tell me a bit more (at least 5 characters).</span>);
      return askHire({ ...d, message: v, step: 'confirm' });
    }
    if (!/^y(es)?$/i.test(v)) {
      setHire(null);
      return print(<Dim>Cancelled. No message sent.</Dim>);
    }
    setHire(null);
    setBusy(true);
    print(<Dim>Sending...</Dim>);
    try {
      await api('/hire', 'POST', { name: d.name, email: d.email, message: d.message });
      print(
        <span className="text-emerald-400">✔ Message delivered. Shivam will reply to {d.email} soon.</span>,
        <pre className="text-emerald-400 leading-tight">{`  ┌──────────────────────────┐\n  │  HIRE REQUEST: RECEIVED  │\n  └──────────────────────────┘`}</pre>,
      );
    } catch (e) {
      print(<span className="text-red-400">✘ {e instanceof Error ? e.message : 'Could not send'}</span>);
    } finally {
      setBusy(false);
    }
  };

  // ---- commands ----

  const run = async (raw: string) => {
    const line = raw.trim();
    const [cmd = '', ...rest] = line.split(/\s+/);
    const arg = rest.join(' ');
    const posts = feed?.posts ?? [];

    switch (cmd.toLowerCase()) {
      case '':
        return;
      case 'help':
        return print(
          <span className="text-gray-300">Available commands:</span>,
          ...Object.entries(COMMANDS).map(([c, d]) => (
            <span>
              {'  '}
              <Hi>{c.padEnd(18, ' ')}</Hi>
              <Dim>{d}</Dim>
            </span>
          )),
        );
      case 'clear':
        return setLines([]);
      case 'exit':
      case 'quit':
        return close();
      case 'reboot':
        return location.reload();
      case 'shutdown':
      case 'poweroff':
      case 'halt': {
        const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
        print(<span className="text-yellow-300">Broadcast message from {who}@shivam: The system is going down for poweroff NOW!</span>);
        for (const step of ['Stopping chatbot (Agnes-Tachyon)', 'Unmounting /projects', 'Saving coffee levels', 'Powering off']) {
          await wait(350);
          print(<span><span className="text-emerald-400">[  OK  ]</span> {step}...</span>);
        }
        await wait(500);
        return setPoweredOff(true);
      }
      case 'whoami':
        return print(
          user ? (
            <span>
              {user.name || user.username} <Dim>({user.email})</Dim>
              {user.isAdmin && <span className="text-pink-400"> · root 👑</span>}
            </span>
          ) : (
            <span>guest <Dim>· sign in with Google to reply to stories and comment</Dim></span>
          ),
        );
      case 'about':
        return print(
          <span className="text-white font-bold">{profile?.full_name ?? 'Shivam Kumar Yadav'}</span>,
          <span>Full Stack Developer · AI · IoT</span>,
          profile?.bio ? <span>{profile.bio}</span> : null,
          <Dim>
            {posts.filter((p) => p.category === 'projects').length} projects · {profile?.views_count ?? 0} profile views ·{' '}
            {feed?.skills.length ?? 0} skills
          </Dim>,
        );
      case 'skills':
        return print(
          <span>
            {(feed?.skills ?? []).map((s, i) => (
              <span key={s._id}>
                {i > 0 && <Dim> · </Dim>}
                <Hi>{s.name}</Hi>
                {s.slides?.length ? <Dim> ({s.slides.length} stories)</Dim> : null}
              </span>
            ))}
          </span>,
          <Dim>Click a skill on the home page to watch its stories.</Dim>,
        );
      case 'projects':
        return listItems(
          posts.filter((p) => p.category === 'projects').map((p) => ({ label: p.title, url: p.project_url, extra: p.technologies.slice(0, 4).join(', ') })),
        );
      case 'posts':
      case 'ls': {
        if (cmd === 'ls' && !arg) {
          return print(<span className="text-sky-400">projects/  hackathons/  experiments/  side_ideas/  iot_works/  experience/  skills/  stories/</span>);
        }
        const key = arg.replace(/\/$/, '').toLowerCase();
        const cat = CATEGORIES.find((c) => c.key === key || c.label.toLowerCase() === key)?.key as Category | undefined;
        if (arg && !cat) {
          if (key === 'experience' || key === 'skills' || key === 'stories') return run(key);
          return print(<span className="text-red-400">no such section: {arg}. Try: {CATEGORIES.map((c) => c.key).join(', ')}</span>);
        }
        const list = posts.filter((p) => !cat || p.category === cat);
        if (!list.length) return print(<Dim>Nothing here yet.</Dim>);
        return listItems(list.map((p) => ({ label: p.title, url: p.project_url, extra: categoryLabel(p.category) })));
      }
      case 'open': {
        const n = Number(arg);
        const item = lastList.current[n - 1];
        if (!item) return print(<span className="text-red-400">Run "projects" or "posts" first, then "open &lt;number&gt;".</span>);
        openUrl(item.url);
        return print(<span>Opening <A href={item.url}>{item.label}</A>...</span>);
      }
      case 'experience': {
        const ex = feed?.experiences ?? [];
        if (!ex.length) return print(<Dim>Experience coming soon. Check the Experience tab later.</Dim>);
        return print(
          ...ex.map((e) => (
            <span>
              <Hi>{e.role}</Hi> @ <span className="text-white">{e.company}</span>{' '}
              <Dim>
                ({e.employment_type}, {formatMonth(e.start_date)} – {e.end_date ? formatMonth(e.end_date) : 'present'})
              </Dim>
            </span>
          )),
        );
      }
      case 'stories': {
        const n = liveStories(feed?.profile_stories).length;
        return print(n ? <span>{n} live {n === 1 ? 'story' : 'stories'}. Close this and tap the profile photo to watch 👀</span> : <Dim>No stories in the last 24 hours.</Dim>);
      }
      case 'github': {
        const url = profile?.contact?.github || profile?.github_url || 'https://github.com/exoshivam';
        openUrl(url);
        return print(<span>Opening <A href={url}>{url}</A></span>);
      }
      case 'linkedin': {
        const site = profile?.contact?.linkedin || profile?.website || '';
        const url = site ? (site.startsWith('http') ? site : `https://${site}`) : '';
        if (!url) return print(<Dim>No LinkedIn link set.</Dim>);
        openUrl(url);
        return print(<span>Opening <A href={url}>{url}</A></span>);
      }
      case 'contact': {
        const c = profile?.contact;
        return print(
          c?.email ? (
            <span>
              ✉️ <A href={`mailto:${c.email}`}>{c.email}</A>
            </span>
          ) : null,
          c?.phone ? <span>📞 {c.phone}</span> : null,
          c?.location ? <span>📍 {c.location}</span> : null,
          <span>💼 or run <Hi>sudo hire-shivam</Hi> to send a message right from here</span>,
        );
      }
      case 'resume':
        openUrl('/resume.pdf');
        return print(<span>Opening resume...</span>);
      case 'ask': {
        if (!arg) return print(<Dim>Usage: ask &lt;your question&gt;, e.g. ask what is GoCorp?</Dim>);
        setBusy(true);
        try {
          const res = await api<{ response: string }>('/chat', 'POST', { message: arg, history: chat.current.slice(-8) });
          chat.current.push({ role: 'user', content: arg }, { role: 'assistant', content: res.response });
          print(
            <div className="text-gray-200 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-sky-400 [&_strong]:text-white space-y-1">
              <span className="text-pink-400">agnes-tachyon ›</span>
              <ReactMarkdown>{res.response}</ReactMarkdown>
            </div>,
          );
        } catch (e) {
          print(<span className="text-red-400">{e instanceof ApiError ? e.message : 'The AI is unavailable right now.'}</span>);
        } finally {
          setBusy(false);
        }
        return;
      }
      case 'sudo': {
        if (arg === 'hire-shivam' || arg === 'hire shivam') return startHire();
        if (/^rm\s+-rf/.test(arg)) return print(<span className="text-red-400">Nice try. This portfolio is write-protected by caffeine ☕</span>);
        return print(
          <span>
            {who} is not in the sudoers file. This incident will be reported. <Dim>(psst: try </Dim>
            <Hi>sudo hire-shivam</Hi>
            <Dim>)</Dim>
          </span>,
        );
      }
      case 'rm':
        return print(<span className="text-red-400">rm: permission denied. Only Shivam can delete things (and he's busy shipping).</span>);
      case 'cd':
        return print(<Dim>You're already home 🏠. Try "ls".</Dim>);
      case 'neofetch':
        return print(
          <div className="flex gap-4 flex-wrap">
            <pre className="text-orange-400 leading-tight">{`   .--.\n  |o_o |\n  |:_/ |\n //   \\ \\\n(|     | )\n/'\\_   _/\`\\\n\\___)=(___/`}</pre>
            <div>
              <div>
                <span className="text-emerald-400">{who}</span>@<span className="text-emerald-400">shivam.dev</span>
              </div>
              <Dim>-------------------------</Dim>
              <div><Hi>Name</Hi>: {profile?.full_name ?? 'Shivam Kumar Yadav'}</div>
              <div><Hi>Role</Hi>: Full Stack Developer</div>
              <div><Hi>Location</Hi>: Noida, India</div>
              <div><Hi>Stack</Hi>: Go · React · Node.js · Python · MongoDB</div>
              <div><Hi>Projects</Hi>: {posts.length}</div>
              <div><Hi>Skills</Hi>: {feed?.skills.length ?? 0}</div>
              <div><Hi>Shell</Hi>: portfolio-sh 1.0</div>
              <div><Hi>Status</Hi>: <span className="text-emerald-400">open to opportunities ●</span></div>
            </div>
          </div>,
        );
      case 'coffee':
        return print(<pre className="text-yellow-200 leading-tight">{`    ( (\n     ) )\n  ........\n  |      |]\n  \\      /\n   \`----'`}</pre>, <span>Brewing... ☕ Shivam runs on this.</span>);
      case 'theme': {
        const dark = arg !== 'light';
        document.documentElement.classList.toggle('dark', dark);
        try {
          localStorage.setItem('darkMode', JSON.stringify(dark));
        } catch {
          // storage unavailable
        }
        return print(<span>Theme set to {dark ? 'dark 🌙' : 'light ☀️'}</span>);
      }
      case 'history':
        return print(...history.map((h, i) => <Dim>{String(i + 1).padStart(3, ' ')}  {h}</Dim>));
      case 'date':
        return print(<span>{new Date().toString()}</span>);
      case 'echo':
        return print(<span>{arg}</span>);
      case 'hello':
      case 'hi':
        return print(<span>Hey there 👋 Type <Hi>help</Hi> to explore.</span>);
      default:
        return print(
          <span>
            <span className="text-red-400">command not found: {cmd}</span>. Type <Hi>help</Hi> for the list.
          </span>,
        );
    }
  };

  const submit = async () => {
    const value = input;
    setInput('');
    setHistIdx(null);
    if (hire) {
      print(<span className="text-gray-300">{'> '}{value}</span>);
      return answerHire(value);
    }
    print(
      <span>
        {prompt} <span className="text-white">{value}</span>
      </span>,
    );
    if (value.trim()) setHistory((h) => [...h, value.trim()]);
    await run(value);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!busy) submit();
    } else if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowUp' && !hire) {
      e.preventDefault();
      if (!history.length) return;
      const i = histIdx === null ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(i);
      setInput(history[i]);
    } else if (e.key === 'ArrowDown' && !hire) {
      e.preventDefault();
      if (histIdx === null) return;
      const i = histIdx + 1;
      if (i >= history.length) {
        setHistIdx(null);
        setInput('');
      } else {
        setHistIdx(i);
        setInput(history[i]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const v = input.trimStart();
      if (/^sudo\s+\S*$/.test(v)) return setInput('sudo hire-shivam');
      const matches = COMPLETIONS.filter((c) => c.startsWith(v.toLowerCase()));
      if (matches.length === 1) setInput(matches[0] + ' ');
      else if (matches.length > 1) print(<Dim>{matches.join('  ')}</Dim>);
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    } else if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      if (hire) {
        setHire(null);
        print(<Dim>^C cancelled.</Dim>);
      } else {
        print(<span>{prompt} {input}^C</span>);
        setInput('');
      }
    }
  };

  if (poweredOff) return <PowerOff />;
  return (
    <div className={`fixed inset-0 z-[85] bg-black/60 backdrop-blur-sm flex items-center justify-center ${maximized ? '' : 'sm:p-6'}`} onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Terminal"
        onClick={(e) => {
          e.stopPropagation();
          if (!window.getSelection()?.toString()) inputRef.current?.focus();
        }}
        // Phones always get the whole screen; on larger screens the green button maximises the window.
        className={`w-full h-full flex flex-col overflow-hidden bg-[#0c0c10] font-mono text-[13px] text-gray-300 transition-[max-width,height,border-radius] duration-200 ${
          maximized ? '' : 'sm:max-w-5xl sm:h-[75vh] sm:rounded-xl sm:border sm:border-gray-700 sm:shadow-2xl sm:shadow-orange-500/10'
        }`}
      >
        <div onDoubleClick={toggleMax} className="flex items-center gap-2 px-4 py-2.5 bg-[#16161d] border-b border-gray-800 select-none">
          {/* macOS traffic lights: hovering the group shows ×, − and the full-screen arrows. */}
          <div className="group flex items-center gap-2">
            <button onClick={close} aria-label="Close terminal" className={`${LIGHT} bg-[#ff5f57] after:absolute after:-inset-3 after:content-['']`}>
              <Glyph d="M4.2 4.2l3.6 3.6M7.8 4.2L4.2 7.8" stroke />
            </button>
            <span className={`${LIGHT} bg-[#febc2e]`}>
              <Glyph d="M3.5 6h5" stroke />
            </span>
            <button
              onClick={toggleMax}
              aria-label={maximized ? 'Restore terminal size' : 'Maximise terminal'}
              aria-pressed={maximized}
              title={maximized ? 'Restore' : 'Full screen'}
              className={`${LIGHT} bg-[#28c840] max-sm:pointer-events-none`}
            >
              <Glyph d={maximized ? 'M5.6 5.6H2.4l3.2-3.2zM6.4 6.4h3.2L6.4 9.6z' : 'M3.5 3.5h3l-3 3zM8.5 8.5h-3l3-3z'} />
            </button>
          </div>
          <span className="flex-1 text-center text-xs text-gray-400">{who}@shivam: ~ — portfolio-sh</span>
          <kbd className="hidden sm:inline text-[10px] text-gray-500 border border-gray-700 rounded px-1.5 py-0.5">esc</kbd>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1 whitespace-pre-wrap break-words">
          {lines.map((l) => (
            <div key={l.id}>{l.node}</div>
          ))}
          {busy && <div className="text-gray-500 animate-pulse">…</div>}
          <div className="flex items-center gap-2" ref={endRef}>
            {hire ? <span className="text-yellow-300">{'>'}</span> : prompt}
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={busy}
              autoFocus
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              aria-label="Terminal input"
              className="flex-1 bg-transparent outline-none text-white caret-orange-400 disabled:opacity-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
