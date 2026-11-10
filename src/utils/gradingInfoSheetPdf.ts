import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, PDFImage } from 'pdf-lib';
import QRCode from 'qrcode';

export interface InfoSheetBranch {
  name: string;
  address: string;
}

const FRONT_URL = '/downloads/ready-for-grading-info-sheet.pdf';
const TILE = 256;
const ZOOM = 16;

async function geocode(address: string): Promise<{ lat: number; lon: number } | null> {
  const tries = [address, address.replace(/#[^,]*,?/g, '').trim()];
  for (const q of tries) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`);
      const j = await r.json();
      if (Array.isArray(j) && j[0]) return { lat: Number(j[0].lat), lon: Number(j[0].lon) };
    } catch { /* try next */ }
  }
  // Fallback: postal code only
  const pc = address.match(/\b\d{6}\b|\b\d{4}\b(?!.*\d{4})/)?.[0];
  if (pc) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&postalcode=${pc}`);
      const j = await r.json();
      if (Array.isArray(j) && j[0]) return { lat: Number(j[0].lat), lon: Number(j[0].lon) };
    } catch { /* ignore */ }
  }
  return null;
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

/** Stitch OSM tiles around a point into a JPEG of the given pixel size, with a pin. */
async function renderMap(lat: number, lon: number, w: number, h: number): Promise<Uint8Array | null> {
  try {
    const n = 2 ** ZOOM;
    const px = ((lon + 180) / 360) * n * TILE;
    const latR = (lat * Math.PI) / 180;
    const py = ((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n * TILE;
    const left = px - w / 2, top = py - h / 2;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#eee'; ctx.fillRect(0, 0, w, h);
    const jobs: Promise<void>[] = [];
    for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + w) / TILE); tx++) {
      for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + h) / TILE); ty++) {
        jobs.push(loadImg(`https://tile.openstreetmap.org/${ZOOM}/${tx}/${ty}.png`).then((img) => {
          ctx.drawImage(img, tx * TILE - left, ty * TILE - top);
        }));
      }
    }
    await Promise.all(jobs);
    // pin
    const cx = w / 2, cy = h / 2;
    ctx.fillStyle = '#d71920';
    ctx.beginPath();
    ctx.arc(cx, cy - 22, 11, Math.PI, 0);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, cy - 22, 4.5, 0, Math.PI * 2); ctx.fill();
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.85));
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(t, size) > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

const COLORS = [rgb(0.07, 0.25, 0.6), rgb(0.78, 0.1, 0.13), rgb(0.1, 0.45, 0.25), rgb(0.45, 0.2, 0.6)];

interface Prepared { b: InfoSheetBranch; qr: PDFImage; map: PDFImage | null }

function drawHalf(page: PDFPage, x0: number, halfW: number, H: number, items: Prepared[], bold: PDFFont, reg: PDFFont) {
  const m = 28;
  const innerW = halfW - m * 2;
  const title = 'GRADING VENUES';
  const ts = 20;
  page.drawText(title, { x: x0 + (halfW - bold.widthOfTextAtSize(title, ts)) / 2, y: H - 46, size: ts, font: bold, color: COLORS[0] });
  const top = H - 64, bottom = 40;
  const cardH = (top - bottom) / items.length;
  const qrSize = Math.min(52, cardH * 0.3);
  items.forEach((it, i) => {
    const yTop = top - i * cardH;
    const color = COLORS[i % COLORS.length];
    page.drawText(it.b.name.toUpperCase(), { x: x0 + m, y: yTop - 14, size: 11, font: bold, color });
    const lines = wrap(it.b.address || '', reg, 7.5, innerW - qrSize - 10).slice(0, 3);
    lines.forEach((l, k) => page.drawText(l, { x: x0 + m, y: yTop - 26 - k * 9, size: 7.5, font: reg, color: rgb(0.2, 0.2, 0.2) }));
    page.drawImage(it.qr, { x: x0 + m + innerW - qrSize, y: yTop - qrSize - 2, width: qrSize, height: qrSize });
    page.drawText('Google Maps', { x: x0 + m + innerW - qrSize + (qrSize - reg.widthOfTextAtSize('Google Maps', 5)) / 2, y: yTop - qrSize - 9, size: 5, font: reg, color: rgb(0.4, 0.4, 0.4) });
    const mapTop = yTop - qrSize - 14;
    const mapH = Math.max(0, Math.min(mapTop - (yTop - cardH) - 10, innerW * 0.6));
    if (mapH > 30) {
      const y = mapTop - mapH;
      if (it.map) page.drawImage(it.map, { x: x0 + m, y, width: innerW, height: mapH });
      else page.drawText('Scan the QR code for directions', { x: x0 + m + 10, y: y + mapH / 2, size: 9, font: reg, color: rgb(0.4, 0.4, 0.4) });
      page.drawRectangle({ x: x0 + m, y, width: innerW, height: mapH, borderColor: color, borderWidth: 1 });
    }
  });
  const credit = 'Map data © OpenStreetMap contributors';
  page.drawText(credit, { x: x0 + (halfW - reg.widthOfTextAtSize(credit, 5.5)) / 2, y: 22, size: 5.5, font: reg, color: rgb(0.5, 0.5, 0.5) });
}

export async function buildGradingInfoSheet(branches: InfoSheetBranch[]): Promise<Blob> {
  const frontBytes = await (await fetch(FRONT_URL)).arrayBuffer();
  const src = await PDFDocument.load(frontBytes);
  const doc = await PDFDocument.create();
  const [front] = await doc.copyPages(src, [0]);
  doc.addPage(front);
  const { width: W, height: H } = front.getSize();
  const page = doc.addPage([W, H]);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg = await doc.embedFont(StandardFonts.Helvetica);

  const halfW = W / 2;
  const innerW = halfW - 56;
  const mapPxW = Math.round(innerW * 2);
  const mapPxH = Math.round(Math.min(innerW * 0.6, (H - 104) / branches.length - 70) * 2);

  const prepared: Prepared[] = await Promise.all(branches.map(async (b) => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address || b.name)}`;
    const qrPng = await QRCode.toDataURL(mapsUrl, { margin: 0, width: 300 });
    const qr = await doc.embedPng(qrPng);
    let map: PDFImage | null = null;
    if (mapPxH > 60 && b.address) {
      const pt = await geocode(b.address);
      if (pt) {
        const bytes = await renderMap(pt.lat, pt.lon, mapPxW, mapPxH);
        if (bytes) map = await doc.embedJpg(bytes);
      }
    }
    return { b, qr, map };
  }));

  drawHalf(page, 0, halfW, H, prepared, bold, reg);
  drawHalf(page, halfW, halfW, H, prepared, bold, reg);
  // cut line
  for (let y = 10; y < H - 10; y += 8) {
    page.drawLine({ start: { x: halfW, y }, end: { x: halfW, y: y + 4 }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });
  }
  const out = await doc.save();
  return new Blob([out], { type: 'application/pdf' });
}
