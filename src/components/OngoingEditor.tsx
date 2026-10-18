import { useEffect, useState } from 'react';
import { ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import { api, img, ONGOING_STATUSES, type ActiveProject, type ActiveProjectInput, type Milestone } from '../lib/api';
import { useStore } from '../lib/store';
import { MAX_FILE_MB, uploadToCloudinary, type UploadSignature } from '../lib/upload';

const withScheme = (u: string) => (u && !/^https?:\/\//i.test(u) ? `https://${u}` : u);

/** Admin form to add or edit an ongoing project. */
export default function OngoingEditor({ project: p, onClose }: { project?: ActiveProject; onClose: () => void }) {
  const { reloadFeed } = useStore();
  const [f, setF] = useState({
    title: p?.title ?? '',
    description: p?.description ?? '',
    project_url: p?.project_url ?? '',
    technologies: (p?.technologies ?? []).join(', '),
    status: p?.status ?? 'In Progress',
    progress: p?.progress ?? 0,
    eta: p?.eta ?? '',
  });
  const [milestones, setMilestones] = useState<Milestone[]>(p?.milestones ?? []);
  const [imageUrl, setImageUrl] = useState(p?.image_urls[0] ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const saving = status !== '';

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const named = milestones.filter((m) => m.title.trim());
  const fromMilestones = named.length > 0;
  const autoProgress = fromMilestones ? Math.floor((named.filter((m) => m.done).length * 100) / named.length) : f.progress;

  const pick = (fl: File | undefined) => {
    if (!fl) return;
    if (fl.size > MAX_FILE_MB * 1024 * 1024) return setError(`${fl.name} is larger than ${MAX_FILE_MB} MB`);
    setError('');
    setFile(fl);
    setPreview(URL.createObjectURL(fl));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      let image = withScheme(imageUrl.trim());
      if (file) {
        setStatus('Uploading image...');
        const sig = await api<UploadSignature>('/admin/upload-signature', 'POST');
        image = await uploadToCloudinary(file, sig);
        setImageUrl(image);
        setFile(null); // uploaded: a retry must not upload it again
      }
      setStatus('Saving...');
      const body: ActiveProjectInput = {
        title: f.title,
        description: f.description,
        project_url: withScheme(f.project_url.trim()),
        technologies: f.technologies.split(',').map((t) => t.trim()).filter(Boolean),
        status: f.status,
        progress: f.progress,
        eta: f.eta,
        milestones: named,
        image_urls: image ? [image] : [],
      };
      if (p) await api(`/active-projects/${p._id}`, 'PUT', body);
      else await api('/active-projects', 'POST', body);
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
  const shownImage = preview || (imageUrl ? img(withScheme(imageUrl), 160) : '');

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); if (!saving) onClose(); }}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col text-black dark:text-white">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold">{p ? 'Edit ongoing project' : 'New ongoing project'}</h2>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="text-gray-500 hover:text-black dark:hover:text-white"><X size={22} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-orange-500 to-pink-500">
              {shownImage && <img src={shownImage} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <label className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-dashed border-gray-300 dark:border-gray-700 cursor-pointer hover:border-orange-500">
                  <ImagePlus size={15} /> {shownImage ? 'Change image' : 'Image'}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
                </label>
                {shownImage && <button type="button" onClick={() => { setFile(null); setPreview(''); setImageUrl(''); }} className="px-3 text-sm rounded-lg bg-gray-200 dark:bg-gray-800">Remove</button>}
              </div>
              {!file && <input className={input} placeholder="...or paste an image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />}
            </div>
          </div>

          <div>
            <label className={label} htmlFor="og-title">Title</label>
            <input id="og-title" className={input} value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={120} required />
          </div>
          <div>
            <label className={label} htmlFor="og-desc">Description</label>
            <textarea id="og-desc" className={`${input} min-h-[72px]`} value={f.description} onChange={(e) => set('description', e.target.value)} maxLength={2000} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={label} htmlFor="og-status">Status</label>
              <select id="og-status" className={input} value={f.status} onChange={(e) => set('status', e.target.value)}>
                {ONGOING_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="og-eta">Expected finish (optional)</label>
              <input id="og-eta" type="month" className={input} value={f.eta} onChange={(e) => set('eta', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="og-progress">Progress: {autoProgress}%{fromMilestones && ' (from milestones)'}</label>
            <input id="og-progress" type="range" min={0} max={100} step={5} value={autoProgress} disabled={fromMilestones} onChange={(e) => set('progress', Number(e.target.value))} className="w-full accent-orange-500 disabled:opacity-50" />
          </div>
          <div>
            <span className={label}>Milestones (optional: progress is then worked out from them)</span>
            <div className="space-y-2">
              {milestones.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="checkbox" checked={m.done} onChange={(e) => setMilestones((ms) => ms.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))} className="accent-orange-500 w-4 h-4" aria-label="Done" />
                  <input className={input} placeholder="e.g. Payments" value={m.title} onChange={(e) => setMilestones((ms) => ms.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} maxLength={120} />
                  <button type="button" onClick={() => setMilestones((ms) => ms.filter((_, j) => j !== i))} aria-label="Remove milestone" className="text-gray-500 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              ))}
              {milestones.length < 20 && (
                <button type="button" onClick={() => setMilestones((ms) => [...ms, { title: '', done: false }])} className="inline-flex items-center gap-1 text-sm text-orange-500 hover:underline">
                  <Plus size={14} /> Add milestone
                </button>
              )}
            </div>
          </div>
          <div>
            <label className={label} htmlFor="og-tech">Technologies (comma separated)</label>
            <input id="og-tech" className={input} placeholder="Go, React" value={f.technologies} onChange={(e) => set('technologies', e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="og-url">Link (optional)</label>
            <input id="og-url" inputMode="url" className={input} placeholder="github.com/..." value={f.project_url} onChange={(e) => set('project_url', e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-gray-200 dark:bg-gray-800 font-semibold disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold disabled:opacity-70">
            {saving && <Loader2 size={18} className="animate-spin" />}
            {status || (p ? 'Save changes' : 'Add project')}
          </button>
        </div>
      </form>
    </div>
  );
}
