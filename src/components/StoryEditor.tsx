import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import { api, img, type StorySlide } from '../lib/api';
import { useStore } from '../lib/store';
import { MAX_FILE_MB, uploadToCloudinary, type UploadSignature } from '../lib/upload';

interface Props {
  skillId: string;
  skillName: string;
  slides: StorySlide[];
  onClose: () => void;
}

// An image is either already hosted, or a picked file (url = local preview) uploaded on save.
interface Pic {
  url: string;
  file?: File;
}

type SlideDraft = Omit<StorySlide, 'image_url'> & { pic: Pic | null };

const MAX_SLIDES = 20;
const emptySlide = (): SlideDraft => ({ pic: null, title: '', text: '', date: '', link: '' });
const withScheme = (u: string) => (u && !/^https?:\/\//i.test(u) ? `https://${u}` : u);

/** Admin editor for one skill's stories. */
export default function StoryEditor({ skillId, skillName, slides: initial, onClose }: Props) {
  const { reloadFeed } = useStore();
  const [slides, setSlides] = useState<SlideDraft[]>(
    initial.length ? initial.map(({ image_url, ...rest }) => ({ ...rest, pic: image_url ? { url: image_url } : null })) : [emptySlide()],
  );
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const saving = status !== '';

  // Free local previews when the editor closes.
  const live = useRef(slides);
  live.current = slides;
  useEffect(() => () => live.current.forEach((x) => x.pic?.file && URL.revokeObjectURL(x.pic.url)), []);

  const pick = (file: File | undefined, apply: (p: Pic) => void) => {
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) return setError(`${file.name} is larger than ${MAX_FILE_MB} MB`);
    setError('');
    apply({ url: URL.createObjectURL(file), file });
  };

  const setSlide = (i: number, change: Partial<SlideDraft>) => setSlides((ss) => ss.map((s, j) => (j === i ? { ...s, ...change } : s)));
  const move = (i: number, by: number) =>
    setSlides((ss) => {
      const j = i + by;
      if (j < 0 || j >= ss.length) return ss;
      const next = [...ss];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError('');
    try {
      // Upload picked files now, in order. Each upload replaces the file in state with its
      // hosted URL, so a retry after a failure does not upload it again.
      const pending = slides.filter((s) => s.pic?.file).length;
      let done = 0;
      let sig: UploadSignature | null = null;
      const host = async (p: Pic | null): Promise<string> => {
        if (!p) return '';
        if (!p.file) return withScheme(p.url.trim());
        setStatus(`Uploading image ${++done} of ${pending}...`);
        sig ??= await api<UploadSignature>('/admin/upload-signature', 'POST');
        const url = await uploadToCloudinary(p.file, sig);
        URL.revokeObjectURL(p.url);
        return url;
      };

      const out: StorySlide[] = [];
      for (let i = 0; i < slides.length; i++) {
        const s = slides[i];
        const imageUrl = await host(s.pic);
        if (s.pic?.file) setSlide(i, { pic: { url: imageUrl } });
        out.push({ image_url: imageUrl, title: s.title, text: s.text, date: s.date, link: withScheme(s.link.trim()) });
      }

      setStatus('Saving...');
      await api(`/skills/${skillId}/stories`, 'PUT', { slides: out });
      await reloadFeed();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
      setStatus('');
    }
  };

  const input =
    'w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white placeholder-gray-500 focus:outline-none focus:border-orange-500';
  const label = 'block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1.5';
  const preview = (p: Pic | null, w: number) => (p ? (p.file ? p.url : img(p.url, w)) : '');

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
        className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col text-black dark:text-white"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold">{skillName} stories</h2>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="text-gray-500 hover:text-black dark:hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="space-y-3">
            <span className={label}>Stories ({slides.length}/{MAX_SLIDES}), shown in this order</span>
            {slides.map((s, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="w-24 shrink-0 space-y-1.5">
                  <label className="block aspect-[9/16] rounded-lg overflow-hidden cursor-pointer bg-gradient-to-br from-yellow-500 via-orange-600 to-pink-700 relative group">
                    {s.pic ? (
                      <img src={preview(s.pic, 200)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="absolute inset-0 flex flex-col items-center justify-center text-white text-[11px] text-center p-1">
                        <ImagePlus size={18} />
                        Add image
                      </span>
                    )}
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(ev) => { pick(ev.target.files?.[0], (p) => setSlide(i, { pic: p })); ev.target.value = ''; }} />
                    {s.pic?.file && <span className="absolute top-1 left-1 text-[9px] px-1 rounded bg-black/60 text-white">Not uploaded</span>}
                  </label>
                  {s.pic && (
                    <button type="button" onClick={() => setSlide(i, { pic: null })} className="w-full text-[11px] text-gray-500 hover:text-red-500">Remove image</button>
                  )}
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <input className={input} placeholder="Title (optional)" value={s.title} onChange={(ev) => setSlide(i, { title: ev.target.value })} maxLength={120} />
                  <textarea className={`${input} min-h-[64px]`} placeholder="What happened? (optional if there's an image)" value={s.text} onChange={(ev) => setSlide(i, { text: ev.target.value })} maxLength={1000} />
                  {!s.pic && (
                    <input className={input} placeholder="...or paste an image URL" onBlur={(ev) => { const u = ev.target.value.trim(); if (u) setSlide(i, { pic: { url: u } }); }} />
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <input type="month" className={input} aria-label="Date (optional)" value={s.date} onChange={(ev) => setSlide(i, { date: ev.target.value })} />
                    <input className={input} inputMode="url" placeholder="Link (optional)" value={s.link} onChange={(ev) => setSlide(i, { link: ev.target.value })} />
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-gray-500">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="p-1 hover:text-black dark:hover:text-white disabled:opacity-30"><ChevronUp size={16} /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === slides.length - 1} aria-label="Move down" className="p-1 hover:text-black dark:hover:text-white disabled:opacity-30"><ChevronDown size={16} /></button>
                  <button type="button" onClick={() => setSlides((ss) => ss.filter((_, j) => j !== i))} disabled={slides.length === 1} aria-label="Remove story" className="p-1 hover:text-red-500 disabled:opacity-30"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {slides.length < MAX_SLIDES && (
              <button
                type="button"
                onClick={() => setSlides((ss) => [...ss, emptySlide()])}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:border-orange-500 hover:text-orange-500"
              >
                <Plus size={16} /> Add story
              </button>
            )}
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-gray-200 dark:bg-gray-800 font-semibold disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold disabled:opacity-70">
            {saving && <Loader2 size={18} className="animate-spin" />}
            {status || 'Save stories'}
          </button>
        </div>
      </form>
    </div>
  );
}
