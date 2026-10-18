import { useEffect, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { api, img } from '../lib/api';
import { useStore } from '../lib/store';
import { MAX_FILE_MB, uploadToCloudinary, type UploadSignature } from '../lib/upload';

const withScheme = (u: string) => (u && !/^https?:\/\//i.test(u) ? `https://${u}` : u);

/** Admin: post a new 24-hour profile story (image and/or text). */
export default function ProfileStoryEditor({ onClose }: { onClose: () => void }) {
  const { reloadFeed } = useStore();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
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

  const clearImage = () => {
    setFile(null);
    setPreview('');
    setImageUrl('');
  };

  const post = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!file && !imageUrl.trim() && !text.trim()) return setError('Add an image or write something');
    setError('');
    try {
      let image = withScheme(imageUrl.trim());
      if (file) {
        setStatus('Uploading...');
        const sig = await api<UploadSignature>('/admin/upload-signature', 'POST');
        image = await uploadToCloudinary(file, sig);
        setImageUrl(image);
        setFile(null); // uploaded: a retry must not upload it again
      }
      setStatus('Posting...');
      await api('/profile-stories', 'POST', { image_url: image, text, link: withScheme(link.trim()) });
      await reloadFeed();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post');
      setStatus('');
    }
  };

  const shown = preview || (imageUrl.trim() ? img(withScheme(imageUrl.trim()), 540) : '');
  const input =
    'w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white placeholder-gray-500 focus:outline-none focus:border-orange-500';

  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4" onClick={() => !saving && onClose()}>
      <form
        onSubmit={post}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto text-black dark:text-white"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold">New story</h2>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="text-gray-500 hover:text-black dark:hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="p-5 grid sm:grid-cols-[220px_1fr] gap-5">
          {/* Live preview, story-shaped */}
          <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-gradient-to-br from-yellow-500 via-orange-600 to-pink-700 mx-auto w-full max-w-[220px]">
            {shown && <img src={shown} alt="" className="absolute inset-0 w-full h-full object-cover" />}
            {text.trim() && (
              <p className={`absolute inset-x-0 p-3 text-white text-sm whitespace-pre-line ${shown ? 'bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-8' : 'top-1/2 -translate-y-1/2 text-center text-base font-semibold'}`}>
                {text}
              </p>
            )}
            {!shown && !text.trim() && <span className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">Preview</span>}
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 cursor-pointer hover:border-orange-500 text-sm">
                <ImagePlus size={18} /> {shown ? 'Change image' : 'Add image'}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              {shown && <button type="button" onClick={clearImage} className="px-3 text-sm rounded-lg bg-gray-200 dark:bg-gray-800">Remove image</button>}
            </div>
            {!file && <input className={input} placeholder="...or paste an image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />}
            <textarea className={`${input} min-h-[110px]`} placeholder="Say something (optional with an image)" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
            <input className={input} inputMode="url" placeholder="Link (optional)" value={link} onChange={(e) => setLink(e.target.value)} />
            <p className="text-xs text-gray-500">Visible for 24 hours. You'll see who viewed it, who liked it and the replies.</p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold disabled:opacity-70">
              {saving && <Loader2 size={18} className="animate-spin" />}
              {status || 'Share story'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
