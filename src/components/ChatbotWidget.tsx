import { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  Send,
  Mic,
  Square,
  Loader2,
  Volume2,
  VolumeX,
  MoreVertical,
  Sparkles,
  Rocket,
  Code,
  User,
  Briefcase,
  ArrowRight,
  CheckCheck,
  Info,
  Trash2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api, apiForm, ApiError, getToken } from '../lib/api';
import { useStore } from '../lib/store';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  local?: boolean; // greeting or error text shown here only, never sent to the model
}

const MAX_RECORDING_SECONDS = 30;
const SPEECH_RMS = 0.02; // mic level that counts as someone speaking (quiet room is ~0.001-0.005)
const canRecord = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

// Per-browser voice preferences; storage can be blocked, so fall back to the default.
const readPref = (key: string, fallback: boolean) => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
};
const savePref = (key: string, v: boolean) => {
  try {
    localStorage.setItem(key, v ? '1' : '0');
  } catch {
    /* not saved */
  }
};

// Markdown read aloud would say "asterisk"; keep only the words.
const plainText = (md: string) =>
  md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, 'the link')
    .replace(/[*_`#>~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// Spoken replies: a natural ElevenLabs voice from the backend, or the browser's own voice when that
// isn't configured or fails. Only one reply plays at a time.
let natural: 'unknown' | 'yes' | 'no' = 'unknown';
let playing: HTMLAudioElement | null = null;
let speakSeq = 0;

function stopSpeaking() {
  speakSeq++;
  playing?.pause();
  playing = null;
  if (canSpeak) speechSynthesis.cancel();
}

function speakWithBrowser(text: string) {
  if (!canSpeak) return;
  const u = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  const voice = voices.find((v) => v.lang === 'en-IN') ?? voices.find((v) => v.lang.startsWith('en'));
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? 'en-IN';
  speechSynthesis.speak(u);
}

async function speak(md: string) {
  stopSpeaking();
  const seq = speakSeq;
  const text = plainText(md);
  if (!text) return;
  if (natural !== 'no') {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/chat/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken() ?? ''}` },
        body: JSON.stringify({ text }),
      });
      if (res.status === 503) natural = 'no'; // not configured, or out of ElevenLabs credits: browser voice for this visit
      if (res.ok) {
        natural = 'yes';
        const url = URL.createObjectURL(await res.blob());
        if (seq !== speakSeq) return URL.revokeObjectURL(url); // stopped or replaced meanwhile
        const audio = new Audio(url);
        audio.onended = audio.onerror = () => URL.revokeObjectURL(url);
        playing = audio;
        await audio.play();
        return;
      }
    } catch {
      /* fall back below */
    }
  }
  if (seq === speakSeq) speakWithBrowser(text);
}

// Agnes-Tachyon character clips.
const IDLE_SRC = '/agnes-idle.webp';
const AVATAR_SRC = '/agnes-avatar.png'; // static profile icon for header and messages
const CLIPS = {
  wave: { src: '/agnes-wave.webp', ms: 4100 },
  dance: { src: '/agnes-dance.webp', ms: 6800 },
  think: { src: '/agnes-think.webp', ms: 0 }, // loops until the answer arrives
};
type Clip = keyof typeof CLIPS;
const FADE_MS = 200;
const DANCE_MIN_MS = 20000;
const DANCE_MAX_MS = 40000;
const HI = { text: 'Hi!', emoji: '👋' };
type Greeting = typeof HI;
export interface AgnesLayer {
  url: string;
  leaving: boolean;
}

