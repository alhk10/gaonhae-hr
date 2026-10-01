/**
 * Renders a PDF (object/blob URL) as canvas pages so it displays on mobile
 * browsers that cannot show PDFs inside an iframe.
 */
import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export const PdfPagesPreview = ({ url, className }: { url: string; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const box = ref.current;
    if (!box) return;
    box.innerHTML = '';
    setError(null);
    (async () => {
      try {
        const doc = await pdfjs.getDocument(url).promise;
        const width = box.clientWidth || 600;
        const dpr = window.devicePixelRatio || 1;
        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) return;
          const page = await doc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const vp = page.getViewport({ scale: (width / base.width) * dpr });
          const canvas = document.createElement('canvas');
          canvas.width = vp.width;
          canvas.height = vp.height;
          canvas.style.width = '100%';
          canvas.style.display = 'block';
          canvas.className = 'mb-2 bg-background shadow-sm';
          box.appendChild(canvas);
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise;
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Could not display invoice');
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div className={className ?? 'w-full max-h-[70vh] overflow-auto rounded border bg-muted p-2'}>
      {error && <p className="py-6 text-center text-xs text-destructive">{error}</p>}
      <div ref={ref} />
    </div>
  );
};

export default PdfPagesPreview;
