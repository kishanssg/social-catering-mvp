import React from 'react';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number; // px
}

export function Avatar({ name, src, size = 40 }: AvatarProps) {
  const [error, setError] = React.useState(false);
  const initials = (name || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('') || 'UW';

  const dimension = { width: size, height: size, minWidth: size } as React.CSSProperties;

  return (
    <div
      className="rounded-full overflow-hidden bg-gray-200 flex items-center justify-center ring-1 ring-gray-300"
      style={dimension}
      aria-label={name}
    >
      {src && !error ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="text-gray-600 text-sm font-medium select-none">{initials}</span>
      )}
    </div>
  );
}


