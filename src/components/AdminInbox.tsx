import { useCallback, useEffect, useState } from 'react';
import { Bell, Bot, CheckCheck, Download, Loader2, Mail, Paperclip, Reply, Terminal as TerminalIcon, Trash2, X } from 'lucide-react';
import { api, downloadFile, timeAgo } from '../lib/api';
import { useStore } from '../lib/store';

interface Message {
  _id: string;
  source: 'contact' | 'terminal' | 'chatbot';
  name: string;
  email: string;
  subject: string;
  body: string;
  read: boolean;
  created_at: string;
  attachments?: { id: string; name: string; type: string; size: number }[];
}

const SOURCES = {
  terminal: { label: 'hire-shivam', icon: <TerminalIcon size={10} />, className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  contact: { label: 'contact', icon: <Mail size={10} />, className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  chatbot: { label: 'chatbot', icon: <Bot size={10} />, className: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400' },
};

/** Admin notification panel: messages from the contact form and the terminal's `sudo hire-shivam`. */
export default function AdminInbox() {
  const { setInboxOpen, refreshUnread } = useStore();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const close = () => setInboxOpen(false);

  const load = useCallback(() => {
    api<Message[]>('/admin/messages')
      .then(setMessages)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load messages'));
  }, []);

  useEffect(() => {
    load();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setInboxOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [load, setInboxOpen]);

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      refreshUnread();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      load();
    }
  };

  const toggle = (m: Message) => {
    setOpenId((id) => (id === m._id ? null : m._id));
    if (!m.read) {
      setMessages((ms) => ms?.map((x) => (x._id === m._id ? { ...x, read: true } : x)) ?? null);
      act(() => api(`/admin/messages/${m._id}`, 'PATCH', { read: true }));
    }
  };

  const setRead = (m: Message, read: boolean) => {
    setMessages((ms) => ms?.map((x) => (x._id === m._id ? { ...x, read } : x)) ?? null);
    act(() => api(`/admin/messages/${m._id}`, 'PATCH', { read }));
  };

  const remove = (m: Message) => {
    setMessages((ms) => ms?.filter((x) => x._id !== m._id) ?? null);
    act(() => api(`/admin/messages/${m._id}`, 'DELETE'));
  };

  const readAll = () => {
    setMessages((ms) => ms?.map((x) => ({ ...x, read: true })) ?? null);
    act(() => api('/admin/messages/read-all', 'POST'));
  };

  const unread = messages?.filter((m) => !m.read).length ?? 0;

  return (
    <div className="fixed inset-0 z-[75] bg-black/50" onClick={close}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Inbox"
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 flex flex-col text-black dark:text-white shadow-2xl"
      >
        <header className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <Bell size={20} className="text-orange-500" />
          <h2 className="text-lg font-bold flex-1">
            Inbox {unread > 0 && <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-orange-500 text-white align-middle">{unread} new</span>}
          </h2>
          {unread > 0 && (
            <button onClick={readAll} title="Mark all as read" className="p-1.5 rounded-lg text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
              <CheckCheck size={18} />
            </button>
          )}
          <button onClick={close} aria-label="Close inbox" className="p-1.5 rounded-lg text-gray-500 hover:text-black dark:hover:text-white">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {error && <p className="m-4 text-sm text-red-500">{error}</p>}
          {!messages && !error && <Loader2 className="animate-spin mx-auto mt-10 text-gray-400" />}
          {messages?.length === 0 && (
            <div className="text-center text-gray-500 py-16 px-6">
              <Mail size={40} className="mx-auto mb-3 opacity-50" />
              <p>No messages yet.</p>
              <p className="text-xs mt-1">Messages from the contact form, the terminal's "sudo hire-shivam" and the chatbot show up here.</p>
            </div>
          )}
          {messages?.map((m) => {
            const open = openId === m._id;
            return (
              <article key={m._id} className={`border-b border-gray-100 dark:border-gray-900 ${m.read ? '' : 'bg-orange-500/5'}`}>
                <button onClick={() => toggle(m)} aria-expanded={open} className="w-full text-left px-5 py-3 flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-900/60">
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${m.read ? 'bg-transparent' : 'bg-orange-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`truncate ${m.read ? '' : 'font-bold'}`}>{m.name}</span>
                      <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold ${SOURCES[m.source].className}`}>
                        {SOURCES[m.source].icon} {SOURCES[m.source].label}
                      </span>
                      <span className="ml-auto shrink-0 text-xs text-gray-500">{timeAgo(m.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{m.subject}</p>
                    {!open && (
                      <p className="text-xs text-gray-500 truncate">
                        {!!m.attachments?.length && <Paperclip size={11} className="inline mr-1" />}
                        {m.body}
                      </p>
                    )}
                  </div>
                </button>
                {open && (
                  <div className="px-10 pb-4 space-y-3">
                    <p className="text-sm whitespace-pre-line text-gray-800 dark:text-gray-200">{m.body}</p>
                    {!!m.attachments?.length && (
                      <div className="flex flex-wrap gap-2">
                        {m.attachments.map((a) => (
                          <button
                            key={a.id}
                            onClick={() => downloadFile(`/admin/attachments/${a.id}`, a.name).catch((e) => setError(e.message))}
                            title={`Download ${a.name}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                          >
                            <Download size={13} /> <span className="max-w-[12rem] truncate">{a.name}</span>
                            <span className="text-gray-500">{a.size < 1048576 ? `${Math.max(1, Math.round(a.size / 1024))} KB` : `${(a.size / 1048576).toFixed(1)} MB`}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      {m.email} · {new Date(m.created_at).toLocaleString()}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + m.subject)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-orange-500 to-pink-500 text-white"
                      >
                        <Reply size={14} /> Reply
                      </a>
                      <button onClick={() => setRead(m, false)} className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800">
                        Mark unread
                      </button>
                      <button onClick={() => remove(m)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-500 bg-gray-100 dark:bg-gray-800">
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
