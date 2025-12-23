import {
  AcademicCapIcon,
  BuildingOfficeIcon,
  CloudIcon,
  FireIcon,
  HeartIcon,
  HomeIcon,
  ServerIcon,
  ShieldCheckIcon,
  SignalIcon,
  SunIcon,
  TruckIcon,
  VideoCameraIcon,
  WifiIcon,
} from '@heroicons/react/24/solid';
import { divIcon } from 'leaflet';
import { AmbulanceIcon, BikeIcon, BusIcon, CarIcon } from 'lucide-react';
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
    // Sensors
    radio: SignalIcon,
    signal: SignalIcon,
    gauge: SignalIcon,
    
    // Transport - Different icons for each type
    bus: BusIcon,           // Bus uses truck icon
    truck: TruckIcon,         // Truck
    car: CarIcon,            // Car uses a simpler icon
    motorcycle: BikeIcon,   // Motorcycle uses signal (smaller)
    
    // Weather
    cloud: CloudIcon,
    sun: SunIcon,
    'cloud-rain': CloudIcon,
    'cloud-fog': CloudIcon,
    'cloud-snow': CloudIcon,
    'cloud-off': CloudIcon,
    
    // Buildings - use distinct icons
    building: BuildingOfficeIcon,
    home: HomeIcon,
    hospital: HeartIcon,
    'graduation-cap': AcademicCapIcon,
    church: BuildingOfficeIcon,
    briefcase: BuildingOfficeIcon,
    
    // Cameras
    video: VideoCameraIcon,
    camera: VideoCameraIcon,
    
    // Vehicles / Emergency - Distinct icons
    ambulance: AmbulanceIcon,           // Ambulance uses heart icon
    'fire-truck': FireIcon,         // Fire truck uses fire icon
    police: ShieldCheckIcon,        // Police uses shield icon
    siren: SignalIcon,
    
    // Gateway
    gateway: ServerIcon,
    server: ServerIcon,
    wifi: WifiIcon,
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
