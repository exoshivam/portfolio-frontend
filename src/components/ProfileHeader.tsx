import { lazy, Suspense, useCallback, useState } from 'react';
import { Camera, Loader2, Plus } from 'lucide-react';
import { ReactTyped } from 'react-typed';
import { api, img, liveStories, type Profile } from '../lib/api';
import { MAX_FILE_MB, uploadToCloudinary, type UploadSignature } from '../lib/upload';
import { useStore } from '../lib/store';
import GravityName from './GravityName';

const ProfileStoryViewer = lazy(() => import('./ProfileStoryViewer'));
const ProfileStoryEditor = lazy(() => import('./ProfileStoryEditor'));
const OngoingProjects = lazy(() => import('./OngoingProjects'));

const SEEN_KEY = 'seen_profile_stories';
function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

/** Admin-only camera badge: uploads a new profile photo to Cloudinary and saves it. */
function ChangePhoto() {
  const { reloadFeed } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const change = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Choose an image file');
    if (file.size > MAX_FILE_MB * 1024 * 1024) return setError(`Image is larger than ${MAX_FILE_MB} MB`);
    setError('');
    setBusy(true);
    try {
      const sig = await api<UploadSignature>('/admin/upload-signature', 'POST');
      const url = await uploadToCloudinary(file, sig);
      await api('/profile/avatar', 'PUT', { avatar_url: url });
      await reloadFeed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change the photo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <label
        title="Change profile photo"
        className={`absolute bottom-2 left-2 w-9 h-9 rounded-full bg-gray-800 hover:bg-gray-700 border-4 border-white dark:border-black flex items-center justify-center text-white focus-within:ring-2 focus-within:ring-orange-500 ${busy ? 'pointer-events-none' : 'cursor-pointer'}`}
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          aria-label="Change profile photo"
          disabled={busy}
          onChange={(e) => {
            void change(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
      {error && <p role="alert" className="absolute -bottom-6 left-0 right-0 text-center text-xs text-red-500">{error}</p>}
    </>
  );
}

/** Profile photo with Instagram-style 24-hour stories: gradient ring while unseen ones exist. */
function StoryAvatar({ profile }: { profile: Profile }) {
  const { feed, user } = useStore();
  const stories = liveStories(feed?.profile_stories);
  const [seen, setSeen] = useState(readSeen);
  const [viewing, setViewing] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);

  const markSeen = useCallback((id: string) => {
    setSeen((cur) => {
      if (cur.has(id)) return cur;
      const next = new Set(cur).add(id);
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify([...next]));
      } catch {
        // storage unavailable: the ring just won't remember
      }
      return next;
    });
  }, []);

  const firstUnseen = stories.findIndex((s) => !seen.has(s._id));
  const ring = !stories.length ? 'bg-transparent' : firstUnseen >= 0 ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-pink-500' : 'bg-gray-400 dark:bg-gray-600';

  return (
    <div className="relative">
      <button
        onClick={() => stories.length && setViewing(firstUnseen >= 0 ? firstUnseen : 0)}
        disabled={!stories.length}
        aria-label={stories.length ? `View ${profile.username}'s story` : profile.full_name}
        className={`block rounded-full p-[4px] ${ring} disabled:cursor-default`}
      >
        <span className="block rounded-full bg-white dark:bg-black p-[4px]">
          <img
            src={img(profile.avatar_url, 320)}
            alt={profile.full_name}
            width={160}
            height={160}
            className="rounded-full w-32 h-32 md:w-40 md:h-40 object-cover"
            style={{ objectPosition: '20% 0%' }}
          />
        </span>
      </button>
      {user?.isAdmin && <ChangePhoto />}
      {user?.isAdmin && (
        <button
          onClick={() => setComposing(true)}
          aria-label="Add to your story"
          title="Add to your story (24 hours)"
          className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-blue-500 hover:bg-blue-600 border-4 border-white dark:border-black flex items-center justify-center text-white"
        >
          <Plus size={18} strokeWidth={3} />
        </button>
      )}
      <Suspense fallback={null}>
        {viewing !== null && stories.length > 0 && (
          <ProfileStoryViewer stories={stories} startSlide={Math.min(viewing, stories.length - 1)} onClose={() => setViewing(null)} onSeen={markSeen} />
        )}
        {composing && <ProfileStoryEditor onClose={() => setComposing(false)} />}
      </Suspense>
    </div>
  );
}

