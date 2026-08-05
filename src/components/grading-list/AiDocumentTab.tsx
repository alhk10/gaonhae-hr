import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Sparkles, Download, Copy, Trash2, ImageIcon, FileText, Upload, X, Type } from 'lucide-react';
import { useBranches } from '@/hooks/useBranches';
import { formatDateTime } from '@/utils/dateFormat';
import {
  AssetFormat,
  FORMAT_LABELS,
  AssetDetails,
  TEXT_FIELD_KEYS,
  buildImagePrompt,
  buildTextEditPrompt,
  buildCopyDetails,
  formatLabelFor,
  isValidCustomSize,
  CUSTOM_SIZE_DEFAULT,
  CUSTOM_SIZE_MIN,
  CUSTOM_SIZE_MAX,
  type CustomSize,
} from '@/lib/ai/gaonhaeBrandPrompt';

import {
  QR_OPTIONS,
  QrChoice,
  LOGO_OPTIONS,
  LogoChoice,
  qrSrc,
  logoSrc,
  assetToDataUrl,
  composeArtwork,
  downloadDataUrl,
  downloadPdf,
} from '@/lib/ai/marketingExport';
import { Switch } from '@/components/ui/switch';
import {
  BrandAsset,
  GeneratedCopy,
  MarketingAssetRow,
  ReferenceImage,
  deleteAsset,
  generateCopy,
  generateImage,
  getAssetUrl,
  listAssets,
  saveAsset,
  uploadGeneratedImage,
  uploadReferenceImage,
} from '@/services/aiMarketingAssetService';

interface Props {
  /** The admin password already accepted on the /access page. */
  password: string;
}

const EMPTY_COPY: GeneratedCopy = {
  headline: '',
  subheadline: '',
  body: '',
  caption: '',
  hashtags: [],
};

const MODEL_OPTIONS = [
  { value: 'openai/gpt-image-2', label: 'GPT Image 2 (best text)' },
  { value: 'openai/gpt-image-1-mini', label: 'GPT Image 1 Mini (fast)' },
  { value: 'google/gemini-3.1-flash-image', label: 'Nano Banana 2 (fast)' },
  { value: 'google/gemini-3-pro-image', label: 'Gemini 3 Pro Image (best quality)' },
];

const MAX_REFS = 3;
const MAX_REF_BYTES = 5 * 1024 * 1024;

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('Could not read file'));
    fr.readAsDataURL(file);
  });

