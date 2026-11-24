import React, { useState, useCallback } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  Pin,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';

export interface MapPinPoint {
  id: string;
  title: string;
  subtitle?: string;
  lat: number;
  lng: number;
}

interface DestinationMapProps {
  points: MapPinPoint[];
  selectedId?: string | null;
  onSelectPoint?: (id: string) => void;
  heightClass?: string;
  defaultCenter?: { lat: number; lng: number };
  defaultZoom?: number;
}

function MarkerItem({
  point,
  isSelected,
  onSelect,
}: {
  point: MapPinPoint;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);

  const handleClick = useCallback(() => {
    setOpen((prev) => !prev);
    onSelect(point.id);
  }, [onSelect, point.id]);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: point.lat, lng: point.lng }}
        onClick={handleClick}
        title={point.title}
      >
        <Pin
          background={isSelected ? '#0B1D33' : '#0D7377'}
          borderColor="#FFFFFF"
          glyphColor="#FFFFFF"
          scale={isSelected ? 1.25 : 1}
        />
      </AdvancedMarker>
      {(open || isSelected) && marker && (
        <InfoWindow anchor={marker} onCloseClick={() => setOpen(false)} maxWidth={220}>
          <div className="p-1 text-slate-900">
            <p className="font-semibold text-sm">{point.title}</p>
            {point.subtitle && <p className="text-xs text-slate-600 mt-0.5">{point.subtitle}</p>}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export const DestinationMap: React.FC<DestinationMapProps> = ({
  points,
  selectedId,
  onSelectPoint,
  heightClass = 'h-[420px]',
  defaultCenter,
  defaultZoom = 4,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  const validPoints = points.filter(
    (p) => typeof p.lat === 'number' && typeof p.lng === 'number' && !Number.isNaN(p.lat) && !Number.isNaN(p.lng)
  );

  const center =
    defaultCenter ||
    (validPoints.length > 0
      ? { lat: validPoints[0].lat, lng: validPoints[0].lng }
      : { lat: 23.8103, lng: 90.4125 });

  if (!apiKey) {
    return (
      <div
        className={`${heightClass} w-full rounded-xl border border-slate-200 bg-[#F4F1EA] flex flex-col items-center justify-center p-6 text-center`}
      >
        <MapPin className="h-9 w-9 text-[#0D7377] mb-3" />
        <p className="font-display font-semibold text-slate-900 text-base">
          Interactive Destination Coordinates Ready
        </p>
        <p className="text-sm text-slate-600 max-w-md mt-1">
          Configure <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-slate-200">VITE_GOOGLE_MAPS_API_KEY</code> in your environment to render live Google Maps tiles.
        </p>
        {validPoints.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-xl">
            {validPoints.slice(0, 6).map((pt) => (
              <button
                key={pt.id}
                type="button"
                onClick={() => onSelectPoint?.(pt.id)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 hover:border-[#0D7377] transition-colors font-mono tabular-nums"
              >
                {pt.title} ({pt.lat.toFixed(2)}, {pt.lng.toFixed(2)})
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${heightClass} w-full rounded-xl overflow-hidden border border-slate-200`}>
      <APIProvider apiKey={apiKey} language="en" region="US" libraries={['marker']}>
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={center}
          defaultZoom={defaultZoom}
          gestureHandling="greedy"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
        >
          {validPoints.map((pt) => (
            <MarkerItem
              key={pt.id}
              point={pt}
              isSelected={selectedId === pt.id}
              onSelect={(id) => onSelectPoint?.(id)}
            />
          ))}
        </GoogleMap>
      </APIProvider>
    </div>
  );
};
