import { useEffect, useState } from 'react';
import { Eye, Heart, Loader2, Send, X } from 'lucide-react';
import { api, img, timeAgo, type ProfileStory } from '../lib/api';
import { useStore } from '../lib/store';
import StoryViewer, { type StoryGroup } from './StoryViewer';

interface Props {
  stories: ProfileStory[];
  startSlide: number;
  onClose: () => void;
  onSeen: (storyId: string) => void;
}

const LIKED_KEY = 'liked_profile_stories';

function readLiked(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

interface Activity {
  views: { name: string; at: string }[];
  likes: { name: string; at: string }[];
  replies: { _id: string; username: string; text: string; at: string }[];
}

/** Who saw, liked and replied to one story. Admin only. */
function ActivitySheet({ storyId, onClose }: { storyId: string; onClose: () => void }) {
  const [data, setData] = useState<Activity | null>(null);
  const [tab, setTab] = useState<'views' | 'likes' | 'replies'>('views');
  const [error, setError] = useState('');

  useEffect(() => {
    api<Activity>(`/profile-stories/${storyId}/activity`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load activity'));
  }, [storyId]);

  const tabs = [
    { key: 'views' as const, label: 'Viewers', n: data?.views.length },
    { key: 'likes' as const, label: 'Likes', n: data?.likes.length },
    { key: 'replies' as const, label: 'Replies', n: data?.replies.length },
  ];
  const people = tab === 'views' ? data?.views : tab === 'likes' ? data?.likes : null;

  return (
    <div className="bg-gray-950/95 backdrop-blur border-t border-white/10 rounded-t-2xl text-white max-h-[60vh] flex flex-col">
      <div className="flex items-center gap-1 p-2 border-b border-white/10">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${tab === t.key ? 'bg-white/15' : 'text-white/60 hover:text-white'}`}
          >
            {t.label} {t.n ?? ''}
          </button>
        ))}
        <button onClick={onClose} aria-label="Close activity" className="p-2 text-white/70 hover:text-white">
          <X size={18} />
        </button>
      </div>
      <div className="overflow-y-auto p-3 space-y-2 min-h-[120px]">
        {error && <p className="text-sm text-red-400">{error}</p>}
        {!data && !error && <Loader2 className="animate-spin mx-auto mt-6 text-white/60" />}
        {people?.map((p, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${p.name === 'Anonymous' ? 'bg-gray-700 text-gray-300' : 'bg-gradient-to-br from-orange-500 to-pink-500'}`}>
              {p.name === 'Anonymous' ? '?' : p.name[0]?.toUpperCase()}
            </span>
            <span className={`flex-1 ${p.name === 'Anonymous' ? 'text-white/60 italic' : ''}`}>{p.name}</span>
            <span className="text-xs text-white/50">{timeAgo(p.at)}</span>
          </div>
        ))}
        {tab === 'replies' &&
          data?.replies.map((r) => (
            <div key={r._id} className="text-sm">
              <span className="font-semibold">@{r.username}</span> <span className="text-white/90">{r.text}</span>
              <span className="text-xs text-white/50 ml-2">{timeAgo(r.at)}</span>
            </div>
          ))}
        {data && (tab === 'replies' ? !data.replies.length : !people?.length) && (
          <p className="text-sm text-white/50 text-center py-6">Nothing yet</p>
        )}
      </div>
    </div>
  );
}

/** Like and reply bar for visitors; activity button for the admin. */
function StoryFooter({ story, setPaused, onSignIn }: { story: ProfileStory; setPaused: (p: boolean) => void; onSignIn: () => void }) {
  const { user } = useStore();
  const [liked, setLiked] = useState(() => readLiked().has(story._id));
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState('');
  const [showActivity, setShowActivity] = useState(false);

  useEffect(() => {
    setLiked(readLiked().has(story._id));
    setText('');
    setNote('');
    setShowActivity(false);
  }, [story._id]);

  useEffect(() => {
    setPaused(showActivity);
  }, [showActivity, setPaused]);

  if (user?.isAdmin) {
    return showActivity ? (
      <ActivitySheet storyId={story._id} onClose={() => setShowActivity(false)} />
    ) : (
      <div className="p-4 flex justify-center">
        <button onClick={() => setShowActivity(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 text-white text-sm font-semibold hover:bg-black/70">
          <Eye size={16} /> Activity: viewers, likes, replies
        </button>
      </div>
    );
  }

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    try {
      await api(`/profile-stories/${story._id}/like`, 'PATCH', { action: next ? 'like' : 'unlike' });
      const set = readLiked();
      if (next) set.add(story._id);
      else set.delete(story._id);
      localStorage.setItem(LIKED_KEY, JSON.stringify([...set]));
    } catch {
      setLiked(!next);
    }
  };

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      await api(`/profile-stories/${story._id}/replies`, 'POST', { text: t });
      setText('');
      setNote('Reply sent');
      (document.activeElement as HTMLElement | null)?.blur();
      setPaused(false);
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Could not send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-3 flex items-center gap-3 bg-gradient-to-t from-black/70 to-transparent">
      {user ? (
        <div className="flex-1 flex items-center rounded-full border border-white/60 px-4 py-2 focus-within:border-white">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setPaused(true)}
            onBlur={() => !text && setPaused(false)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={note || 'Send a reply...'}
            maxLength={500}
            aria-label="Reply to story"
            className="flex-1 bg-transparent text-sm text-white placeholder-white/70 outline-none"
          />
          {text.trim() && (
            <button onClick={send} disabled={sending} aria-label="Send reply" className="text-white disabled:opacity-50">
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          )}
        </div>
      ) : (
        <button onClick={onSignIn} className="flex-1 text-left rounded-full border border-white/60 px-4 py-2 text-sm text-white/80">
          Sign in to reply
        </button>
      )}
      <button onClick={toggleLike} aria-pressed={liked} aria-label={liked ? 'Unlike story' : 'Like story'} className="text-white">
        <Heart size={26} className={liked ? 'fill-red-500 text-red-500' : ''} />
      </button>
    </div>
  );
}

export default function ProfileStoryViewer({ stories, startSlide, onClose, onSeen }: Props) {
  const { feed, setSignInOpen } = useStore();
  const profile = feed?.profile;
  const group: StoryGroup = {
    id: 'profile',
    title: profile?.username ?? 'Stories',
    avatar: profile?.avatar_url ? <img src={img(profile.avatar_url, 64)} alt="" className="w-full h-full object-cover" /> : null,
    slides: stories.map((s) => ({ id: s._id, image_url: s.image_url, title: '', text: s.text, date: '', link: s.link, created_at: s.created_at })),
  };

  return (
    <StoryViewer
      stories={[group]}
      startIndex={0}
      startSlide={startSlide}
      onClose={onClose}
      subtitle={(g, i) => (g.slides[i]?.created_at ? timeAgo(g.slides[i].created_at!) : '')}
      onSlideShown={(_, i) => {
        const id = stories[i]?._id;
        if (!id) return;
        onSeen(id);
        api(`/profile-stories/${id}/view`, 'POST').catch(() => {});
      }}
      deletion={{
        prompt: () => 'Delete this story? Its views, likes and replies go too.',
        run: (_, i) => api(`/profile-stories/${stories[i]._id}`, 'DELETE'),
      }}
      footer={({ slideIdx, setPaused }) =>
        stories[slideIdx] ? (
          <StoryFooter
            story={stories[slideIdx]}
            setPaused={setPaused}
            onSignIn={() => {
              onClose();
              setSignInOpen(true);
            }}
          />
        ) : null
      }
    />
  );
}
