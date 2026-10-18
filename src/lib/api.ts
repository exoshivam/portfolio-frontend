export interface Contact {
  email: string;
  phone: string;
  location: string;
  instagram: string;
  github: string;
  linkedin: string;
  twitter: string;
}

export interface Profile {
  username: string;
  full_name: string;
  bio: string;
  website: string;
  github_url?: string;
  avatar_url: string;
  views_count: number;
  contact?: Contact; // admin-managed; always sent by the backend
}

export interface Skill {
  _id: string;
  name: string;
  icon: string; // name from SKILL_ICONS, or "" for a plain colour circle
  theme?: string; // colour preset from SKILL_THEMES, "" = default
  image_url?: string; // cover image; takes precedence over theme and icon
  slides?: StorySlide[]; // the skill's stories, shown like Instagram highlights
}

export type SkillInput = Required<Pick<Skill, 'name' | 'icon' | 'theme' | 'image_url'>>;

export type Category = 'projects' | 'experiments' | 'hackathons' | 'side_ideas' | 'iot_works';

export const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'projects', label: 'Projects' },
  { key: 'experiments', label: 'Experiments' },
  { key: 'hackathons', label: 'Hackathons' },
  { key: 'side_ideas', label: 'Side Ideas' },
  { key: 'iot_works', label: 'IoT Works' },
];

export const categoryLabel = (c: Category) => CATEGORIES.find((x) => x.key === c)?.label ?? c;

export interface Post {
  _id: string;
  category: Category;
  title: string;
  description: string;
  project_url: string;
  technologies: string[];
  image_urls: string[];
  likes: number;
  pinned: boolean;
  archived?: boolean;
  created_at: string;
  updated_at?: string;
}

export type PostInput = Pick<Post, 'category' | 'title' | 'description' | 'project_url' | 'technologies' | 'image_urls'>;

export const ONGOING_STATUSES = ['Planning', 'In Progress', 'Testing', 'Almost done', 'Paused'] as const;

export interface Milestone {
  title: string;
  done: boolean;
}

export interface ActiveProject {
  _id: string;
  title: string;
  description: string;
  image_urls: string[]; // first one is shown
  project_url: string;
  technologies: string[];
  status: string;
  progress: number; // 0-100; worked out from milestones when there are any
  eta: string; // optional "YYYY-MM"
  milestones: Milestone[];
  updated_at?: string;
}

export type ActiveProjectInput = Omit<ActiveProject, '_id' | 'updated_at'>;

export const EMPLOYMENT_TYPES = ['Internship', 'Full-time', 'Part-time', 'Freelance', 'Contract'] as const;

export interface ExperienceProject {
  title: string;
  description: string;
  link: string;
  technologies: string[];
}

export interface Experience {
  _id: string;
  company: string;
  role: string;
  employment_type: (typeof EMPLOYMENT_TYPES)[number];
  location: string;
  company_url: string;
  logo_url: string;
  start_date: string; // "YYYY-MM"
  end_date: string; // "YYYY-MM", or "" while still working there
  summary: string;
  highlights: string[];
  technologies: string[];
  projects: ExperienceProject[];
}

export type ExperienceInput = Omit<Experience, '_id'>;

export interface StorySlide {
  image_url: string;
  title: string;
  text: string;
  date: string; // optional "YYYY-MM"
  link: string;
}

/** A 24-hour story on the profile photo. */
export interface ProfileStory {
  _id: string;
  image_url: string;
  text: string;
  link: string;
  created_at: string;
  expires_at: string;
}

/** Stories still within their 24 hours (the cached feed can briefly hold expired ones). */
export const liveStories = (list: ProfileStory[] | undefined, now = Date.now()) =>
  (list ?? []).filter((s) => new Date(s.expires_at).getTime() > now);

/** "now", "5m", "3h", "2d" */
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export interface Feed {
  profile: Profile | null;
  skills: Skill[];
  active_projects: ActiveProject[];
  posts: Post[];
  experiences?: Experience[]; // missing in feeds cached before this feature
  profile_stories?: ProfileStory[]; // same
}

// ---- month helpers for experience dates ("YYYY-MM") ----

const monthIndex = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
};

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** "Jun 2025" */
export function formatMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

/** Months covered, counting both the start and end month (LinkedIn-style). */
export function monthsBetween(start: string, end: string): number {
  return Math.max(1, monthIndex(end || currentMonth()) - monthIndex(start) + 1);
}

/** "1 yr 3 mos", "8 mos", "1 mo" */
export function formatDuration(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [];
  if (y) parts.push(`${y} yr${y > 1 ? 's' : ''}`);
  if (m || !y) parts.push(`${m} mo${m === 1 ? '' : 's'}`);
  return parts.join(' ');
}

/** Total time worked, counting overlapping roles once. */
export function totalMonths(list: Pick<Experience, 'start_date' | 'end_date'>[]): number {
  const months = new Set<number>();
  for (const e of list) {
    const from = monthIndex(e.start_date);
    const to = monthIndex(e.end_date || currentMonth());
    for (let i = from; i <= to; i++) months.add(i);
  }
  return months.size;
}

export interface User {
  id: string;
  username: string;
  email: string;
  name?: string;
  picture?: string;
  isAdmin: boolean;
}

export interface Comment {
  _id: string;
  userId: string;
  username: string;
  text: string;
  created_at: string;
  edited_at?: string;
  likes: number;
  liked: boolean;
}

const BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

/** Calls the backend with JSON and the login token; throws ApiError with the server's message. */
export async function api<T = void>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.message || data.error || `Request failed (${res.status})`, res.status);
  return data as T;
}

/** Like api(), but sends a multipart form (used for file uploads). */
export async function apiForm<T = void>(path: string, form: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method: 'POST', headers, body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.message || data.error || `Request failed (${res.status})`, res.status);
  return data as T;
}

/** Downloads a file that needs the login token (so a plain link would not work). */
export async function downloadFile(path: string, fileName: string): Promise<void> {
  const token = getToken();
  const res = await fetch(BASE + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new ApiError(`Download failed (${res.status})`, res.status);
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Serves Cloudinary images resized and in the best format the browser supports
 * (WebP/AVIF), e.g. a 2 MB PNG becomes ~40 KB. Other URLs are returned unchanged.
 */
export function img(url: string | undefined, width: number): string {
  if (!url) return '';
  const marker = '/image/upload/';
  const i = url.indexOf(marker);
  if (!url.includes('res.cloudinary.com') || i < 0) return url;
  const at = i + marker.length;
  return `${url.slice(0, at)}f_auto,q_auto,c_limit,w_${width}/${url.slice(at)}`;
}

export const postLink = (id: string) => `${window.location.origin}/?post=${id}`;
