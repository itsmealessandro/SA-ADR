import { divIcon } from 'leaflet';
import type { LucideIcon } from 'lucide-react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

interface IconOptions {
  color?: string;
  backgroundColor?: string;
  size?: number;
}

export function createLucideIcon(
  Icon: LucideIcon,
  options: IconOptions = {}
): L.DivIcon {
  const {
    color = '#fff',
    backgroundColor = '#3b82f6',
    size = 32,
  } = options;

  // Create temporary div to render React component
  const tempDiv = document.createElement('div');
  const root = createRoot(tempDiv);
  
  flushSync(() => {
    root.render(
      <div
        style={{
          backgroundColor,
          borderRadius: '50%',
          width: `${size}px`,
          height: `${size}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        <Icon
          size={size * 0.6}
          color={color}
          strokeWidth={2.5}
        />
      </div>
    );
  });

  const iconHtml = tempDiv.innerHTML;

  return divIcon({
    html: iconHtml,
    className: 'custom-marker-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}
