'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Hospital, User } from 'lucide-react';
import { renderToString } from 'react-dom/server';

// Função para criar ícone Lucide
const createLucideIcon = (
  IconComponent: any,
  color: string,
  size: number,
  backgroundColor?: string
) => {
  const iconHtml = renderToString(
    <div style={{
      backgroundColor: backgroundColor || 'transparent',
      borderRadius: '50%',
      padding: backgroundColor ? '8px' : '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: backgroundColor ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'
    }}>
      <IconComponent 
        size={size} 
        color={color}
        strokeWidth={2.5}
      />
    </div>
  );

  return L.divIcon({
    html: iconHtml,
    className: 'lucide-marker-icon',
    iconSize: [size + 16, size + 16],
    iconAnchor: [(size + 16) / 2, (size + 16) / 2],
    popupAnchor: [0, -(size + 16) / 2]
  });
};

// Criar os ícones
const healthIcon = createLucideIcon(Hospital, '#ffffff', 36, '#ce1919ff'); // Vermelho
const patientIcon = createLucideIcon(User, '#ffffff', 20, '#0850c4ff'); // Azul


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
  const healthUnitPosition: [number, number] = [-30.01714, -51.12678];
  const patientsWithCoords = patients.filter(p => p.lat && p.lng);

  return (
    <>
      <style jsx global>{`
        .lucide-marker-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
      
      <MapContainer
        center={healthUnitPosition}
        zoom={15}
        style={{ height: '500px', width: '100%', borderRadius: '0.5rem' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Marcador da Unidade de Saúde */}
        <Marker position={healthUnitPosition} icon={healthIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-bold text-red-600">Unidade de Saúde</p>
              <p className="text-gray-800 font-semibold">Passo das Pedras I</p>
              <p className="text-gray-600 text-xs mt-1">
                Avenida Gomes de Carvalho, 510
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Marcadores dos Pacientes */}
        {patientsWithCoords.map((patient) => (
          <Marker
            key={patient.id}
            position={[patient.lat!, patient.lng!]}
            icon={patientIcon}
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
    </>
  );
}