const stringsToRender = [
  "Full Stack Developer",
  "C++",
  "Iot/Arduino",
  "Python"
]

export default function ProfileHeader() {
  const { feed } = useStore();
  const [showActiveProjects, setShowActiveProjects] = useState(false);

  const profile = feed?.profile;
  if (!profile) {
    return (
      <div className="flex flex-col items-center md:flex-row md:items-start gap-8 md:gap-16 w-full px-4 py-8 animate-pulse" aria-busy="true">
        <div className="rounded-full w-32 h-32 md:w-40 md:h-40 bg-gray-200 dark:bg-gray-800" />
        <div className="flex-1 space-y-4 w-full max-w-sm">
          <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-60 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  const activeProjects = feed.active_projects;
  const viewsCount = profile.views_count ?? 0;
  const projectsCount = feed.posts.filter((p) => p.category === 'projects').length;
  const activeProjectsCount = activeProjects.length;


  return (
    <>
      <div className="flex flex-col items-center md:flex-row md:items-start gap-8 md:gap-16 w-full px-4 py-8">
        <div className="flex-shrink-0">
          <StoryAvatar profile={profile} />
        </div>

        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 mb-6">
            <h1 className="text-xl font-light text-black dark:text-white">{profile.username}</h1>
          </div>

          <div className="flex justify-center md:justify-start gap-8 mb-6">
            <div className="text-center">
              <div className="font-semibold text-black dark:text-white">{projectsCount}</div>
              <div className="text-gray-600 dark:text-gray-400 text-sm">projects</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-black dark:text-white">{viewsCount}</div>
              <div className="text-gray-600 dark:text-gray-400 text-sm">views</div>
            </div>
            <button
              onClick={() => setShowActiveProjects(true)}
              className="text-center cursor-pointer hover:opacity-70 transition-opacity"
            >
              <div className="font-semibold text-black dark:text-white">{activeProjectsCount}</div>
              <div className="text-gray-600 dark:text-gray-400 text-sm">Ongoing Projects</div>
            </button>
          </div>

          <div className="space-y-1">
            <GravityName text={profile.full_name} className="text-2xl md:text-3xl font-extrabold text-black dark:text-white pb-1" />
            <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line"><ReactTyped strings={stringsToRender} typeSpeed={60}
        backSpeed={50} loop></ReactTyped></div>
            <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{profile.bio}</div>
            <div className="flex items-center justify-center md:justify-start gap-4 pt-2 flex-wrap">
              {profile.website && (
                <a
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.475-2.236-1.986-2.236-1.081 0-1.722.731-2.004 1.438-.103.249-.129.597-.129.946v5.421h-3.554s.05-8.736 0-9.646h3.554v1.348c.428-.659 1.191-1.599 2.897-1.599 2.117 0 3.704 1.384 3.704 4.361v5.536zM5.337 8.855c-1.144 0-1.915-.758-1.915-1.704 0-.951.768-1.703 1.96-1.703 1.188 0 1.913.75 1.938 1.703 0 .946-.75 1.704-1.983 1.704zm1.581 11.597H3.635V9.859h3.283v10.593zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span>LinkedIn</span>
                </a>
              )}
              <a
                href={profile.github_url || "https://github.com/exoshivam"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Active Projects Modal */}
      <Suspense fallback={null}>
        {showActiveProjects && <OngoingProjects onClose={() => setShowActiveProjects(false)} />}
      </Suspense>
    </>
  );
}
