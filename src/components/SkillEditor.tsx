import { useEffect, useState } from 'react';
import { BookOpen, ImagePlus, Loader2, Search, Trash2, X } from 'lucide-react';
import { api, type Skill, type SkillInput } from '../lib/api';
import { SKILL_THEMES, SkillAvatar } from '../lib/skillIcons';
import { iconLabel, PICKER_ICONS, SKILL_ICONS } from '../lib/skillIconSet';
import { useStore } from '../lib/store';
import { MAX_FILE_MB, uploadToCloudinary, type UploadSignature } from '../lib/upload';

interface Props {
  skill?: Skill; // editing when set, creating otherwise
  onClose: () => void;
  onEditStories?: (skill: Skill) => void;
}

type Mode = 'color' | 'icon' | 'image';

const withScheme = (u: string) => (u && !/^https?:\/\//i.test(u) ? `https://${u}` : u);

export default function SkillEditor({ skill, onClose, onEditStories }: Props) {
  const { reloadFeed } = useStore();
  const [name, setName] = useState(skill?.name ?? '');
  const [theme, setTheme] = useState(skill?.theme ?? '');
  const [icon, setIcon] = useState(skill?.icon ?? '');
  const [imageUrl, setImageUrl] = useState(skill?.image_url ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [mode, setMode] = useState<Mode>(skill?.image_url ? 'image' : skill?.icon && SKILL_ICONS[skill.icon] ? 'icon' : skill ? 'color' : 'icon');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const saving = status !== '';

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_FILE_MB * 1024 * 1024) return setError(`${f.name} is larger than ${MAX_FILE_MB} MB`);
    setError('');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  // What the circle will show with the current choices.
  const cover = {
    name,
    icon: mode === 'icon' ? icon : '',
    theme,
    image_url: mode === 'image' && !file ? withScheme(imageUrl.trim()) : '',
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError('');
    if (mode === 'image' && !file && !imageUrl.trim()) return setError('Upload an image or paste its URL, or pick another cover style');
    if (mode === 'icon' && !icon) return setError('Pick an icon, or choose "Colour only"');
    try {
      let image = cover.image_url;
      if (mode === 'image' && file) {
        setStatus('Uploading image...');
        const sig = await api<UploadSignature>('/admin/upload-signature', 'POST');
        image = await uploadToCloudinary(file, sig);
        setImageUrl(image);
        setFile(null); // uploaded: a retry must not upload it again
      }
      setStatus('Saving...');
      const body: SkillInput = { name, icon: cover.icon, theme, image_url: image };
      if (skill) await api(`/skills/${skill._id}`, 'PUT', body);
      else await api('/skills', 'POST', body);
      await reloadFeed();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
      setStatus('');
    }
  };

  const remove = async () => {
    setStatus('Deleting...');
    try {
      await api(`/skills/${skill!._id}`, 'DELETE');
      await reloadFeed();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete');
      setStatus('');
    }
  };

  const input =
    'w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white placeholder-gray-500 focus:outline-none focus:border-orange-500';
  const label = 'block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1.5';
  const tab = (m: Mode, text: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      aria-pressed={mode === m}
      className={`flex-1 py-2 text-sm font-semibold rounded-lg ${mode === m ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
    >
      {text}
    </button>
  );
  const q = query.trim().toLowerCase();
  const icons = PICKER_ICONS.filter((n) => !q || iconLabel(n).toLowerCase().includes(q));
  const storyCount = skill?.slides?.length ?? 0;

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[90] flex items-center justify-center p-4"
      onClick={(ev) => {
        ev.stopPropagation();
        if (!saving) onClose();
      }}
    >
      <form
        onSubmit={save}
        onClick={(ev) => ev.stopPropagation()}
        className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col text-black dark:text-white"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold">{skill ? 'Edit skill' : 'New skill'}</h2>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="text-gray-500 hover:text-black dark:hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-[88px] h-[88px] shrink-0 rounded-full p-[6px]">
              <SkillAvatar skill={cover} size={76} preview={mode === 'image' ? preview : undefined} />
            </div>
            <div className="flex-1">
              <label className={label} htmlFor="sk-name">Skill name</label>
              <input id="sk-name" className={input} placeholder="Go" value={name} onChange={(ev) => setName(ev.target.value)} maxLength={40} required />
            </div>
          </div>

          <div>
            <span className={label}>Cover</span>
            <div className="flex gap-2">
              {tab('color', 'Colour only')}
              {tab('icon', 'Icon')}
              {tab('image', 'Image')}
            </div>
          </div>

          {mode !== 'image' && (
            <div>
              <span className={label}>Colour theme</span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SKILL_THEMES).map(([key, t]) => (
                  <button
                    key={key || 'default'}
                    type="button"
                    onClick={() => setTheme(key)}
                    title={t.label}
                    aria-label={t.label}
                    aria-pressed={theme === key}
                    className={`w-10 h-10 rounded-full ${t.className} ${theme === key ? 'ring-2 ring-offset-2 ring-orange-500 ring-offset-white dark:ring-offset-gray-950' : ''}`}
                  />
                ))}
              </div>
            </div>
          )}

          {mode === 'icon' && (
            <div>
              <span className={label}>Icon</span>
              <div className="relative mb-2">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input className={`${input} pl-9`} placeholder="Search icons (react, docker, python...)" value={query} onChange={(ev) => setQuery(ev.target.value)} />
              </div>
              <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5 max-h-48 overflow-y-auto p-1">
                {icons.map((n) => {
                  const Icon = SKILL_ICONS[n];
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setIcon(n)}
                      title={iconLabel(n)}
                      aria-label={iconLabel(n)}
                      aria-pressed={icon === n}
                      className={`aspect-square rounded-lg flex items-center justify-center ${icon === n ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                      <Icon size={20} />
                    </button>
                  );
                })}
                {!icons.length && <p className="col-span-full text-xs text-gray-500 py-2">No icon matches “{query}”. Try a general one like Code or Terminal.</p>}
              </div>
            </div>
          )}

          {mode === 'image' && (
            <div className="space-y-2">
              <label className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-orange-500 text-sm text-gray-600 dark:text-gray-400">
                <ImagePlus size={18} /> {file || imageUrl ? 'Change image' : 'Upload image'}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden" onChange={(ev) => { pick(ev.target.files?.[0]); ev.target.value = ''; }} />
              </label>
              {!file && <input className={input} placeholder="...or paste an image URL" value={imageUrl} onChange={(ev) => setImageUrl(ev.target.value)} />}
              {file && <p className="text-xs text-gray-500">{file.name} will upload when you save.</p>}
            </div>
          )}

          {skill && onEditStories && (
            <button
              type="button"
              onClick={() => onEditStories(skill)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-semibold hover:border-orange-500 hover:text-orange-500"
            >
              <BookOpen size={16} /> {storyCount ? `Edit ${storyCount} ${storyCount === 1 ? 'story' : 'stories'}` : 'Add stories'}
            </button>
          )}

          {skill && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
              {confirming ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="flex-1">Delete {skill.name}{storyCount ? ` and its ${storyCount} ${storyCount === 1 ? 'story' : 'stories'}` : ''}?</span>
                  <button type="button" onClick={() => setConfirming(false)} className="px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-800">Cancel</button>
                  <button type="button" onClick={remove} disabled={saving} className="px-3 py-1.5 rounded bg-red-600 text-white disabled:opacity-50">Delete</button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirming(true)} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600">
                  <Trash2 size={15} /> Delete skill
                </button>
              )}
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-gray-200 dark:bg-gray-800 font-semibold disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold disabled:opacity-70">
            {saving && <Loader2 size={18} className="animate-spin" />}
            {status || (skill ? 'Save changes' : 'Add skill')}
          </button>
        </div>
      </form>
    </div>
  );
}
