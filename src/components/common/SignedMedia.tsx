/**
 * Helpers to display media stored in (now-private) Supabase buckets.
 * They accept a stored URL (which may be an old public-format URL)
 * and resolve it to a short-lived signed URL when needed.
 */
import { useEffect, useState, ImgHTMLAttributes, AnchorHTMLAttributes } from 'react';
import { resolveStorageUrl } from '@/utils/storageUrl';

export const useResolvedUrl = (storedUrl?: string | null): string | null => {
  const [resolved, setResolved] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!storedUrl) {
      setResolved(null);
      return;
    }
    resolveStorageUrl(storedUrl).then((u) => {
      if (!cancelled) setResolved(u);
    });
    return () => {
      cancelled = true;
    };
  }, [storedUrl]);

  return resolved;
};

interface SignedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallback?: React.ReactNode;
}

export const SignedImage = ({ src, fallback = null, ...rest }: SignedImageProps) => {
  const resolved = useResolvedUrl(src);
  if (!resolved) return <>{fallback}</>;
  return <img src={resolved} {...rest} />;
};

interface SignedLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href?: string | null;
  children: React.ReactNode;
}

export const SignedLink = ({ href, children, onClick, ...rest }: SignedLinkProps) => {
  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);
    if (e.defaultPrevented) return;
    if (!href) return;
    e.preventDefault();
    const resolved = await resolveStorageUrl(href);
    if (resolved) window.open(resolved, rest.target ?? '_blank', 'noopener,noreferrer');
  };
  return (
    <a href={href ?? '#'} {...rest} onClick={handleClick}>
      {children}
    </a>
  );
};

/** Open a stored URL in a new tab, resolving signed URL if needed. */
export const openSignedUrl = async (storedUrl?: string | null) => {
  if (!storedUrl) return;
  const resolved = await resolveStorageUrl(storedUrl);
  if (resolved) window.open(resolved, '_blank', 'noopener,noreferrer');
};
