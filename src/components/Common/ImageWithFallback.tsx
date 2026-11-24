import React, { useState, useEffect } from 'react';
import { Compass } from 'lucide-react';

interface ImageWithFallbackProps {
  src?: string;
  alt: string;
  title?: string;
  className?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  title,
  className = 'w-full h-full object-cover',
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#0B1D33] via-[#0F4C5C] to-[#0D7377] text-white p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Compass className="h-8 w-8 text-white/80 mb-2" />
        <span className="text-xs font-medium text-white/90 line-clamp-1">
          {title || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
