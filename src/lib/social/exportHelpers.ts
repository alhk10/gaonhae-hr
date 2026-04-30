import JSZip from 'jszip';
import type { Platform, PlatformCaption } from './platforms';
import { PLATFORM_LABELS } from './platforms';

export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // fallback
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

export function formatCaptionForCopy(c: PlatformCaption): string {
  const tags = (c.hashtags ?? [])
    .map((h) => (h.startsWith('#') ? h : `#${h}`))
    .join(' ');
  return [c.caption, c.cta, tags].filter(Boolean).join('\n\n');
}

export function formatHashtagsForCopy(c: PlatformCaption): string {
  return (c.hashtags ?? [])
    .map((h) => (h.startsWith('#') ? h : `#${h}`))
    .join(' ');
}

export async function downloadMediaBundle(
  files: { name: string; blob: Blob }[],
  bundleName: string,
): Promise<void> {
  if (files.length === 0) return;

  if (files.length === 1) {
    triggerDownload(files[0].blob, files[0].name);
    return;
  }

  const zip = new JSZip();
  files.forEach((f, i) => {
    // de-dupe filenames
    const safeName = f.name.replace(/[^\w.\-]+/g, '_');
    zip.file(`${String(i + 1).padStart(2, '0')}_${safeName}`, f.blob);
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, `${bundleName}.zip`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function fetchAsBlob(url: string): Promise<Blob> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to fetch ${url}`);
  return await r.blob();
}

export function platformLabel(p: Platform): string {
  return PLATFORM_LABELS[p];
}
