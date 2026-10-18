// Direct browser-to-Cloudinary uploads, signed by the backend (admin only).

export const MAX_FILE_MB = 10;

export interface UploadSignature {
  cloud_name: string;
  api_key: string;
  timestamp: string;
  folder: string;
  signature: string;
  upload_preset?: string;
}

export async function uploadToCloudinary(file: File, sig: UploadSignature): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sig.api_key);
  form.append('timestamp', sig.timestamp);
  form.append('folder', sig.folder);
  form.append('signature', sig.signature);
  if (sig.upload_preset) form.append('upload_preset', sig.upload_preset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`, { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `Upload of ${file.name} failed`);
  return data.secure_url as string;
}
