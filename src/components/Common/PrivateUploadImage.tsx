import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/api';

interface PrivateUploadImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const PrivateUploadImage: React.FC<PrivateUploadImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
}) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    if (!src) {
      setResolvedUrl('');
      return;
    }

    if (!src.startsWith('/api/uploads/')) {
      setResolvedUrl(src);
      return;
    }

    const fileId = src.replace('/api/uploads/', '').trim();
    apiClient
      .get(`/uploads/${fileId}`, { responseType: 'blob' })
      .then((res) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(res.data as Blob);
        setResolvedUrl(objectUrl);
      })
      .catch(() => {
        if (active) setResolvedUrl('');
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!resolvedUrl) {
    return <div className={`bg-slate-100 animate-pulse ${className}`} aria-label={alt} />;
  }

  return <img src={resolvedUrl} alt={alt} className={className} />;
};
