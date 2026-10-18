import { useEffect, useRef, useState } from 'react';
import { api, apiForm, type Contact } from '../lib/api';
import { useStore } from '../lib/store';
import Sidebar from './Sidebar';
import { Mail, User, MessageSquare, Send, Instagram, Github, Linkedin, Twitter, MapPin, Phone, Pencil, Loader2, Sparkles, Undo2, X, ChevronDown, LayoutTemplate, Paperclip, FileText } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function ContactModal({ isOpen, onClose, activeTab, onTabChange }: ContactModalProps) {
  const { user } = useStore();
  // A signed-in visitor's name and email are filled in for them; they can still change both.
  const signedInName = user ? user.name || user.username : '';
  const signedInEmail = user?.email ?? '';
  const [formData, setFormData] = useState({
    name: signedInName,
    email: signedInEmail,
    subject: '',
    message: '',
  });

  // Fill them in after signing in (or once the session loads), without overwriting anything typed.
  useEffect(() => {
    setFormData((f) => ({ ...f, name: f.name || signedInName, email: f.email || signedInEmail }));
  }, [signedInName, signedInEmail]);

  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Client-side validation
    if (!formData.name.trim()) {
      setErrorMessage('Name is required');
      return;
    }
    if (!formData.email.trim()) {
      setErrorMessage('Email is required');
      return;
    }
    if (!formData.subject.trim()) {
      setErrorMessage('Subject is required');
      return;
    }
    if (!formData.message.trim()) {
      setErrorMessage('Message is required');
      return;
    }

    setIsSubmitting(true);

    try {
      if (files.length) {
        const form = new FormData();
        Object.entries(formData).forEach(([k, v]) => form.append(k, v));
        files.forEach((f) => form.append('attachments', f));
        await apiForm('/contact', form);
      } else {
        await api('/contact', 'POST', formData);
      }
      setFiles([]);
      setIsSubmitting(false);
      setSubmitStatus('success');
      setFormData((f) => ({ name: f.name, email: f.email, subject: '', message: '' })); // keep who they are for the next message
      setTimeout(() => setSubmitStatus('idle'), 3000);
    } catch (error) {
      setIsSubmitting(false);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send message');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white dark:bg-black z-50 overflow-hidden flex flex-col lg:flex-row">
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} onModalClose={onClose} />

      <div className="flex-1 overflow-y-auto">

        <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-10 pb-28">
          <header className="text-center mb-10">
            <div className="inline-flex p-3 mb-4 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full text-white">
              <Mail size={26} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 bg-clip-text text-transparent">
              Get In Touch
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Have a project, role or idea? I'd love to hear about it.</p>
          </header>

          <div className="grid md:grid-cols-2 gap-10">
          {/* Left - Contact Info */}
          <ContactDetails />

          {/* Right - Contact Form */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">Send a Message</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Your Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg py-2 pl-10 pr-4 text-sm text-black dark:text-white focus:outline-none focus:border-pink-500 transition-colors placeholder-gray-400 dark:placeholder-gray-600"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg py-2 pl-10 pr-4 text-sm text-black dark:text-white focus:outline-none focus:border-pink-500 transition-colors placeholder-gray-400 dark:placeholder-gray-600"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <SubjectField
                  value={formData.subject}
                  onChange={handleChange}
                  name={formData.name}
                  message={formData.message}
                  onApply={(subject, message) => setFormData((f) => ({ ...f, subject, message }))}
                />
              </div>

              <div>
                <HelpMeWrite
                  name={formData.name}
                  subject={formData.subject}
                  message={formData.message}
                  onApply={(subject, message) => setFormData((f) => ({ ...f, subject: subject || f.subject, message }))}
                />
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  onKeyDown={(e) => {
                    if (e.key !== 'Tab') return;
                    const box = e.currentTarget;
                    if (selectBlank(box, e.shiftKey)) return e.preventDefault();
                    // Shift+Tab past the first blank goes back to the subject's blanks, if any.
                    const subject = document.getElementById('subject') as HTMLInputElement | null;
                    if (e.shiftKey && subject && hasBlank(subject.value)) {
                      e.preventDefault();
                      subject.setSelectionRange(subject.value.length, subject.value.length);
                      selectBlank(subject, true);
                    }
                  }}
                  required
                  rows={7}
                  className="w-full bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-4 text-sm text-black dark:text-white focus:outline-none focus:border-pink-500 transition-colors resize-none placeholder-gray-400 dark:placeholder-gray-600"
                  placeholder="Tell me about your project..."
                />
                <Attachments files={files} onChange={setFiles} />
                {(hasBlank(formData.message) || hasBlank(formData.subject)) && (
                  <p className="mt-1 text-[11px] text-gray-500">
                    Fill in the <span className="text-pink-500">[blanks]</span>: press <kbd className="px-1 border border-gray-400 dark:border-gray-600 rounded">Tab</kbd> for the next one, <kbd className="px-1 border border-gray-400 dark:border-gray-600 rounded">Shift</kbd>+<kbd className="px-1 border border-gray-400 dark:border-gray-600 rounded">Tab</kbd> to go back.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-lg py-2 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Message
                  </>
                )}
              </button>

              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-center text-red-400 text-sm">
                  {errorMessage}
                </div>
              )}

              {submitStatus === 'success' && (
                <div className="bg-green-500/10 border border-green-500 rounded-lg p-3 text-center text-green-400 text-sm">
                  Message sent successfully! I'll get back to you soon.
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-center text-red-400 text-sm">
                  Failed to send message. Please try again or use the email provided.
                </div>
              )}
            </form>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const SOCIALS = [
  { key: 'instagram', icon: Instagram, label: 'Instagram', color: 'from-purple-500 to-pink-500' },
  { key: 'github', icon: Github, label: 'GitHub', color: 'from-gray-700 to-gray-900' },
  { key: 'linkedin', icon: Linkedin, label: 'LinkedIn', color: 'from-blue-600 to-blue-800' },
  { key: 'twitter', icon: Twitter, label: 'Twitter / X', color: 'from-blue-400 to-blue-600' },
] as const;