function useAgnes(isLoading: boolean) {
  const [layer, setLayer] = useState<AgnesLayer | null>(null);
  const [bubble, setBubble] = useState<Greeting | null>(null);
  const current = useRef<{ clip: Clip; stop: () => void } | null>(null);
  const blobs = useRef<Partial<Record<Clip, Promise<Blob>>>>({});
  const lastPlay = useRef(0);

  /** Plays a clip over the idle loop (fading in and out); resolves when it has finished or was stopped. */
  const play = useCallback(async (clip: Clip, say?: Greeting) => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (say) {
        setBubble(say);
        setTimeout(() => setBubble(null), 3500);
      }
      return;
    }

    if (current.current) {
      // If wave is requested and she's currently dancing, stop dance to let wave play immediately!
      if (clip === 'wave' && current.current.clip === 'dance') {
        current.current.stop();
        await new Promise((r) => setTimeout(r, 60));
      } else {
        return;
      }
    }

    let stopped = false;
    let finish = () => {};
    current.current = { clip, stop: () => { stopped = true; finish(); } };
    let url = '';
    try {
      blobs.current[clip] ??= fetch(CLIPS[clip].src).then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))));
      // A fresh URL each time makes the clip start from its first frame.
      url = URL.createObjectURL(await blobs.current[clip]!);
    } catch {
      blobs.current[clip] = undefined;
    }
    if (url && !stopped) {
      setLayer({ url, leaving: false });
      if (say) setBubble(say);
      await new Promise<void>((resolve) => {
        const timer = CLIPS[clip].ms ? setTimeout(() => finish(), CLIPS[clip].ms) : 0;
        finish = () => {
          clearTimeout(timer);
          resolve();
        };
        if (stopped) finish();
      });
      setBubble(null);
      setLayer({ url, leaving: true });
      await new Promise((r) => setTimeout(r, FADE_MS));
      setLayer((l) => (l?.url === url ? null : l));
      URL.revokeObjectURL(url);
    } else if (url) {
      URL.revokeObjectURL(url);
    }
    current.current = null;
    lastPlay.current = Date.now();
  }, []);

  // Thinking runs while an answer is on its way.
  useEffect(() => {
    if (!isLoading) {
      if (current.current?.clip === 'think') current.current.stop();
      return;
    }
    let cancelled = false;
    (async () => {
      if (current.current) {
        current.current.stop();
        while (current.current && !cancelled) await new Promise((r) => setTimeout(r, 50));
      }
      if (!cancelled) void play('think');
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoading, play]);

  // She dances on her own at a random moment every 20-40 s (skipped while another clip plays or the tab is hidden).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const schedule = () => {
      timer = setTimeout(dance, DANCE_MIN_MS + Math.random() * (DANCE_MAX_MS - DANCE_MIN_MS));
    };
    const dance = async () => {
      if (cancelled) return;
      if (document.hidden || current.current || Date.now() - lastPlay.current < 3000) {
        timer = setTimeout(dance, 3000);
        return;
      }
      await play('dance');
      if (!cancelled) schedule();
    };
    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [play]);

  // Hovering her triggers the wave animation and "Hi! 👋" bubble.
  const onHover = () => {
    if (current.current?.clip === 'wave') return;
    if (current.current?.clip === 'dance') {
      current.current.stop();
    }
    if (current.current?.clip === 'think') return;
    void play('wave', HI);
  };

  return { layer, bubble, onHover };
}

/** The idle loop with the current clip faded in on top; the idle frame hides while a clip shows. */
function AgnesSprite({ layer, className }: { layer: AgnesLayer | null; className: string }) {
  const showing = !!layer && !layer.leaving;
  return (
    <span className="agnes-stack">
      <img src={IDLE_SRC} alt="" width={200} height={200} className={`${className} agnes-fade`} style={{ opacity: showing ? 0 : 1 }} />
      {layer && (
        <img key={layer.url} src={layer.url} alt="" width={200} height={200} className={`${className} agnes-layer agnes-fade`} style={{ opacity: showing ? 1 : 0 }} />
      )}
    </span>
  );
}

const SUGGESTIONS = [
  {
    icon: Rocket,
    label: 'Explore my projects',
    prompt: 'Explore my projects',
  },
  {
    icon: Code,
    label: 'What can you do?',
    prompt: 'What can you do?',
  },
  {
    icon: User,
    label: 'Hire Shivam',
    prompt: 'How can I hire Shivam or collaborate with him?',
  },
  {
    icon: Briefcase,
    label: 'Experience',
    prompt: "Tell me about Shivam's work experience and background.",
  },
];

