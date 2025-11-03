'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Corrigir ícones do Leaflet (bug conhecido)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Ícone personalizado VERMELHO para a Unidade de Saúde
const healthUnitIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Patient {
  id: number;
  nomes: string;
  endereços: string;
  número: string;
  ultima_consulta: string;
  lat?: number;
  lng?: number;
}

interface MapComponentProps {
  patients: Patient[];
}

export default function MapComponent({ patients }: MapComponentProps) {
  // Centro do mapa - Unidade de Saúde Passo das Pedras I
  const healthUnitPosition: [number, number] = [-30.01774, -51.12512];

  // Filtrar apenas pacientes com coordenadas
  const patientsWithCoords = patients.filter(p => p.lat && p.lng);

  return (
    <MapContainer
      center={healthUnitPosition}
      zoom={15}
      style={{ height: '500px', width: '100%', borderRadius: '0.5rem' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Marcador da Unidade de Saúde - VERMELHO */}
      <Marker
        position={healthUnitPosition}
        icon={healthUnitIcon}
      >
        <Popup>
          <div className="text-sm">
            <p className="font-bold text-red-600">🏥 Unidade de Saúde</p>
            <p className="text-gray-800 font-semibold">Passo das Pedras I</p>
            <p className="text-gray-600 text-xs mt-1">
              Rua Gomes de Carvalho, 510
            </p>
          </div>
        </Popup>
      </Marker>

      {/* Marcadores dos Pacientes - AZUL (padrão) */}
      {patientsWithCoords.map((patient) => (
        <Marker
          key={patient.id}
          position={[patient.lat!, patient.lng!]}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-bold text-gray-800">{patient.nomes}</p>
              <p className="text-gray-600">{patient.endereços}, {patient.número}</p>
              <p className="text-gray-500 text-xs mt-1">
                Última consulta: {patient.ultima_consulta}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}