import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, X } from 'lucide-react';
import { api, CATEGORIES, img, type Category, type Post, type PostInput } from '../lib/api';
import { useStore } from '../lib/store';
import { MAX_FILE_MB, uploadToCloudinary, type UploadSignature } from '../lib/upload';

interface PostEditorProps {
  post?: Post; // editing when set, creating otherwise
  defaultCategory?: Category;
  initial?: Partial<PostInput>; // prefill a new post (e.g. from a finished ongoing project)
  onSaved?: () => Promise<void> | void;
  onClose: () => void;
}

const MAX_IMAGES = 10;

// An image in the form: already hosted (url only), or picked from disk and not uploaded yet
// (url is a local preview). Files are uploaded to Cloudinary only when the post is saved.
interface ImageItem {
  url: string;
  file?: File;
}

export default function PostEditor({ post, defaultCategory = 'projects', initial, onSaved, onClose }: PostEditorProps) {
  const { reloadFeed } = useStore();
  const [form, setForm] = useState<Omit<PostInput, 'image_urls'>>({
    category: post?.category ?? initial?.category ?? defaultCategory,
    title: post?.title ?? initial?.title ?? '',
    description: post?.description ?? initial?.description ?? '',
    project_url: post?.project_url ?? initial?.project_url ?? '',
    technologies: post?.technologies ?? initial?.technologies ?? [],
  });
  const [images, setImages] = useState<ImageItem[]>(() => (post?.image_urls ?? initial?.image_urls ?? []).map((url) => ({ url })));
  const [techText, setTechText] = useState((post?.technologies ?? initial?.technologies ?? []).join(', '));
  const [urlText, setUrlText] = useState('');
  const [status, setStatus] = useState(''); // progress text while saving
  const [error, setError] = useState('');
  const saving = status !== '';

  // Free the local previews when the editor closes.
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(() => () => imagesRef.current.forEach((i) => i.file && URL.revokeObjectURL(i.url)), []);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const addImages = (items: ImageItem[]) => setImages((cur) => [...cur, ...items].slice(0, MAX_IMAGES));

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, MAX_IMAGES - images.length);
    const tooBig = list.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig) {
      setError(`${tooBig.name} is larger than ${MAX_FILE_MB} MB`);
      return;
    }
    setError('');
    addImages(list.map((file) => ({ url: URL.createObjectURL(file), file })));
  };

  const addUrl = () => {
    const u = urlText.trim();
    if (!/^https?:\/\//.test(u)) {
      setError('Image URL must start with http:// or https://');
      return;
    }
    setError('');
    addImages([{ url: u }]);
    setUrlText('');
  };

  const removeImage = (i: number) =>
    setImages((cur) => {
      const gone = cur[i];
      if (gone.file) URL.revokeObjectURL(gone.url);
      return cur.filter((_, j) => j !== i);
    });

  const move = (i: number, by: number) =>
    setImages((cur) => {
      const j = i + by;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!images.length) {
      setError('Add at least one image');
      return;
    }
    setError('');
    let link = form.project_url.trim();
    if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;

    try {
      // Upload the picked files now, in order. Each uploaded file is swapped for its hosted URL
      // right away, so retrying after a failure does not upload it twice.
      const urls: string[] = [];
      const pending = images.filter((i) => i.file).length;
      let done = 0;
      let sig: UploadSignature | null = null;
      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        if (!item.file) {
          urls.push(item.url);
          continue;
        }
        setStatus(`Uploading image ${++done} of ${pending}...`);
        sig ??= await api<UploadSignature>('/admin/upload-signature', 'POST');
        const hosted = await uploadToCloudinary(item.file, sig);
        URL.revokeObjectURL(item.url);
        setImages((cur) => cur.map((x) => (x === item ? { url: hosted } : x)));
        urls.push(hosted);
      }

      setStatus('Saving...');
      const body: PostInput = {
        ...form,
        project_url: link,
        technologies: techText.split(',').map((t) => t.trim()).filter(Boolean),
        image_urls: urls,
      };
      if (post) await api(`/projects/${post._id}`, 'PUT', body);
      else await api('/projects', 'POST', body);
      await onSaved?.();
      await reloadFeed();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the post');
      setStatus('');
    }
  };

  const input =
    'w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white placeholder-gray-500 focus:outline-none focus:border-orange-500';
  const label = 'block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1.5';

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
      onClick={(e) => {
        e.stopPropagation(); // don't also close a post view this editor was opened from
        onClose();
      }}
    >
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col text-black dark:text-white"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold">{post ? 'Edit post' : 'New post'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-black dark:hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className={label} htmlFor="pe-category">Section</label>
            <select id="pe-category" className={input} value={form.category} onChange={(e) => set('category', e.target.value as Category)}>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                  {c.key === 'projects' ? ' (Home grid + Explore)' : ' (Explore)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={label} htmlFor="pe-title">Title</label>
            <input id="pe-title" className={input} value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={200} required />
          </div>

          <div>
            <label className={label} htmlFor="pe-desc">Description</label>
            <textarea id="pe-desc" className={`${input} min-h-[96px]`} value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={5000} />
          </div>

          <div>
            <label className={label} htmlFor="pe-url">Project link</label>
            <input id="pe-url" inputMode="url" className={input} placeholder="https://github.com/..." value={form.project_url} onChange={(e) => set('project_url', e.target.value)} />
          </div>

          <div>
            <label className={label} htmlFor="pe-tech">Technologies (comma separated)</label>
            <input id="pe-tech" className={input} placeholder="React, Go, MongoDB" value={techText} onChange={(e) => setTechText(e.target.value)} />
          </div>

          <div>
            <span className={label}>Images (first one is the cover)</span>
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {images.map((item, i) => (
                  <div key={item.url} className="relative aspect-square rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 group">
                    <img src={item.file ? item.url : img(item.url, 300)} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 bg-black/50 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                      <button type="button" aria-label="Move left" onClick={() => move(i, -1)} className="text-white"><ChevronLeft size={16} /></button>
                      <button type="button" aria-label="Remove image" onClick={() => removeImage(i)} className="text-white"><X size={16} /></button>
                      <button type="button" aria-label="Move right" onClick={() => move(i, 1)} className="text-white"><ChevronRight size={16} /></button>
                    </div>
                    {i === 0 && <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-orange-500 text-white">Cover</span>}
                    {item.file && <span className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">Not uploaded</span>}
                  </div>
                ))}
              </div>
            )}
            {images.length < MAX_IMAGES && !saving && (
              <div className="space-y-2">
                <label className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-orange-500 text-sm text-gray-600 dark:text-gray-400">
                  <ImagePlus size={18} />
                  Add images
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="hidden" onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
                </label>
                <div className="flex gap-2">
                  <input className={input} placeholder="...or paste an image URL" value={urlText} onChange={(e) => setUrlText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }} />
                  <button type="button" onClick={addUrl} className="px-3 text-sm rounded-lg bg-gray-200 dark:bg-gray-800">Add</button>
                </div>
              </div>
            )}
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-gray-200 dark:bg-gray-800 font-semibold disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold disabled:opacity-70">
            {saving && <Loader2 size={18} className="animate-spin" />}
            {status || (post ? 'Save changes' : 'Post')}
          </button>
        </div>
      </form>
    </div>
  );
}
