import { useEffect, useState } from 'react';
import { ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import { api, EMPLOYMENT_TYPES, img, type Experience, type ExperienceInput } from '../lib/api';
import { useStore } from '../lib/store';
import { MAX_FILE_MB, uploadToCloudinary, type UploadSignature } from '../lib/upload';

interface Props {
  experience?: Experience; // editing when set, creating otherwise
  onClose: () => void;
}

// Projects are edited with technologies as one comma-separated string.
interface ProjectDraft {
  title: string;
  description: string;
  link: string;
  tech: string;
}

const withScheme = (u: string) => (u && !/^https?:\/\//i.test(u) ? `https://${u}` : u);
const splitList = (s: string, sep: string | RegExp) => s.split(sep).map((x) => x.trim()).filter(Boolean);

export default function ExperienceEditor({ experience: e, onClose }: Props) {
  const { reloadFeed } = useStore();
  const [f, setF] = useState({
    company: e?.company ?? '',
    role: e?.role ?? '',
    employment_type: e?.employment_type ?? 'Internship',
    location: e?.location ?? '',
    company_url: e?.company_url ?? '',
    start_date: e?.start_date ?? '',
    end_date: e?.end_date ?? '',
    current: e ? !e.end_date : false,
    summary: e?.summary ?? '',
    highlights: (e?.highlights ?? []).join('\n'),
    technologies: (e?.technologies ?? []).join(', '),
  });
  const [projects, setProjects] = useState<ProjectDraft[]>(
    (e?.projects ?? []).map((p) => ({ title: p.title, description: p.description, link: p.link, tech: p.technologies.join(', ') })),
  );
  // The logo is either a hosted URL or a picked file that is uploaded on save.
  const [logoUrl, setLogoUrl] = useState(e?.logo_url ?? '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const saving = status !== '';

  useEffect(() => () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
  }, [logoPreview]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const setProject = (i: number, k: keyof ProjectDraft, v: string) =>
    setProjects((ps) => ps.map((p, j) => (j === i ? { ...p, [k]: v } : p)));

  const pickLogo = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) return setError(`${file.name} is larger than ${MAX_FILE_MB} MB`);
    setError('');
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setLogoUrl('');
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!f.current && !f.end_date) return setError('Pick an end month, or tick "I currently work here"');
    setError('');
    try {
      let logo = withScheme(logoUrl.trim());
      if (logoFile) {
        setStatus('Uploading logo...');
        const sig = await api<UploadSignature>('/admin/upload-signature', 'POST');
        logo = await uploadToCloudinary(logoFile, sig);
        setLogoUrl(logo);
        setLogoFile(null); // uploaded: a retry must not upload it again
      }
      setStatus('Saving...');
      const body: ExperienceInput = {
        company: f.company,
        role: f.role,
        employment_type: f.employment_type,
        location: f.location,
        company_url: withScheme(f.company_url.trim()),
        logo_url: logo,
        start_date: f.start_date,
        end_date: f.current ? '' : f.end_date,
        summary: f.summary,
        highlights: splitList(f.highlights, '\n'),
        technologies: splitList(f.technologies, ','),
        projects: projects
          .filter((p) => p.title.trim())
          .map((p) => ({ title: p.title, description: p.description, link: withScheme(p.link.trim()), technologies: splitList(p.tech, ',') })),
      };
      if (e) await api(`/experiences/${e._id}`, 'PUT', body);
      else await api('/experiences', 'POST', body);
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
  const shownLogo = logoPreview || (logoUrl ? img(logoUrl, 160) : '');

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
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
          <h2 className="text-lg font-bold">{e ? 'Edit experience' : 'Add experience'}</h2>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="text-gray-500 hover:text-black dark:hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="flex gap-4 items-center">
            <div className="w-16 h-16 shrink-0 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-pink-500 p-[2px]">
              <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 overflow-hidden flex items-center justify-center text-lg font-bold">
                {shownLogo ? <img src={shownLogo} alt="" className="w-full h-full object-cover" /> : (f.company.trim()[0] ?? '?').toUpperCase()}
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <label className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-dashed border-gray-300 dark:border-gray-700 cursor-pointer hover:border-orange-500">
                  <ImagePlus size={16} /> {shownLogo ? 'Change logo' : 'Company logo'}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden" onChange={(ev) => { pickLogo(ev.target.files?.[0]); ev.target.value = ''; }} />
                </label>
                {shownLogo && (
                  <button type="button" onClick={clearLogo} className="px-3 text-sm rounded-lg bg-gray-200 dark:bg-gray-800">Remove</button>
                )}
              </div>
              {!logoFile && (
                <input className={input} placeholder="...or paste a logo URL" value={logoUrl} onChange={(ev) => setLogoUrl(ev.target.value)} />
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={label} htmlFor="ex-company">Company</label>
              <input id="ex-company" className={input} value={f.company} onChange={(ev) => set('company', ev.target.value)} maxLength={120} required />
            </div>
            <div>
              <label className={label} htmlFor="ex-role">Role</label>
              <input id="ex-role" className={input} placeholder="Software Engineer Intern" value={f.role} onChange={(ev) => set('role', ev.target.value)} maxLength={120} required />
            </div>
            <div>
              <label className={label} htmlFor="ex-type">Type</label>
              <select id="ex-type" className={input} value={f.employment_type} onChange={(ev) => set('employment_type', ev.target.value as typeof f.employment_type)}>
                {EMPLOYMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="ex-loc">Location</label>
              <input id="ex-loc" className={input} placeholder="Noida · Hybrid" value={f.location} onChange={(ev) => set('location', ev.target.value)} maxLength={120} />
            </div>
            <div>
              <label className={label} htmlFor="ex-start">Start month</label>
              <input id="ex-start" type="month" className={input} value={f.start_date} onChange={(ev) => set('start_date', ev.target.value)} required />
            </div>
            <div>
              <label className={label} htmlFor="ex-end">End month</label>
              <input id="ex-end" type="month" className={input} value={f.current ? '' : f.end_date} min={f.start_date || undefined} disabled={f.current} onChange={(ev) => set('end_date', ev.target.value)} />
              <label className="flex items-center gap-2 mt-2 text-sm">
                <input type="checkbox" checked={f.current} onChange={(ev) => set('current', ev.target.checked)} className="accent-orange-500" />
                I currently work here
              </label>
            </div>
          </div>

          <div>
            <label className={label} htmlFor="ex-url">Company website</label>
            <input id="ex-url" inputMode="url" className={input} placeholder="company.com" value={f.company_url} onChange={(ev) => set('company_url', ev.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="ex-summary">Summary</label>
            <textarea id="ex-summary" className={`${input} min-h-[80px]`} value={f.summary} onChange={(ev) => set('summary', ev.target.value)} maxLength={2000} />
          </div>
          <div>
            <label className={label} htmlFor="ex-hl">Key achievements (one per line)</label>
            <textarea id="ex-hl" className={`${input} min-h-[96px]`} placeholder={'Cut API latency by 40%\nShipped the onboarding flow'} value={f.highlights} onChange={(ev) => set('highlights', ev.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="ex-tech">Technologies (comma separated)</label>
            <input id="ex-tech" className={input} placeholder="Go, React, PostgreSQL" value={f.technologies} onChange={(ev) => set('technologies', ev.target.value)} />
          </div>

          <div>
            <span className={label}>Projects built here</span>
            <div className="space-y-3">
              {projects.map((p, i) => (
                <div key={i} className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 space-y-2">
                  <div className="flex gap-2">
                    <input className={input} placeholder="Project title" value={p.title} onChange={(ev) => setProject(i, 'title', ev.target.value)} maxLength={150} />
                    <button type="button" onClick={() => setProjects((ps) => ps.filter((_, j) => j !== i))} aria-label="Remove project" className="px-2 text-gray-500 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <textarea className={`${input} min-h-[60px]`} placeholder="What you built and the impact" value={p.description} onChange={(ev) => setProject(i, 'description', ev.target.value)} maxLength={1500} />
                  <div className="grid sm:grid-cols-2 gap-2">
                    <input className={input} inputMode="url" placeholder="Link (optional)" value={p.link} onChange={(ev) => setProject(i, 'link', ev.target.value)} />
                    <input className={input} placeholder="Tech, comma separated" value={p.tech} onChange={(ev) => setProject(i, 'tech', ev.target.value)} />
                  </div>
                </div>
              ))}
              {projects.length < 10 && (
                <button
                  type="button"
                  onClick={() => setProjects((ps) => [...ps, { title: '', description: '', link: '', tech: '' }])}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:border-orange-500 hover:text-orange-500"
                >
                  <Plus size={16} /> Add project
                </button>
              )}
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-gray-200 dark:bg-gray-800 font-semibold disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold disabled:opacity-70">
            {saving && <Loader2 size={18} className="animate-spin" />}
            {status || (e ? 'Save changes' : 'Add experience')}
          </button>
        </div>
      </form>
    </div>
  );
}