export default function ChatbotWidget() {
  // Voice (mic and spoken replies) costs API credits, so it is for signed-in visitors only.
  const signedIn = !!useStore().user;
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: `### Hi there! 👋\nI'm Agnes-Tachyon, your AI assistant.\nI can help you explore my projects, answer questions, or find what you're looking for.`,
      timestamp: new Date(),
      local: true,
    },
  ]);
  const [input, setInput] = useState('');
  const [inputHistory, setInputHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('chatbot_input_history');
      if (stored) return JSON.parse(stored);
    } catch {
      /* no saved history */
    }
    return [];
  });
  const [historyIdx, setHistoryIdx] = useState<number | null>(null);
  const draftRef = useRef<string>('');

  // Undo / Redo stacks for Cmd+Z / Ctrl+Z and Cmd+Shift+Z / Cmd+Y
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const greeting = useAgnes(isLoading);

  const panelRef = useRef<HTMLDivElement>(null);
  const chibiRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [autoSend, setAutoSend] = useState(() => readPref('chat_voice_autosend', true));
  const [speakReplies, setSpeakReplies] = useState(() => readPref('chat_voice_speak', true));
  const recorderRef = useRef<MediaRecorder | null>(null);
  const discardRef = useRef(false);

  // Close chatbot when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        chibiRef.current &&
        !chibiRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  useEffect(() => {
    if (seconds >= MAX_RECORDING_SECONDS) recorderRef.current?.stop();
  }, [seconds]);

  // Closing the panel stops the mic, menu, and any reading aloud.
  useEffect(() => {
    if (isOpen) return;
    discardRef.current = true;
    recorderRef.current?.stop();
    setShowMenu(false);
    stopSpeaking();
  }, [isOpen]);

  useEffect(
    () => () => {
      discardRef.current = true;
      recorderRef.current?.stop();
      stopSpeaking();
    },
    [],
  );

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isOpen]);

  const handleSend = async (text = input, fromVoice = false) => {
    const trimmed = text.trim();
    stopSpeaking();
    if (!trimmed || isLoading) return;

    if (trimmed !== '••••••') {
      setInputHistory((prev) => {
        if (prev.length > 0 && prev[prev.length - 1] === trimmed) return prev;
        const next = [...prev, trimmed];
        try {
          localStorage.setItem('chatbot_input_history', JSON.stringify(next.slice(-50)));
        } catch {
          /* not saved */
        }
        return next;
      });
    }
    setHistoryIdx(null);
    draftRef.current = '';
    undoStackRef.current = [];
    redoStackRef.current = [];

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // The server keeps no conversation state; send this visitor's recent turns along.
      const history = messages.filter((m) => !m.local).slice(-8).map(({ role, content }) => ({ role, content }));
      const data = await api<{ response?: string; reset?: boolean }>('/chat', 'POST', { message: trimmed, history });
      // The reset code must not travel to the model with later questions.
      if (data.reset) setMessages((prev) => prev.map((m) => (m.id === userMsg.id ? { ...m, content: '••••••', local: true } : m)));

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response ?? 'I received your message!',
        timestamp: new Date(),
        local: data.reset,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (fromVoice && speakReplies && signedIn) void speak(assistantMsg.content);
    } catch (err) {
      const content =
        err instanceof ApiError && (err.status === 403 || err.status === 503)
          ? err.message
          : "I'm having trouble connecting right now. Please try again in a moment.";
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        timestamp: new Date(),
        local: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const note = (content: string) =>
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'assistant', content, timestamp: new Date(), local: true }]);

  const startRecording = async () => {
    if (recording || transcribing || isLoading) return;
    stopSpeaking();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      note('I could not use your microphone. Please allow mic access in the browser, or type your message.');
      return;
    }
    const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks: Blob[] = [];
    const started = Date.now();
    // Whisper turns silence into text ("Thank you."), so only send clips where the mic picked up a voice.
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    ctx.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    let heard = false;
    const meter = setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      const rms = Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / samples.length);
      if (rms > SPEECH_RMS) heard = true;
    }, 100);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      clearInterval(meter);
      void ctx.close();
      stream.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
      setRecording(false);
      if (discardRef.current || Date.now() - started < 600) return; // cancelled or an accidental tap
      if (!heard) return note("I couldn't hear anything. Check your mic and try again, or type your message.");
      const blob = new Blob(chunks, { type: (rec.mimeType || type || 'audio/webm').split(';')[0] });
      const form = new FormData();
      form.append('audio', blob, 'voice');
      setTranscribing(true);
      try {
        const { text } = await apiForm<{ text: string }>('/chat/transcribe', form);
        if (autoSendRef.current) handleSendRef.current(text, true);
        else {
          undoStackRef.current.push(input);
          setInput(text);
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      } catch (err) {
        note(err instanceof ApiError && err.status < 500 ? err.message : 'Voice input is unavailable right now. Please type your message.');
      } finally {
        setTranscribing(false);
      }
    };
    discardRef.current = false;
    recorderRef.current = rec;
    setSeconds(0);
    setRecording(true);
    rec.start();
  };

  const stopRecording = (discard: boolean) => {
    discardRef.current = discard;
    recorderRef.current?.stop();
  };

  const autoSendRef = useRef(autoSend);
  autoSendRef.current = autoSend;
  const handleSendRef = useRef(handleSend);
  handleSendRef.current = handleSend;

  const executeUndo = () => {
    clearTimeout(undoTimerRef.current ?? undefined);
    if (undoStackRef.current.length === 0) {
      if (input !== '') {
        redoStackRef.current.push(input);
        setInput('');
      }
      return;
    }
    const prev = undoStackRef.current.pop()!;
    redoStackRef.current.push(input);
    setInput(prev);
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.selectionStart = prev.length;
        inputRef.current.selectionEnd = prev.length;
      }
    });
  };

  const executeRedo = () => {
    clearTimeout(undoTimerRef.current ?? undefined);
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(input);
    setInput(next);
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.selectionStart = next.length;
        inputRef.current.selectionEnd = next.length;
      }
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    const currentVal = input;

    if (newVal !== currentVal) {
      redoStackRef.current = [];

      if (historyIdx !== null) {
        setHistoryIdx(null);
      }

      clearTimeout(undoTimerRef.current ?? undefined);
      const lenDiff = Math.abs(newVal.length - currentVal.length);
      if (lenDiff > 1 || newVal.endsWith(' ') || currentVal.endsWith(' ')) {
        const last = undoStackRef.current[undoStackRef.current.length - 1];
        if (last !== currentVal) {
          undoStackRef.current.push(currentVal);
          if (undoStackRef.current.length > 60) undoStackRef.current.shift();
        }
      } else {
        undoTimerRef.current = setTimeout(() => {
          const last = undoStackRef.current[undoStackRef.current.length - 1];
          if (last !== currentVal) {
            undoStackRef.current.push(currentVal);
            if (undoStackRef.current.length > 60) undoStackRef.current.shift();
          }
        }, 250);
      }
    }

    setInput(newVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isMod = e.metaKey || e.ctrlKey;

    // Undo: Cmd+Z (Mac) or Ctrl+Z (Windows)
    if (isMod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        executeRedo();
      } else {
        executeUndo();
      }
      return;
    }

    // Redo: Cmd+Y or Ctrl+Y
    if (isMod && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      executeRedo();
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }

    // Arrow Up: navigate backward in sent message history
    if (e.key === 'ArrowUp') {
      if (inputHistory.length === 0) return;
      e.preventDefault();

      if (historyIdx === null) {
        draftRef.current = input;
        undoStackRef.current.push(input);
        const nextIdx = inputHistory.length - 1;
        setHistoryIdx(nextIdx);
        const val = inputHistory[nextIdx];
        setInput(val);
        requestAnimationFrame(() => {
          inputRef.current?.setSelectionRange(val.length, val.length);
        });
      } else if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        const val = inputHistory[nextIdx];
        setInput(val);
        requestAnimationFrame(() => {
          inputRef.current?.setSelectionRange(val.length, val.length);
        });
      }
      return;
    }

    // Arrow Down: navigate forward in sent message history
    if (e.key === 'ArrowDown') {
      if (historyIdx === null) return;
      e.preventDefault();

      if (historyIdx < inputHistory.length - 1) {
        const nextIdx = historyIdx + 1;
        setHistoryIdx(nextIdx);
        const val = inputHistory[nextIdx];
        setInput(val);
        requestAnimationFrame(() => {
          inputRef.current?.setSelectionRange(val.length, val.length);
        });
      } else {
        setHistoryIdx(null);
        const val = draftRef.current;
        setInput(val);
        requestAnimationFrame(() => {
          inputRef.current?.setSelectionRange(val.length, val.length);
        });
      }
      return;
    }

    // Escape while navigating history restores the typed draft
    if (e.key === 'Escape' && historyIdx !== null) {
      e.stopPropagation();
      e.preventDefault();
      setHistoryIdx(null);
      setInput(draftRef.current);
      return;
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <>
      {/* ── Outside Chibi Character + Bubble (Floating bottom-right) ── */}
      <div
        ref={chibiRef}
        onPointerEnter={greeting.onHover}
        className="chatbot-chibi-container"
      >
        {/* Floating Callout Bubble: Only shows on hover ("Hi! 👋") so it never covers the chatbox */}
        {greeting.bubble && (
          <button
            onClick={() => setIsOpen((v) => !v)}
            className="chatbot-chibi-bubble"
            aria-label={greeting.bubble.text}
          >
            <span>
              {greeting.bubble.text}{' '}
              <span className="chatbot-greet-emoji" aria-hidden="true">
                {greeting.bubble.emoji}
              </span>
            </span>
            <div className="chatbot-chibi-tail" />
          </button>
        )}

        {/* Chibi Agnes Avatar Button */}
        <button
          onClick={() => setIsOpen((v) => !v)}
          onFocus={greeting.onHover}
          className="chatbot-toggle-btn"
          aria-label="Toggle Agnes-Tachyon chatbot"
        >
          <div className="chatbot-video-wrapper">
            <AgnesSprite layer={greeting.layer} className="chatbot-video" />
          </div>
        </button>
      </div>

      {/* ── Chat Panel ── */}
      <div
        ref={panelRef}
        className={`chatbot-panel ${isOpen ? 'chatbot-panel--open' : ''}`}
      >
        {/* Subtle Wave Line Art at Top */}
        <svg className="chatbot-header-waves" viewBox="0 0 420 120" fill="none" preserveAspectRatio="none" aria-hidden="true">
          <path d="M-60,130 Q210,-20 480,130" stroke="url(#header-glow-gradient)" strokeWidth="1.2" strokeOpacity="0.22" />
          <path d="M-40,150 Q210,10 460,150" stroke="url(#header-glow-gradient)" strokeWidth="1.2" strokeOpacity="0.16" />
          <path d="M-20,170 Q210,40 440,170" stroke="url(#header-glow-gradient)" strokeWidth="1.2" strokeOpacity="0.12" />
          <path d="M0,190 Q210,70 420,190" stroke="url(#header-glow-gradient)" strokeWidth="1.2" strokeOpacity="0.08" />
          <defs>
            <linearGradient id="header-glow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff7a45" />
              <stop offset="50%" stopColor="#ff4d6d" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>

        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-left">
            <div className="chatbot-header-avatar">
              <img src={AVATAR_SRC} alt="Agnes-Tachyon" className="chatbot-header-video" />
            </div>
            <div className="chatbot-header-info">
              <h3 className="chatbot-header-name">Agnes-Tachyon</h3>
              <p className="chatbot-header-status">
                <span className="chatbot-status-pulse" />
                Online • AI Assistant
              </p>
            </div>
          </div>

          <div className="chatbot-header-actions">
            {signedIn && (
              <button
                onClick={() => {
                  const v = !speakReplies;
                  setSpeakReplies(v);
                  savePref('chat_voice_speak', v);
                  if (!v) stopSpeaking();
                }}
                className="chatbot-header-btn"
                aria-label={speakReplies ? 'Mute spoken replies' : 'Read replies to voice messages aloud'}
                title={speakReplies ? 'Spoken replies: On' : 'Spoken replies: Off'}
              >
                {speakReplies ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
            )}

            {/* More Options Dropdown Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="chatbot-header-btn"
                aria-label="More options"
                title="Options"
              >
                <MoreVertical size={16} />
              </button>

              {showMenu && (
                <div className="chatbot-dropdown-menu">
                  <button
                    onClick={() => {
                      setMessages([
                        {
                          id: '0',
                          role: 'assistant',
                          content: `### Hi there! 👋\nI'm Agnes-Tachyon, your AI assistant.\nI can help you explore my projects, answer questions, or find what you're looking for.`,
                          timestamp: new Date(),
                          local: true,
                        },
                      ]);
                      setShowMenu(false);
                    }}
                    className="chatbot-dropdown-item"
                  >
                    <Trash2 size={14} className="text-red-400" />
                    <span>Clear chat history</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="chatbot-header-btn"
              aria-label="Close"
              title="Close chat"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="chatbot-messages">
          {messages.map((msg, idx) => (
            <div key={msg.id} className="chatbot-message-group">
              <div
                className={`chatbot-message ${
                  msg.role === 'user' ? 'chatbot-message--user' : 'chatbot-message--assistant'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="chatbot-avatar-agnes">
                    <img src={AVATAR_SRC} alt="Agnes" className="chatbot-avatar-img" />
                  </div>
                )}

                <div className="chatbot-bubble-wrapper">
                  <div className="chatbot-bubble">
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="chatbot-md-p">{children}</p>,
                          strong: ({ children }) => <strong className="chatbot-md-strong">{children}</strong>,
                          em: ({ children }) => <em className="chatbot-md-em">{children}</em>,
                          ul: ({ children }) => <ul className="chatbot-md-ul">{children}</ul>,
                          ol: ({ children }) => <ol className="chatbot-md-ol">{children}</ol>,
                          li: ({ children }) => <li className="chatbot-md-li">{children}</li>,
                          code: ({ children }) => <code className="chatbot-md-code">{children}</code>,
                          pre: ({ children }) => <pre className="chatbot-md-pre">{children}</pre>,
                          h1: ({ children }) => <h1 className="chatbot-md-h">{children}</h1>,
                          h2: ({ children }) => <h2 className="chatbot-md-h">{children}</h2>,
                          h3: ({ children }) => <h3 className="chatbot-md-h chatbot-md-h3">{children}</h3>,
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="chatbot-md-a">
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>

                  <div className="chatbot-time-row">
                    <span className="chatbot-time">{formatTime(msg.timestamp)}</span>
                    {msg.role === 'user' && (
                      <CheckCheck size={13} className="chatbot-check-icon" aria-hidden="true" />
                    )}
                  </div>
                </div>
              </div>

              {/* Suggestions Grid directly under the initial welcome message */}
              {idx === 0 && (
                <div className="chatbot-suggestions-section">
                  <div className="chatbot-suggestions-header">
                    <Sparkles size={14} className="chatbot-sparkle-icon" />
                    <span>Try asking me</span>
                  </div>
                  <div className="chatbot-suggestions-grid">
                    {SUGGESTIONS.map((item, sIdx) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => handleSend(item.prompt)}
                          className="chatbot-suggestion-card"
                        >
                          <div className="chatbot-suggestion-left">
                            <Icon size={15} className="chatbot-suggestion-icon" />
                            <span className="chatbot-suggestion-label">{item.label}</span>
                          </div>
                          <ArrowRight size={13} className="chatbot-suggestion-arrow" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="chatbot-message chatbot-message--assistant">
              <div className="chatbot-avatar-agnes">
                <img src={AVATAR_SRC} alt="Agnes" className="chatbot-avatar-img" />
              </div>
              <div className="chatbot-bubble chatbot-bubble--typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar & Disclaimer */}
        <div className="chatbot-bottom-area">
          {recording ? (
            <div className="chatbot-input-container chatbot-recording-bar">
              <button
                onClick={() => stopRecording(true)}
                className="chatbot-input-cancel"
                aria-label="Cancel recording"
                title="Cancel"
              >
                <X size={16} />
              </button>
              <span className="chatbot-rec-dot" aria-hidden="true" />
              <span className="chatbot-rec-time" role="status">
                {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} / 0:{MAX_RECORDING_SECONDS}
              </span>
              <button
                onClick={() => {
                  setAutoSend(!autoSend);
                  savePref('chat_voice_autosend', !autoSend);
                }}
                className={`chatbot-autosend ${autoSend ? 'chatbot-autosend--on' : ''}`}
                aria-pressed={autoSend}
                title={
                  autoSend
                    ? 'Sends as soon as you stop. Tap to review the text first.'
                    : 'You can edit the text before sending. Tap to send right away.'
                }
              >
                {autoSend ? 'Auto-send' : 'Edit first'}
              </button>
              <button
                onClick={() => stopRecording(false)}
                className="chatbot-input-send"
                aria-label={autoSend ? 'Stop and send' : 'Stop and edit'}
                title="Stop"
              >
                <Square size={14} fill="currentColor" />
              </button>
            </div>
          ) : (
            <div className="chatbot-input-container">
              {/* Text Input */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={transcribing ? 'Listening to your message…' : 'Message Agnes-Tachyon…'}
                className="chatbot-input-field"
                disabled={isLoading || transcribing}
              />

              {/* Voice / Mic Button */}
              {canRecord && signedIn && (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isLoading || transcribing}
                  className="chatbot-input-mic"
                  aria-label="Speak your message"
                  title="Speak your message"
                >
                  {transcribing ? <Loader2 size={16} className="animate-spin text-orange-400" /> : <Mic size={16} />}
                </button>
              )}

              {/* Send Button */}
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="chatbot-input-send"
                aria-label="Send message"
                title="Send"
              >
                <Send size={15} />
              </button>
            </div>
          )}

          {/* Disclaimer Footer */}
          <div className="chatbot-disclaimer">
            <Info size={11} className="chatbot-disclaimer-icon" />
            <span>AI-generated responses may not always be accurate.</span>
          </div>
        </div>
      </div>
    </>
  );
}