const EMPTY_CONTACT: Contact = { email: '', phone: '', location: '', instagram: '', github: '', linkedin: '', twitter: '' };

/** Contact info and social links from the profile; the admin can edit them in place. */
function ContactDetails() {
  const { feed, user } = useStore();
  const contact = feed?.profile?.contact ?? EMPTY_CONTACT;
  const [editing, setEditing] = useState(false);

  if (editing) return <ContactEditor initial={contact} onDone={() => setEditing(false)} />;

  const rows = [
    { icon: Mail, label: 'Email', value: contact.email, href: contact.email && `mailto:${contact.email}` },
    { icon: Phone, label: 'Phone', value: contact.phone, href: contact.phone && `tel:${contact.phone.replace(/[^0-9+]/g, '')}` },
    { icon: MapPin, label: 'Location', value: contact.location, href: '' },
  ].filter((r) => r.value);
  const socials = SOCIALS.filter((s) => contact[s.key]);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-black dark:text-white">Contact Information</h2>
          {user?.isAdmin && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-orange-500 border border-orange-500/40 hover:bg-orange-500/10">
              <Pencil size={14} /> Edit contact details
            </button>
          )}
        </div>
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg flex-shrink-0 text-white">
                <r.icon size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">{r.label}</div>
                {r.href ? (
                  <a href={r.href} className="text-black dark:text-white hover:text-pink-600 dark:hover:text-pink-400 transition-colors break-all">
                    {r.value}
                  </a>
                ) : (
                  <div className="text-black dark:text-white">{r.value}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {socials.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-black dark:text-white">Follow Me</h3>
          <div className="grid grid-cols-2 gap-2">
            {socials.map((s) => (
              <a
                key={s.key}
                href={contact[s.key]}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 p-2 bg-gradient-to-br ${s.color} rounded-lg hover:scale-105 transition-transform text-sm text-white`}
              >
                <s.icon size={16} />
                <span className="font-medium">{s.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ContactEditor({ initial, onDone }: { initial: Contact; onDone: () => void }) {
  const { reloadFeed } = useStore();
  const [c, setC] = useState<Contact>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof Contact) => (e: React.ChangeEvent<HTMLInputElement>) => setC((x) => ({ ...x, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/profile/contact', 'PUT', c);
      await reloadFeed();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
      setSaving(false);
    }
  };

  const input =
    'w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white placeholder-gray-500 focus:outline-none focus:border-orange-500';
  const fields: { key: keyof Contact; label: string; placeholder: string; type?: string }[] = [
    { key: 'email', label: 'Email', placeholder: 'you@gmail.com', type: 'email' },
    { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210', type: 'tel' },
    { key: 'location', label: 'Location', placeholder: 'Noida, India' },
    { key: 'instagram', label: 'Instagram link', placeholder: 'instagram.com/username' },
    { key: 'github', label: 'GitHub link', placeholder: 'github.com/username' },
    { key: 'linkedin', label: 'LinkedIn link', placeholder: 'linkedin.com/in/username' },
    { key: 'twitter', label: 'Twitter / X link', placeholder: 'x.com/username' },
  ];

  return (
    <form onSubmit={save} className="space-y-3 p-5 rounded-2xl border border-orange-500/40 bg-orange-500/5">
      <h2 className="text-lg font-semibold text-black dark:text-white">Edit contact details</h2>
      <p className="text-xs text-gray-500">Leave a field empty to hide it. Changes also update the terminal and the chatbot.</p>
      {fields.map((f) => (
        <div key={f.key}>
          <label htmlFor={`ct-${f.key}`} className="block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">{f.label}</label>
          <input id={`ct-${f.key}`} type={f.type ?? 'text'} className={input} placeholder={f.placeholder} value={c[f.key]} onChange={set(f.key)} />
        </div>
      ))}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onDone} disabled={saving} className="flex-1 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 font-semibold">Cancel</button>
        <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold disabled:opacity-70">
          {saving && <Loader2 size={16} className="animate-spin" />} Save
        </button>
      </div>
    </form>
  );
}

const TONES = ['professional', 'friendly', 'short'] as const;

/**
 * "✨ Help me write": the visitor describes what they want in a few words (or has a rough draft)
 * and the AI writes the subject and message. Undo restores what was there before.
 */
function HelpMeWrite({ name, subject, message, onApply }: {
  name: string;
  subject: string;
  message: string;
  onApply: (subject: string, message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState('');
  const [tone, setTone] = useState<(typeof TONES)[number]>('professional');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [previous, setPrevious] = useState<{ subject: string; message: string } | null>(null);
  const improving = message.trim().length > 0;

  const generate = async () => {
    if (!intent.trim() && !improving) return setError('Describe what you want to say, e.g. "hire for a Go backend role at Acme"');
    setBusy(true);
    setError('');
    try {
      const res = await api<{ subject: string; message: string }>('/contact/draft', 'POST', { intent, draft: message, tone, name });
      setPrevious({ subject, message });
      onApply(res.subject, res.message);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not write a draft');
    } finally {
      setBusy(false);
    }
  };

  const chip = (active: boolean) =>
    `px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${active ? 'border-pink-500 bg-pink-500/15 text-pink-500' : 'border-gray-300 dark:border-gray-700 text-gray-500'}`;

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="message" className="block text-sm font-medium text-gray-600 dark:text-gray-400">
          Message
        </label>
        <div className="flex items-center gap-2">
          {previous && (
            <button
              type="button"
              onClick={() => {
                onApply(previous.subject, previous.message);
                setPrevious(null);
              }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-black dark:hover:text-white"
            >
              <Undo2 size={13} /> Undo
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-90"
          >
            <Sparkles size={13} /> {improving ? 'Improve my draft' : 'Help me write'}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-2 p-3 rounded-xl border border-pink-500/40 bg-pink-500/5 space-y-2.5">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-pink-500 shrink-0" />
            <input
              autoFocus
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault(); // don't submit the contact form
                  generate();
                }
              }}
              placeholder={improving ? 'Optional: what should change? e.g. "make it more formal"' : 'What do you want to say? e.g. "hire for a Go backend role at Acme"'}
              maxLength={500}
              aria-label="What do you want to say"
              className="flex-1 bg-transparent text-sm text-black dark:text-white placeholder-gray-500 outline-none"
            />
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-gray-500 hover:text-black dark:hover:text-white">
              <X size={15} />
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {TONES.map((t) => (
              <button key={t} type="button" onClick={() => setTone(t)} aria-pressed={tone === t} className={chip(tone === t)}>
                {t}
              </button>
            ))}
            <button
              type="button"
              onClick={generate}
              disabled={busy}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-pink-500 disabled:opacity-60"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {busy ? 'Writing...' : improving ? 'Improve' : 'Write it'}
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <p className="text-[11px] text-gray-500">AI writes a draft for you to review and edit before sending.</p>
        </div>
      )}
    </div>
  );
}

const BLANK = /\[[^\]\n]+\]/g;
const hasBlank = (text: string) => /\[[^\]\n]+\]/.test(text);

/**
 * Selects the next (or previous) [blank] in a text field, starting from the cursor. Returns false
 * when there is none in that direction, so Tab can fall back to moving focus as usual.
 */
function selectBlank(el: HTMLInputElement | HTMLTextAreaElement, backwards: boolean, fromStart = false): boolean {
  const blanks = [...el.value.matchAll(BLANK)].map((m) => ({ start: m.index!, end: m.index! + m[0].length }));
  const pos = fromStart ? 0 : backwards ? el.selectionStart ?? 0 : el.selectionEnd ?? 0;
  const pick = backwards ? [...blanks].reverse().find((b) => b.end <= pos && b.start < pos) : blanks.find((b) => b.start >= pos);
  if (!pick) return false;
  el.focus();
  el.setSelectionRange(pick.start, pick.end);
  return true;
}

// Message templates offered from the Subject field. [Blanks] are for the visitor to fill in:
// the first one is selected right after a template is applied, and Tab jumps to the next.
const signOff = (name: string) => (name.trim() ? `\n\nBest regards,\n${name.trim()}` : '');
const TEMPLATES: { emoji: string; label: string; subject: string; body: (name: string) => string }[] = [
  {
    emoji: '💼',
    label: 'Job opportunity',
    subject: 'Job opportunity: [role] at [company]',
    body: (n) => `Hi Shivam,\n\nI'm reaching out from [company]. We're hiring for a [role] position ([remote / onsite / hybrid]) and your work on your portfolio stood out.\n\nWould you be open to a quick call this week to talk about it?${signOff(n)}`,
  },
  {
    emoji: '🧑‍💻',
    label: 'Freelance project',
    subject: 'Freelance project: [project name]',
    body: (n) => `Hi Shivam,\n\nI'm looking for a developer to help build [what you want to build]. The rough budget is [budget] and I'd like to have it ready by [deadline].\n\nAre you available to take this on? Happy to share more details.${signOff(n)}`,
  },
  {
    emoji: '🎓',
    label: 'Internship',
    subject: 'Internship opportunity at [company]',
    body: (n) => `Hi Shivam,\n\nWe have a [duration] internship opening at [company] for [team / role], and your projects look like a great fit.\n\nLet me know if you'd like to apply or chat about it.${signOff(n)}`,
  },
  {
    emoji: '🤝',
    label: 'Collaboration',
    subject: "Let's build something together",
    body: (n) => `Hi Shivam,\n\nI'm working on [your idea / project] and think your experience would be a great addition. [Link, if any]\n\nWould you be interested in collaborating?${signOff(n)}`,
  },
  {
    emoji: '🎤',
    label: 'Talk / event invite',
    subject: 'Invitation to speak at [event name]',
    body: (n) => `Hi Shivam,\n\nWe're organising [event name] on [date] and would love for you to give a talk or join as a [speaker / judge / mentor].\n\nCould we set up a quick call to discuss?${signOff(n)}`,
  },
  {
    emoji: '💬',
    label: 'Feedback on a project',
    subject: 'Feedback on [project name]',
    body: (n) => `Hi Shivam,\n\nI checked out [project name] on your portfolio. [What you liked or a suggestion]\n\nKeep up the great work!${signOff(n)}`,
  },
  {
    emoji: '👋',
    label: 'Just saying hi',
    subject: 'Hello from [your name]',
    body: (n) => `Hi Shivam,\n\nI came across your portfolio and wanted to say hi. [Anything you'd like to share]${signOff(n)}`,
  },
];

/** Subject input with a template dropdown; hovering a template previews the message it writes. */
function SubjectField({ value, onChange, name, message, onApply }: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name: string;
  message: string;
  onApply: (subject: string, message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<{ subject: string; message: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const apply = (i: number) => {
    const t = TEMPLATES[i];
    setPrevious({ subject: value, message });
    onApply(t.subject, t.body(name));
    setOpen(false);
    // Select the first [blank] in the message so the visitor can type straight over it.
    // Start at the first [blank]: the subject's if it has one, else the message's. Tab moves on.
    setTimeout(() => {
      const subject = document.getElementById('subject') as HTMLInputElement | null;
      const box = document.getElementById('message') as HTMLTextAreaElement | null;
      if (subject && selectBlank(subject, false, true)) return;
      if (box && selectBlank(box, false, true)) box.scrollTop = 0; // keep the greeting in view
    }, 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' && e.altKey) setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % TEMPLATES.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + TEMPLATES.length) % TEMPLATES.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      apply(active);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const preview = TEMPLATES[active];

  return (
    <div ref={ref} className="relative" onKeyDown={onKeyDown}>
      <div className="flex items-center justify-between mb-2">
        <label htmlFor="subject" className="block text-sm font-medium text-gray-600 dark:text-gray-400">
          Subject
        </label>
        {previous && (
          <button
            type="button"
            onClick={() => {
              onApply(previous.subject, previous.message);
              setPrevious(null);
            }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-black dark:hover:text-white"
          >
            <Undo2 size={13} /> Undo template
          </button>
        )}
      </div>
      <div className="relative">
        <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
        <input
          type="text"
          id="subject"
          name="subject"
          value={value}
          onChange={onChange}
          onKeyDown={(e) => {
            if (e.key !== 'Tab' || e.shiftKey) return;
            if (selectBlank(e.currentTarget, false)) return e.preventDefault();
            const box = document.getElementById('message') as HTMLTextAreaElement | null;
            if (box && hasBlank(box.value)) {
              e.preventDefault();
              selectBlank(box, false, true);
              box.scrollTop = 0;
            }
          }}
          required
          className="w-full bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg py-2 pl-10 pr-32 text-sm text-black dark:text-white focus:outline-none focus:border-pink-500 transition-colors placeholder-gray-400 dark:placeholder-gray-600"
          placeholder="Type a subject or pick a template"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-pink-500 hover:bg-pink-500/10"
        >
          <LayoutTemplate size={14} /> Templates <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-2xl overflow-hidden sm:grid sm:grid-cols-[minmax(0,15rem)_1fr]">
          <ul role="listbox" aria-label="Message templates" className="max-h-80 overflow-y-auto py-1 sm:border-r border-gray-200 dark:border-gray-800">
            {TEMPLATES.map((t, i) => (
              <li
                key={t.label}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()} // keep focus on the field
                onClick={() => apply(i)}
                className={`px-3 py-2 cursor-pointer ${i === active ? 'bg-pink-500/10' : ''}`}
              >
                <div className="text-sm font-semibold text-black dark:text-white">
                  {t.emoji} {t.label}
                </div>
                <div className="text-xs text-gray-500 truncate">{t.subject}</div>
              </li>
            ))}
          </ul>
          {/* What will be typed into the message */}
          <div className="hidden sm:block p-4 max-h-80 overflow-y-auto">
            <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-500 mb-2">Preview</p>
            <p className="text-sm font-semibold text-black dark:text-white mb-2">{preview.subject}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
              {preview.body(name).split(/(\[[^\]]+\])/).map((part, i) =>
                part.startsWith('[') ? (
                  <mark key={i} className="bg-pink-500/15 text-pink-600 dark:text-pink-400 rounded px-0.5">{part}</mark>
                ) : (
                  <span key={i}>{part}</span>
                ),
              )}
            </p>
            <p className="mt-3 text-[11px] text-gray-500">Click to use it. Highlighted [blanks] are for you to fill in.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Mirrors the server's rules so visitors get instant feedback; the server checks again by content.
const ATTACH_EXT = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.docx', '.txt'];
const MAX_FILES = 3;
const MAX_FILE = 5 * 1024 * 1024;
const MAX_TOTAL = 10 * 1024 * 1024;

const fmtSize = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

/** Optional files for the message: up to 3 PDFs, images, DOCX or TXT, 5 MB each, 10 MB total. */
function Attachments({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) {
  const [error, setError] = useState('');

  const add = (list: FileList | null) => {
    if (!list?.length) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
      if (!ATTACH_EXT.includes(ext)) return setError(`${f.name}: only PDF, PNG, JPG, WEBP, DOCX and TXT files are allowed`);
      if (f.size === 0) return setError(`${f.name} is empty`);
      if (f.size > MAX_FILE) return setError(`${f.name} is larger than 5 MB`);
      if (next.some((x) => x.name === f.name && x.size === f.size)) continue; // already added
      if (next.length >= MAX_FILES) return setError(`You can attach up to ${MAX_FILES} files`);
      next.push(f);
    }
    if (next.reduce((n, f) => n + f.size, 0) > MAX_TOTAL) return setError('Attachments can be at most 10 MB in total');
    setError('');
    onChange(next);
  };

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        {files.map((f, i) => (
          <span key={f.name + f.size} className="inline-flex items-center gap-1.5 max-w-full pl-2 pr-1 py-1 rounded-lg text-xs bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200">
            <FileText size={13} className="shrink-0 text-pink-500" />
            <span className="truncate max-w-[12rem]">{f.name}</span>
            <span className="text-gray-500 shrink-0">{fmtSize(f.size)}</span>
            <button type="button" onClick={() => { setError(''); onChange(files.filter((_, j) => j !== i)); }} aria-label={`Remove ${f.name}`} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800">
              <X size={12} />
            </button>
          </span>
        ))}
        {files.length < MAX_FILES && (
          <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer text-gray-600 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 hover:border-pink-500 hover:text-pink-500">
            <Paperclip size={13} /> Attach files
            <input
              type="file"
              multiple
              accept={ATTACH_EXT.join(',')}
              className="hidden"
              onChange={(e) => {
                add(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
        )}
        <span className="text-[11px] text-gray-500">PDF, images, DOCX or TXT · up to 3 files, 5 MB each</span>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
