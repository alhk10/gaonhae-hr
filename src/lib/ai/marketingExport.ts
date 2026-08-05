import jsPDF from 'jspdf';
import type { AssetFormat } from '@/lib/ai/gaonhaeBrandPrompt';
import logoUrl from '@/assets/gaonhae-logo.png';
import calligraphyLogoUrl from '@/assets/logo/gaonhae-calligraphy-logo.jpg';
import seminarsQr from '@/assets/qr/seminars-qr-code.png';
import compsQr from '@/assets/qr/gaonhae_comps_qr.png';
import payQr from '@/assets/qr/gaonhae-pay-qr.png';

export type QrChoice = 'none' | 'seminars' | 'competitions' | 'payment';
export type LogoChoice = 'none' | 'mark' | 'calligraphy';

export const QR_OPTIONS: { value: QrChoice; label: string; src: string | null }[] = [
  { value: 'none', label: 'No QR', src: null },
  { value: 'seminars', label: 'Seminars', src: seminarsQr },
  { value: 'competitions', label: 'Competitions', src: compsQr },
  { value: 'payment', label: 'Payment', src: payQr },
];

export const LOGO_OPTIONS: { value: LogoChoice; label: string; src: string | null }[] = [
  { value: 'none', label: 'No logo', src: null },
  { value: 'mark', label: 'Mark', src: logoUrl },
  { value: 'calligraphy', label: 'Calligraphy', src: calligraphyLogoUrl },
];

export const qrSrc = (choice: QrChoice): string | null =>
  QR_OPTIONS.find((o) => o.value === choice)?.src ?? null;

export const logoSrc = (choice: LogoChoice): string | null =>
  LOGO_OPTIONS.find((o) => o.value === choice)?.src ?? null;

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });

/** Fetches a bundled asset URL and returns it as a base64 data URL. */
export async function assetToDataUrl(src: string): Promise<string> {
  const blob = await (await fetch(src)).blob();
  return await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('Could not read asset'));
    fr.readAsDataURL(blob);
  });
}

export interface ComposeOptions {
  /** Skip pasting the QR (it is already blended into the artwork). */
  skipQr?: boolean;
  /** Skip pasting the logo (it is already blended into the artwork). */
  skipLogo?: boolean;
}

/** Composites artwork + QR + logo onto a canvas and returns a PNG data URL. */
export async function composeArtwork(
  imageDataUrl: string,
  choice: QrChoice,
  logoChoice: LogoChoice = 'mark',
  opts: ComposeOptions = {},
): Promise<string> {
  const art = await loadImage(imageDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = art.naturalWidth;
  canvas.height = art.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return imageDataUrl;
  ctx.drawImage(art, 0, 0);

  const pad = Math.round(canvas.width * 0.035);

  // Logo — top left, on a white pad.
  const logoImg = opts.skipLogo ? null : logoSrc(logoChoice);

  if (logoImg) {
    try {
      const logo = await loadImage(logoImg);
      const w = Math.round(canvas.width * 0.16);
      const h = Math.round((logo.naturalHeight / logo.naturalWidth) * w);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(pad - 8, pad - 8, w + 16, h + 16);
      ctx.drawImage(logo, pad, pad, w, h);
    } catch {
      /* logo optional */
    }
  }

  // QR — bottom right on a white pad.
  const src = opts.skipQr ? null : qrSrc(choice);
  if (src) {
    try {
      const qr = await loadImage(src);
      const size = Math.round(canvas.width * 0.18);
      const x = canvas.width - size - pad;
      const y = canvas.height - size - pad;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 10, y - 10, size + 20, size + 20);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(qr, x, y, size, size);
    } catch {
      /* qr optional */
    }
  }

  return canvas.toDataURL('image/png');
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function downloadPdf(
  dataUrl: string,
  format: AssetFormat,
  filename: string,
  customSize?: { widthCm: number; heightCm: number } | null,
) {
  const img = await loadImage(dataUrl);
  const custom = format === 'custom' && customSize ? customSize : null;
  const pageW = custom ? custom.widthCm * 10 : 210;
  const pageH = custom ? custom.heightCm * 10 : (img.naturalHeight / img.naturalWidth) * 210;
  const portrait = custom ? pageH >= pageW : img.naturalHeight >= img.naturalWidth;
  const doc = new jsPDF({
    orientation: portrait ? 'portrait' : 'landscape',
    unit: 'mm',
    format: custom ? [pageW, pageH] : format === 'poster' ? 'a4' : [210, pageH],
  });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const scale = Math.min(pw / img.naturalWidth, ph / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  doc.addImage(dataUrl, 'PNG', (pw - w) / 2, (ph - h) / 2, w, h);
  doc.save(filename);
}

