import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { getStreamToken } from '@/services/cctvService';
import { cn } from '@/lib/utils';

interface HlsPlayerProps {
  cameraId: string;
  className?: string;
  /** When true, requests a playback URL with this start timestamp. */
  playbackStart?: string;
}

const RETRY_DELAYS = [1000, 2000, 5000, 10000, 20000, 30000];

export const HlsPlayer: React.FC<HlsPlayerProps> = ({ cameraId, className, playbackStart }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryRef = useRef(0);
  const cancelRef = useRef(false);

  const [status, setStatus] = useState<'loading' | 'live' | 'reconnecting' | 'error' | 'unconfigured'>(
    'loading',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFrameAt, setLastFrameAt] = useState<Date | null>(null);

  const teardown = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
  }, []);

  const load = useCallback(async () => {
    if (!videoRef.current || cancelRef.current) return;
    setStatus(retryRef.current > 0 ? 'reconnecting' : 'loading');
    setErrorMessage(null);

    try {
      const token = await getStreamToken(cameraId, { playbackStart });
      if (cancelRef.current) return;

      if (!token) {
        setStatus('error');
        setErrorMessage('Failed to obtain stream URL.');
        return;
      }
      if ('error' in token && token.error === 'not_configured') {
        setStatus('unconfigured');
        setErrorMessage(token.message ?? 'CCTV server not configured.');
        return;
      }
      if ('error' in token) {
        setStatus('error');
        setErrorMessage((token as any).message ?? (token as any).error);
        return;
      }

      const url = (token as any).url as string;
      const video = videoRef.current;
      teardown();

      if (Hls.isSupported()) {
        const hls = new Hls({
          lowLatencyMode: true,
          backBufferLength: 30,
          maxBufferLength: 10,
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
          setStatus('live');
          retryRef.current = 0;
        });
        hls.on(Hls.Events.FRAG_LOADED, () => setLastFrameAt(new Date()));
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            scheduleRetry(data.details ?? data.type);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.addEventListener(
          'loadedmetadata',
          () => {
            video.play().catch(() => {});
            setStatus('live');
            retryRef.current = 0;
          },
          { once: true },
        );
        video.addEventListener('timeupdate', () => setLastFrameAt(new Date()));
        video.addEventListener('error', () => scheduleRetry('native_error'));
      } else {
        setStatus('error');
        setErrorMessage('HLS playback is not supported in this browser.');
      }
    } catch (err) {
      console.error('HlsPlayer load error:', err);
      scheduleRetry('load_failed');
    }
  }, [cameraId, playbackStart, teardown]);

  const scheduleRetry = useCallback(
    (reason: string) => {
      if (cancelRef.current) return;
      const delay = RETRY_DELAYS[Math.min(retryRef.current, RETRY_DELAYS.length - 1)];
      retryRef.current += 1;
      setStatus('reconnecting');
      setErrorMessage(`Stream interrupted (${reason}). Retrying in ${delay / 1000}s…`);
      setTimeout(() => {
        if (!cancelRef.current) load();
      }, delay);
    },
    [load],
  );

  useEffect(() => {
    cancelRef.current = false;
    load();
    return () => {
      cancelRef.current = true;
      teardown();
    };
  }, [load, teardown]);

  return (
    <div className={cn('relative w-full bg-black overflow-hidden rounded-md aspect-video', className)}>
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        controls
        className="w-full h-full object-contain bg-black"
      />

      {/* Status overlays */}
      {status === 'loading' && (
        <Overlay>
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-sm text-white/90">Connecting…</p>
        </Overlay>
      )}
      {status === 'reconnecting' && (
        <Overlay>
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-sm text-white/90">Reconnecting…</p>
          {errorMessage && <p className="text-xs text-white/60">{errorMessage}</p>}
        </Overlay>
      )}
      {status === 'unconfigured' && (
        <Overlay>
          <WifiOff className="h-8 w-8 text-white" />
          <p className="text-sm text-white/90 px-4 text-center">
            {errorMessage ?? 'Streaming server not yet configured.'}
          </p>
        </Overlay>
      )}
      {status === 'error' && (
        <Overlay>
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-white/90 px-4 text-center">{errorMessage ?? 'Stream error'}</p>
        </Overlay>
      )}

      {/* Live badge */}
      {status === 'live' && (
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs text-white">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          LIVE
        </div>
      )}
      {status === 'live' && lastFrameAt && (
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[10px] text-white/80 flex items-center gap-1">
          <Wifi className="h-3 w-3" />
          {lastFrameAt.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

const Overlay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 pointer-events-none">
    {children}
  </div>
);

export default HlsPlayer;