const AiDocumentTab: React.FC<Props> = ({ password }) => {
  const { branches } = useBranches();
  const fileRef = useRef<HTMLInputElement>(null);

  const [format, setFormat] = useState<AssetFormat>('poster');
  const [customWidth, setCustomWidth] = useState<string>(String(CUSTOM_SIZE_DEFAULT.widthCm));
  const [customHeight, setCustomHeight] = useState<string>(String(CUSTOM_SIZE_DEFAULT.heightCm));

  const [branchId, setBranchId] = useState<string>('none');
  const [headline, setHeadline] = useState('');
  const [pricing, setPricing] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [venue, setVenue] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [cta, setCta] = useState('');
  const [qrChoice, setQrChoice] = useState<QrChoice>('none');
  const [logoChoice, setLogoChoice] = useState<LogoChoice>('mark');
  const [model, setModel] = useState<string>(MODEL_OPTIONS[0].value);
  const [artDirection, setArtDirection] = useState('');
  const [references, setReferences] = useState<ReferenceImage[]>([]);
  const [blendAssets, setBlendAssets] = useState(true);

  const parsedCustomSize: CustomSize = {
    widthCm: Number.parseFloat(customWidth),
    heightCm: Number.parseFloat(customHeight),
  };
  const customSizeValid = isValidCustomSize(parsedCustomSize);
  const customSize: CustomSize | null =
    format === 'custom' && customSizeValid ? parsedCustomSize : null;



  const [image, setImage] = useState<string | null>(null);
  const [imageFinal, setImageFinal] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyData, setCopyData] = useState<GeneratedCopy>(EMPTY_COPY);
  /** Snapshot of the text fields used for the current artwork. */
  const [textSnapshot, setTextSnapshot] = useState<string | null>(null);
  /** Which assets the model blended into the artwork currently on screen. */
  const [blendedIn, setBlendedIn] = useState<{ qr: boolean; logo: boolean }>({ qr: false, logo: false });
  /** Force the pixel-exact QR back on top of a blended artwork. */
  const [forceOverlayQr, setForceOverlayQr] = useState(false);

  const [history, setHistory] = useState<MarketingAssetRow[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  const branchName =
    branchId !== 'none' ? branches.find((b) => b.id === branchId)?.name ?? undefined : undefined;

  const details: AssetDetails = {
    headline,
    pricing,
    dateTime,
    venue,
    additionalDetails,
    cta,
    branchName,
    artDirection,
  };

  const hasQr = qrChoice !== 'none';
  const hasLogo = logoChoice !== 'none';
  const blending = blendAssets && (hasQr || hasLogo);
  const skipQrOverlay = blendedIn.qr && !forceOverlayQr;
  const skipLogoOverlay = blendedIn.logo;

  const textKey = JSON.stringify(TEXT_FIELD_KEYS.map((k) => details[k] || ''));
  const textDirty = Boolean(image && textSnapshot !== null && textSnapshot !== textKey);


  const refreshHistory = useCallback(async () => {
    try {
      const rows = await listAssets(30);
      setHistory(rows);
      const map: Record<string, string> = {};
      await Promise.all(
        rows
          .filter((r) => r.image_path)
          .map(async (r) => {
            try {
              map[r.id] = await getAssetUrl(r.image_path!);
            } catch {
              /* ignore */
            }
          }),
      );
      setThumbs(map);
    } catch (e: any) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const handleAddReferences = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_REFS - references.length;
    if (room <= 0) {
      toast.error(`Maximum ${MAX_REFS} reference images`);
      return;
    }
    const picked = Array.from(files).slice(0, room);
    const next: ReferenceImage[] = [];
    for (const f of picked) {
      if (!f.type.startsWith('image/')) {
        toast.error(`${f.name} is not an image`);
        continue;
      }
      if (f.size > MAX_REF_BYTES) {
        toast.error(`${f.name} is larger than 5 MB`);
        continue;
      }
      try {
        next.push({ dataUrl: await fileToDataUrl(f), note: '' });
      } catch {
        toast.error(`Could not read ${f.name}`);
      }
    }
    if (next.length) setReferences((prev) => [...prev, ...next]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const runCopyGeneration = async (): Promise<any | null> => {
    setCopyLoading(true);
    try {
      const c = await generateCopy(password, format, buildCopyDetails(format, details, customSize));
      setCopyData(c);
      return c;
    } catch (e: any) {
      toast.error(e?.message || 'Caption generation failed');
      return null;
    } finally {
      setCopyLoading(false);
    }
  };

  const handleGenerateCopy = async () => {
    if (!headline.trim()) {
      toast.error('Add a headline / event name first');
      return;
    }
    const c = await runCopyGeneration();
    if (c) toast.success('Captions generated');
  };

  const runGeneration = async (textOnly: boolean) => {
    if (!headline.trim()) {
      toast.error('Add a headline / event name first');
      return;
    }
    const baseImage = textOnly ? image : null;
    if (textOnly && !baseImage) return;

    setImgLoading(true);
    setImageFinal(false);
    if (!textOnly) setImage(null);

    // Captions are generated alongside a full artwork run.
    const copyPromise: Promise<any | null> | null = textOnly ? null : runCopyGeneration();

    let last: string | null = null;
    try {
      const brandAssets: BrandAsset[] = [];
      if (blending && !textOnly) {
        const l = logoSrc(logoChoice);
        const q = qrSrc(qrChoice);
        if (l) {
          try {
            brandAssets.push({ kind: 'logo', dataUrl: await assetToDataUrl(l) });
          } catch {
            /* optional */
          }
        }
        if (q) {
          try {
            brandAssets.push({ kind: 'qr', dataUrl: await assetToDataUrl(q) });
          } catch {
            /* optional */
          }
        }
      }
      const sentLogo = brandAssets.some((a) => a.kind === 'logo');
      const sentQr = brandAssets.some((a) => a.kind === 'qr');

      const prompt = textOnly
        ? buildTextEditPrompt(details)
        : buildImagePrompt(format, details, {
            blendAssets: blending,
            hasQr: sentQr,
            hasLogo: sentLogo,
            customSize,
          });

      await generateImage(
        password,
        format,
        prompt,
        {
          model,
          baseImage,
          references,
          brandAssets,
          widthCm: customSize?.widthCm,
          heightCm: customSize?.heightCm,
        },

        (dataUrl, isFinal) => {
          last = dataUrl;
          setImage(dataUrl);
          setImageFinal(isFinal);
        },
      );

      setTextSnapshot(textKey);
      if (!textOnly) {
        setBlendedIn({ qr: sentQr, logo: sentLogo });
        setForceOverlayQr(false);
      }

      if (last) {
        try {
          const freshCopy = copyPromise ? await copyPromise : null;
          const path = await uploadGeneratedImage(last);
          const refPaths: string[] = [];
          for (const r of references) {
            try {
              refPaths.push(await uploadReferenceImage(r.dataUrl));
            } catch {
              /* reference upload optional */
            }
          }
          await saveAsset({
            branch_id: branchId !== 'none' ? branchId : null,
            format,
            inputs: {
              ...details,
              format,
              qrChoice,
              logoChoice,
              blendAssets,
              customWidthCm: customSize?.widthCm,
              customHeightCm: customSize?.heightCm,
              refNotes: references.map((r) => r.note || ''),
            },

            copy: freshCopy ?? copyData,
            qr_choice: qrChoice,
            logo_choice: logoChoice,
            model,
            reference_paths: refPaths.length ? refPaths : null,
            image_path: path,
          });
          refreshHistory();
        } catch (e: any) {
          console.error('Save failed', e);
        }
      }
      toast.success(textOnly ? 'Text updated' : 'Artwork generated');
    } catch (e: any) {
      toast.error(e?.message || 'Image generation failed');
    } finally {
      setImgLoading(false);
    }
  };

  const handleDownload = async (kind: 'png' | 'pdf') => {
    if (!image) return;
    try {
      const composed = await composeArtwork(image, qrChoice, logoChoice, {
        skipQr: skipQrOverlay,
        skipLogo: skipLogoOverlay,
      });
      const base = (headline || 'gaonhae-asset').replace(/[^\w\-]+/g, '_').slice(0, 40);
      if (kind === 'png') downloadDataUrl(composed, `${base}.png`);
      else await downloadPdf(composed, format, `${base}.pdf`, customSize);
    } catch (e: any) {
      toast.error(e?.message || 'Export failed');
    }
  };


  const handleCopyCaption = async () => {
    const tags = (copyData.hashtags || []).map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ');
    await navigator.clipboard.writeText([copyData.caption, tags].filter(Boolean).join('\n\n'));
    toast.success('Caption copied');
  };

  const loadFromHistory = async (row: MarketingAssetRow) => {
    const i = (row.inputs || {}) as AssetDetails & {
      qrChoice?: QrChoice;
      logoChoice?: LogoChoice;
      refNotes?: string[];
      blendAssets?: boolean;
      customWidthCm?: number;
      customHeightCm?: number;
    };
    setFormat((row.format as AssetFormat) || 'poster');
    setCustomWidth(String(i.customWidthCm ?? CUSTOM_SIZE_DEFAULT.widthCm));
    setCustomHeight(String(i.customHeightCm ?? CUSTOM_SIZE_DEFAULT.heightCm));
    setBranchId(row.branch_id || 'none');

    setHeadline(i.headline || '');
    setPricing(i.pricing || '');
    setDateTime(i.dateTime || '');
    setVenue(i.venue || '');
    setAdditionalDetails(i.additionalDetails || '');
    setCta(i.cta || '');
    setArtDirection(i.artDirection || '');
    setQrChoice((row.qr_choice as QrChoice) || 'none');
    setLogoChoice((row.logo_choice as LogoChoice) || (i.logoChoice as LogoChoice) || 'mark');
    setBlendAssets(i.blendAssets !== false);
    setBlendedIn({ qr: false, logo: false });
    setForceOverlayQr(false);
    if (row.model) setModel(row.model);
    setCopyData({ ...EMPTY_COPY, ...(row.copy || {}) });

    // Restore reference images
    const paths = row.reference_paths || [];
    if (paths.length) {
      const restored: ReferenceImage[] = [];
      for (let idx = 0; idx < paths.length; idx++) {
        try {
          const url = await getAssetUrl(paths[idx]);
          const blob = await (await fetch(url)).blob();
          const dataUrl = await fileToDataUrl(new File([blob], 'ref', { type: blob.type }));
          restored.push({ dataUrl, note: i.refNotes?.[idx] || '' });
        } catch {
          /* ignore */
        }
      }
      setReferences(restored);
    } else {
      setReferences([]);
    }

    if (row.image_path) {
      try {
        const url = thumbs[row.id] || (await getAssetUrl(row.image_path));
        setImage(url);
        setImageFinal(true);
        setTextSnapshot(
          JSON.stringify(TEXT_FIELD_KEYS.map((k) => (i as any)[k] || '')),
        );
      } catch {
        /* ignore */
      }
    }
  };

  const handleDelete = async (row: MarketingAssetRow) => {
    if (!confirm('Delete this generation?')) return;
    try {
      await deleteAsset(row);
      refreshHistory();
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed');
    }
  };

  const usesGeminiForImages = references.length > 0 || textDirty || blending;
  const geminiNotice = usesGeminiForImages && model.startsWith('openai/');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left: form + history */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Asset details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Format</Label>
                <Select value={format} onValueChange={(v) => setFormat(v as AssetFormat)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FORMAT_LABELS) as AssetFormat[]).map((f) => (
                      <SelectItem key={f} value={f}>{FORMAT_LABELS[f]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Branch (optional)</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No branch</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {format === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Width (cm)</Label>
                  <Input
                    className="h-8 text-xs"
                    type="number"
                    min={CUSTOM_SIZE_MIN}
                    max={CUSTOM_SIZE_MAX}
                    step="0.1"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                    placeholder="21"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Height (cm)</Label>
                  <Input
                    className="h-8 text-xs"
                    type="number"
                    min={CUSTOM_SIZE_MIN}
                    max={CUSTOM_SIZE_MAX}
                    step="0.1"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(e.target.value)}
                    placeholder="29.7"
                  />
                </div>
                <p className="col-span-2 text-[10px] text-muted-foreground">
                  {customSizeValid
                    ? `Artwork is generated at the closest supported ratio and exported to a ${customWidth} x ${customHeight} cm PDF page.`
                    : `Enter a width and height between ${CUSTOM_SIZE_MIN} and ${CUSTOM_SIZE_MAX} cm.`}
                </p>
              </div>
            )}



            <div className="space-y-1">
              <Label className="text-xs">Headline / event name</Label>
              <Input className="h-8 text-xs" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Term 4 Holiday Programme" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Pricing (optional)</Label>
                <Input className="h-8 text-xs" value={pricing} onChange={(e) => setPricing(e.target.value)} placeholder="$120 per child" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date &amp; time (optional)</Label>
                <Input className="h-8 text-xs" value={dateTime} onChange={(e) => setDateTime(e.target.value)} placeholder="14 Sep 2026, 9am–12pm" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Venue (optional)</Label>
              <Input className="h-8 text-xs" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Gaonhae Morley" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Additional details (optional)</Label>
              <Textarea className="text-xs min-h-[60px]" value={additionalDetails} onChange={(e) => setAdditionalDetails(e.target.value)} placeholder="Ages 5–12, bring water bottle, limited spots" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Call to action (optional)</Label>
              <Input className="h-8 text-xs" value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Scan to register" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">QR code</Label>
              <div className="flex gap-2 flex-wrap">
                {QR_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setQrChoice(o.value)}
                    className={`border rounded-md p-1.5 flex flex-col items-center gap-1 w-[74px] ${
                      qrChoice === o.value ? 'border-primary ring-1 ring-primary' : 'border-border'
                    }`}
                  >
                    {o.src ? (
                      <img src={o.src} alt={o.label} className="h-10 w-10 object-contain" />
                    ) : (
                      <div className="h-10 w-10 flex items-center justify-center text-muted-foreground">—</div>
                    )}
                    <span className="text-[10px] leading-none">{o.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Logo</Label>
              <div className="flex gap-2 flex-wrap">
                {LOGO_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setLogoChoice(o.value)}
                    className={`border rounded-md p-1.5 flex flex-col items-center gap-1 w-[86px] ${
                      logoChoice === o.value ? 'border-primary ring-1 ring-primary' : 'border-border'
                    }`}
                  >
                    {o.src ? (
                      <img src={o.src} alt={o.label} className="h-10 w-full object-contain" />
                    ) : (
                      <div className="h-10 w-full flex items-center justify-center text-muted-foreground">—</div>
                    )}
                    <span className="text-[10px] leading-none">{o.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Reference images (optional, max {MAX_REFS})</Label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleAddReferences(e.dataTransfer.files);
                }}
                className="border border-dashed rounded-md p-2 space-y-2"
              >
                {references.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {references.map((r, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="relative">
                          <img src={r.dataUrl} alt={`Reference ${idx + 1}`} className="h-16 w-full object-cover rounded" />
                          <button
                            type="button"
                            onClick={() => setReferences(references.filter((_, i2) => i2 !== idx))}
                            className="absolute -top-1.5 -right-1.5 bg-background border rounded-full p-0.5"
                            aria-label="Remove reference"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <Input
                          className="h-6 text-[10px]"
                          placeholder="match this layout"
                          value={r.note || ''}
                          onChange={(e) =>
                            setReferences(references.map((x, i2) => (i2 === idx ? { ...x, note: e.target.value } : x)))
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => handleAddReferences(e.target.files)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-xs"
                  onClick={() => fileRef.current?.click()}
                  disabled={references.length >= MAX_REFS}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  {references.length ? 'Add another' : 'Attach or drop images'}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Extra art direction (optional)</Label>
              <Input className="h-8 text-xs" value={artDirection} onChange={(e) => setArtDirection(e.target.value)} placeholder="add a trophy, teen class" />
            </div>

            {(hasQr || hasLogo) && (
              <div className="flex items-start justify-between gap-3 rounded-md border p-2">
                <div>
                  <Label className="text-xs">Blend QR & logo into the design</Label>
                  <p className="text-[10px] text-muted-foreground">
                    {blendAssets
                      ? 'The AI composes the supplied QR and logo into the artwork.'
                      : 'They are pasted over the artwork on export.'}
                  </p>
                </div>
                <Switch checked={blendAssets} onCheckedChange={setBlendAssets} />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">AI model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {geminiNotice && (
                <p className="text-[10px] text-muted-foreground">
                  Blended brand assets, reference images and text updates run on the Gemini image editor.
                </p>
              )}
            </div>


            <div className="flex gap-2 pt-1 flex-wrap">
              {textDirty ? (
                <>
                  <Button size="sm" className="flex-1" onClick={() => runGeneration(true)} disabled={imgLoading}>
                    {imgLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Type className="h-3.5 w-3.5 mr-1" />}
                    Update text
                  </Button>
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => runGeneration(false)} disabled={imgLoading}>
                    <ImageIcon className="h-3.5 w-3.5 mr-1" /> New artwork
                  </Button>
                </>
              ) : (
                <Button size="sm" className="flex-1" onClick={() => runGeneration(false)} disabled={imgLoading}>
                  {imgLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5 mr-1" />}
                  Generate artwork
                </Button>
              )}
              <Button size="sm" variant="outline" className="flex-1" onClick={handleGenerateCopy} disabled={copyLoading}>
                {copyLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                Generate copy
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Generation history</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No generations yet</p>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {history.map((row) => (
                  <div key={row.id} className="flex items-center gap-2 border rounded-md p-2">
                    <button type="button" className="flex items-center gap-2 flex-1 text-left" onClick={() => loadFromHistory(row)}>
                      {thumbs[row.id] ? (
                        <img src={thumbs[row.id]} alt="" className="h-10 w-10 object-cover rounded" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{row.inputs?.headline || 'Untitled'}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatLabelFor(
                            (row.format as AssetFormat) || 'poster',
                            row.inputs?.customWidthCm && row.inputs?.customHeightCm
                              ? { widthCm: row.inputs.customWidthCm, heightCm: row.inputs.customHeightCm }
                              : null,
                          )} · {formatDateTime(row.created_at)}

                        </p>
                      </div>
                    </button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(row)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: preview + copy */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Artwork</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative bg-muted/40 rounded-md min-h-[260px] flex items-center justify-center overflow-hidden">
              {image ? (
                <div className="relative">
                  <img
                    src={image}
                    alt="Generated artwork"
                    className={`max-h-[420px] w-auto ${imageFinal ? '' : 'blur-lg'}`}
                  />
                  {!skipLogoOverlay && logoSrc(logoChoice) && (
                    <img
                      src={logoSrc(logoChoice)!}
                      alt="Logo"
                      className="absolute top-3 left-3 h-10 w-auto bg-white/90 p-1 rounded"
                    />
                  )}
                  {!skipQrOverlay && qrSrc(qrChoice) && (
                    <img
                      src={qrSrc(qrChoice)!}
                      alt="QR"
                      className="absolute bottom-3 right-3 h-14 w-14 bg-white p-1 rounded"
                    />
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-16">
                  {imgLoading ? 'Generating…' : 'No artwork yet'}
                </p>
              )}
            </div>
            {image && blendedIn.qr && (
              <p className="text-[11px] text-muted-foreground">
                The QR code was drawn into the design — scan-test it before printing.
                {forceOverlayQr && ' Currently showing the pixel-exact QR pasted on top.'}
              </p>
            )}
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => handleDownload('png')} disabled={!image}>
                <Download className="h-3.5 w-3.5 mr-1" /> PNG
              </Button>
              {(format === 'poster' || format === 'custom') && (
                <Button size="sm" variant="outline" onClick={() => handleDownload('pdf')} disabled={!image}>
                  <Download className="h-3.5 w-3.5 mr-1" /> PDF
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => runGeneration(false)} disabled={imgLoading}>
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Regenerate image
              </Button>
              {image && (
                <Button size="sm" variant="outline" onClick={() => runGeneration(true)} disabled={imgLoading}>
                  <Type className="h-3.5 w-3.5 mr-1" /> Update text
                </Button>
              )}
              {image && blendedIn.qr && (
                <Button size="sm" variant="outline" onClick={() => setForceOverlayQr((v) => !v)}>
                  <ImageIcon className="h-3.5 w-3.5 mr-1" />
                  {forceOverlayQr ? 'Use blended QR' : 'Overlay QR instead'}
                </Button>
              )}
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Social Media Captions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Caption</Label>
              <Textarea className="text-xs min-h-[80px]" value={copyData.caption} onChange={(e) => setCopyData({ ...copyData, caption: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hashtags</Label>
              <Input
                className="h-8 text-xs"
                value={(copyData.hashtags || []).join(' ')}
                onChange={(e) => setCopyData({ ...copyData, hashtags: e.target.value.split(/\s+/).filter(Boolean) })}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleCopyCaption}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Copy caption
              </Button>
              <Button size="sm" variant="outline" onClick={handleGenerateCopy} disabled={copyLoading}>
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Regenerate copy
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AiDocumentTab;
