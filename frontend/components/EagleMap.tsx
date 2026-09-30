import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
const LOT_LABEL_OFFSETS: Record<string, { latitude: number; longitude: number }> = {
  'Lot 3': { latitude: -0.000108, longitude: 0 },
  'Lot 2': { latitude: -0.000109, longitude: 0 },
  'Lot 5': { latitude: -0.00015, longitude: 0 },
  'Lot 19': { latitude: -0.0001, longitude: 0 },
  'Lot 20': { latitude: 0, longitude: 0.0018 },
  'Lot 23': { latitude: -0.00015, longitude: 0 },
  'Lot 31': { latitude: -0.00015, longitude: 0 },
};
function getLotNumberLabel(lot: any): string {
  const rawName = String(lot?.name || lot?.lot_name || '').trim();
  const rawTag = String(lot?.tag || '').trim();
  const rawId = String(lot?.id || '').trim();
  const combined = `${rawName} ${rawTag} ${rawId}`.toLowerCase();

  if (combined.includes('highland') && combined.includes('garage')) return 'HSG';
  if (combined.includes('union circle') && combined.includes('garage')) return 'UCG';
  if (combined === 'hsg' || rawId.toLowerCase() === 'hsg' || rawTag.toUpperCase() === 'HSG') return 'HSG';
  if (combined.includes('ucg') || rawTag.toUpperCase() === 'UCG' || rawId.toLowerCase() === 'ucg') return 'UCG';

  const match = /lot\s*(\d+)/i.exec(rawName);
  if (match) return `Lot ${match[1]}`;
  if (/^\d+$/.test(rawTag)) return `Lot ${rawTag}`;
  if (/^\d+$/.test(rawId)) return `Lot ${rawId}`;
  return '';
}

function pointInPolygon(point: { latitude: number; longitude: number }, polygon: { latitude: number; longitude: number }[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].latitude;
    const yi = polygon[i].longitude;
    const xj = polygon[j].latitude;
    const yj = polygon[j].longitude;
    const intersects =
      ((yi > point.longitude) !== (yj > point.longitude)) &&
      (point.latitude < ((xj - xi) * (point.longitude - yi)) / ((yj - yi) || 1) + xi);
    if (intersects) inside = !inside;
    }
    
    return inside;
}
function getPolygonCenter(coordinates: { latitude: number; longitude: number }[]) {
  if (coordinates.length === 0) return null;
  const latitudes = coordinates.map((point) => point.latitude);
  const longitudes = coordinates.map((point) => point.longitude);
  return {
    latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
    longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
  };
}

function doesLabelFitLot(
  label: string,
  coordinate: { latitude: number; longitude: number },
  polygon: { latitude: number; longitude: number }[],
  fontSize: number,
  mapSize: { width: number; height: number },
  region: { latitudeDelta: number; longitudeDelta: number },
) {
  if (!mapSize.width || !mapSize.height || !region.latitudeDelta || !region.longitudeDelta) return false;
  const labelWidth = label.length * fontSize * 0.68 + 8;
  const labelHeight = fontSize + 6;
  const halfLatitude = (labelHeight / 2) * region.latitudeDelta / mapSize.height;
  const halfLongitude = (labelWidth / 2) * region.longitudeDelta / mapSize.width;
  for (let row = 0; row <= 2; row++) {
    for (let column = 0; column <= 4; column++) {
      const point = {
        latitude: coordinate.latitude + (1 - row) * halfLatitude,
        longitude: coordinate.longitude + (column / 2 - 1) * halfLongitude,
      };
      if (!pointInPolygon(point, polygon)) return false;
    }
  }
  return true;
}

function getLotLabelCoordinate(
  coordinates: { latitude: number; longitude: number }[],
  label: string,
  fontSize: number,
  mapSize: { width: number; height: number },
  region: { latitudeDelta: number; longitudeDelta: number },
) {
  if (!coordinates || coordinates.length === 0) return null;
  const latitudes = coordinates.map((point) => point.latitude);
  const longitudes = coordinates.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const latStep = (maxLat - minLat) / 10;
  const lngStep = (maxLng - minLng) / 10;
  const candidates: { latitude: number; longitude: number }[] = [];
  for (let row = 1; row <= 9; row++) {
    for (let col = 1; col <= 9; col++) {
      const latitude = minLat + row * latStep;
      const longitude = minLng + col * lngStep;
      candidates.push({ latitude, longitude });
    }
  }
  const fittingCandidates = candidates.filter((point) =>
    pointInPolygon(point, coordinates) &&
    doesLabelFitLot(label, point, coordinates, fontSize, mapSize, region)
  );
  return fittingCandidates.sort((a, b) => {
    const distanceA = Math.abs(a.latitude - centerLat) + Math.abs(a.longitude - centerLng);
    const distanceB = Math.abs(b.latitude - centerLat) + Math.abs(b.longitude - centerLng);
    return distanceA - distanceB;
  })[0] || null;
}
const labelFontSize = Math.max(10, Math.min(15, 15 - mapRegion.latitudeDelta * 500));

