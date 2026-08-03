import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Sparkles, Download, Copy, Trash2, ImageIcon, FileText } from 'lucide-react';
import { useBranches } from '@/hooks/useBranches';
import { formatDateTime } from '@/utils/dateFormat';
import {
  AssetFormat,
  FORMAT_LABELS,
  AssetDetails,
  buildImagePrompt,
  buildCopyDetails,
} from '@/lib/ai/gaonhaeBrandPrompt';
import {
  QR_OPTIONS,
  QrChoice,
  qrSrc,
  composeArtwork,
  downloadDataUrl,
  downloadPdf,
} from '@/lib/ai/marketingExport';
import {
  GeneratedCopy,
  MarketingAssetRow,
  deleteAsset,
  generateCopy,
  generateImage,
  getAssetUrl,
  listAssets,
  saveAsset,
  uploadGeneratedImage,
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

const AiDocumentTab: React.FC<Props> = ({ password }) => {
  const { branches } = useBranches();

  const [format, setFormat] = useState<AssetFormat>('poster');
  const [branchId, setBranchId] = useState<string>('none');
  const [headline, setHeadline] = useState('');
  const [pricing, setPricing] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [venue, setVenue] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [cta, setCta] = useState('');
  const [qrChoice, setQrChoice] = useState<QrChoice>('none');
  const [artDirection, setArtDirection] = useState('');

  const [image, setImage] = useState<string | null>(null);
  const [imageFinal, setImageFinal] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyData, setCopyData] = useState<GeneratedCopy>(EMPTY_COPY);

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

  const handleGenerateCopy = async () => {
    if (!headline.trim()) {
      toast.error('Add a headline / event name first');
      return;
    }
    setCopyLoading(true);
    try {
      const c = await generateCopy(password, format, buildCopyDetails(format, details));
      setCopyData(c);
      toast.success('Copy generated');
    } catch (e: any) {
      toast.error(e?.message || 'Copy generation failed');
    } finally {
      setCopyLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!headline.trim()) {
      toast.error('Add a headline / event name first');
      return;
    }
    setImgLoading(true);
    setImageFinal(false);
    setImage(null);
    let last: string | null = null;
    try {
      await generateImage(password, format, buildImagePrompt(format, details), (dataUrl, isFinal) => {
        last = dataUrl;
        setImage(dataUrl);
        setImageFinal(isFinal);
      });
      if (last) {
        try {
          const path = await uploadGeneratedImage(last);
          await saveAsset({
            branch_id: branchId !== 'none' ? branchId : null,
            format,
            inputs: { ...details, format, qrChoice },
            copy: copyData,
            qr_choice: qrChoice,
            image_path: path,
          });
          refreshHistory();
        } catch (e: any) {
          console.error('Save failed', e);
        }
      }
      toast.success('Artwork generated');
    } catch (e: any) {
      toast.error(e?.message || 'Image generation failed');
    } finally {
      setImgLoading(false);
    }
  };

  const handleDownload = async (kind: 'png' | 'pdf') => {
    if (!image) return;
    try {
      const composed = await composeArtwork(image, qrChoice);
      const base = (headline || 'gaonhae-asset').replace(/[^\w\-]+/g, '_').slice(0, 40);
      if (kind === 'png') downloadDataUrl(composed, `${base}.png`);
      else await downloadPdf(composed, format, `${base}.pdf`);
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
    const i = (row.inputs || {}) as AssetDetails & { qrChoice?: QrChoice };
    setFormat((row.format as AssetFormat) || 'poster');
    setBranchId(row.branch_id || 'none');
    setHeadline(i.headline || '');
    setPricing(i.pricing || '');
    setDateTime(i.dateTime || '');
    setVenue(i.venue || '');
    setAdditionalDetails(i.additionalDetails || '');
    setCta(i.cta || '');
    setArtDirection(i.artDirection || '');
    setQrChoice((row.qr_choice as QrChoice) || 'none');
    setCopyData({ ...EMPTY_COPY, ...(row.copy || {}) });
    if (row.image_path) {
      try {
        const url = thumbs[row.id] || (await getAssetUrl(row.image_path));
        setImage(url);
        setImageFinal(true);
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
              <Label className="text-xs">Extra art direction (optional)</Label>
              <Input className="h-8 text-xs" value={artDirection} onChange={(e) => setArtDirection(e.target.value)} placeholder="add a trophy, teen class" />
            </div>

            <div className="flex gap-2 pt-1">
              <Button size="sm" className="flex-1" onClick={handleGenerateImage} disabled={imgLoading}>
                {imgLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5 mr-1" />}
                Generate artwork
              </Button>
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
                          {FORMAT_LABELS[(row.format as AssetFormat)] || row.format} · {formatDateTime(row.created_at)}
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
                  {qrSrc(qrChoice) && (
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
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => handleDownload('png')} disabled={!image}>
                <Download className="h-3.5 w-3.5 mr-1" /> PNG
              </Button>
              {format === 'poster' && (
                <Button size="sm" variant="outline" onClick={() => handleDownload('pdf')} disabled={!image}>
                  <Download className="h-3.5 w-3.5 mr-1" /> PDF
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handleGenerateImage} disabled={imgLoading}>
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Regenerate image
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Copy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Headline</Label>
              <Input className="h-8 text-xs" value={copyData.headline} onChange={(e) => setCopyData({ ...copyData, headline: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Subheadline</Label>
              <Input className="h-8 text-xs" value={copyData.subheadline} onChange={(e) => setCopyData({ ...copyData, subheadline: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Body</Label>
              <Textarea className="text-xs min-h-[70px]" value={copyData.body} onChange={(e) => setCopyData({ ...copyData, body: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Instagram caption</Label>
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
