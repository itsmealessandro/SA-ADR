import {
  BuildingOfficeIcon,
  CloudIcon,
  SignalIcon,
  TruckIcon
} from '@heroicons/react/24/solid';
import { divIcon } from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';

interface IconOptions {
  color?: string;
  backgroundColor?: string;
  size?: number;
}

/**
 * Creates a Leaflet DivIcon with Heroicons SVG icons
 * This approach uses Heroicons library for consistent, high-quality icons
 */
export function createLucideIcon(
  iconName: string,
  options: IconOptions = {}
): L.DivIcon {
  const {
    color = '#fff',
    backgroundColor = '#3b82f6',
    size = 32,
  } = options;

  // Map icon names to Heroicons components
  const iconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
    radio: SignalIcon,
    bus: TruckIcon,
    cloud: CloudIcon,
    building: BuildingOfficeIcon,
  };

  const IconComponent = iconComponents[iconName] || SignalIcon;

  // Render the icon to static HTML with color applied via CSS
  const iconSvg = renderToStaticMarkup(
    <IconComponent className="w-full h-full" />
  );

  const iconHtml = `
    <div style="
      background-color: ${backgroundColor};
      border-radius: 50%;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      padding: ${size * 0.2}px;
      color: ${color};
    ">
      ${iconSvg}
    </div>
  `;

  return divIcon({
    html: iconHtml,
    className: 'custom-marker-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}
