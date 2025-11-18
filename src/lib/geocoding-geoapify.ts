// src/lib/geocoding-geoapify.ts

interface GeocodingResult {
  latitude: number;
  longitude: number;
  display_name?: string;
}

/**
 * Geocoding usando Geoapify
 * Melhor que Nominatim e NÃO PRECISA CARTÃO!
 */
export async function geocodeAddressGeoapify(
  rua: string,
  numero: string,
  bairro: string = 'Passo das Pedras',
  cidade: string = 'Porto Alegre',
  estado: string = 'RS',
  pais: string = 'Brasil'
): Promise<GeocodingResult | null> {
  
  try {
    const endereco = `${rua}, ${numero}, ${bairro}, ${cidade} - ${estado}, ${pais}`;
    
    console.log(`[Geoapify]  Buscando: ${endereco}`);
    
    const url = `https://api.geoapify.com/v1/geocode/search?` +
      `text=${encodeURIComponent(endereco)}` +
      `&apiKey=${process.env.GEOAPIFY_API_KEY}` +
      `&limit=1`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`[Geoapify] Erro HTTP: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      console.warn(`[Geoapify] Nenhum resultado para: ${endereco}`);
      
      // Tentar busca genérica
      return await geocodeGenericGeoapify(rua, bairro, cidade, estado, pais);
    }
    
    const result = data.features[0];
    const coords = result.geometry.coordinates; // [lng, lat]
    
    console.log(`[Geoapify] Coordenadas encontradas: ${coords[1]}, ${coords[0]}`);
    
    return {
      latitude: coords[1],
      longitude: coords[0],
      display_name: result.properties?.formatted
    };
    
  } catch (error) {
    console.error('[Geoapify] Erro:', error);
    return null;
  }
}

/**
 * Busca genérica
 */
async function geocodeGenericGeoapify(
  rua: string,
  bairro: string,
  cidade: string,
  estado: string,
  pais: string
): Promise<GeocodingResult | null> {
  
  try {
    const endereco = `${rua}, ${bairro}, ${cidade}, ${estado}, ${pais}`;
    
    console.log(`[Geoapify]  Busca genérica: ${endereco}`);
    
    const url = `https://api.geoapify.com/v1/geocode/search?` +
      `text=${encodeURIComponent(endereco)}` +
      `&apiKey=${process.env.GEOAPIFY_API_KEY}` +
      `&limit=1`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const result = data.features[0];
      const coords = result.geometry.coordinates;
      
      console.log(`[Geoapify] Coordenadas aproximadas: ${coords[1]}, ${coords[0]}`);
      
      return {
        latitude: coords[1],
        longitude: coords[0],
        display_name: result.properties?.formatted
      };
    }
    
    return null;
    
  } catch (error) {
    console.error('[Geoapify] Erro na busca genérica:', error);
    return null;
  }
}

export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    lat >= -30.2 && lat <= -29.9 &&
    lng >= -51.3 && lng <= -51.0
  );
}

export function decimalToDMS(lat: number, lng: number): string {
  const latAbs = Math.abs(lat);
  const latDeg = Math.floor(latAbs);
  const latMin = Math.floor((latAbs - latDeg) * 60);
  const latSec = ((latAbs - latDeg - latMin / 60) * 3600).toFixed(1);
  const latDir = lat >= 0 ? 'N' : 'S';
  
  const lngAbs = Math.abs(lng);
  const lngDeg = Math.floor(lngAbs);
  const lngMin = Math.floor((lngAbs - lngDeg) * 60);
  const lngSec = ((lngAbs - lngDeg - lngMin / 60) * 3600).toFixed(1);
  const lngDir = lng >= 0 ? 'E' : 'W';
  
  return `${latDeg}°${latMin.toString().padStart(2, '0')}'${latSec}"${latDir} ${lngDeg}°${lngMin.toString().padStart(2, '0')}'${lngSec}"${lngDir}`;
}