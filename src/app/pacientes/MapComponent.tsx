'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Hospital, User, Edit, Trash2 } from 'lucide-react';
import { renderToString } from 'react-dom/server';
import { useState } from 'react';

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
const healthIcon = createLucideIcon(Hospital, '#ffffff', 36, '#ce1919ff');
const patientIcon = createLucideIcon(User, '#ffffff', 20, '#0850c4ff');

interface Patient {
  id: number;
  nomes: string;
  endereços: string;
  número: string;
  complemento?: string;
  ultima_consulta: string;
  lat?: number;
  lng?: number;
}

interface MapComponentProps {
  patients: Patient[];
  onEdit?: (patient: Patient) => void;
  onDelete?: (patientId: number) => Promise<void>;
}

export default function MapComponent({ patients, onEdit, onDelete }: MapComponentProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const healthUnitPosition: [number, number] = [-30.01714, -51.12678];
  const patientsWithCoords = patients.filter(p => p.lat && p.lng);

  const handleDelete = async (patient: Patient) => {
    if (!confirm(`Tem certeza que deseja excluir o paciente ${patient.nomes}?`)) {
      return;
    }

    setDeletingId(patient.id);
    
    try {
      if (onDelete) {
        await onDelete(patient.id);
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (patient: Patient) => {
    if (onEdit) {
      // Converter data para formato de edição
      const [day, month, year] = patient.ultima_consulta.split('/');
      const dataFormatada = `${year}-${month}-${day}`;
      
      onEdit({
        ...patient,
        ultima_consulta: dataFormatada
      });
    }
  };

  return (
    <>
      <style jsx global>{`
        .lucide-marker-icon {
          background: transparent !important;
          border: none !important;
        }
        
        .leaflet-popup-content-wrapper {
          padding: 0;
          border-radius: 8px;
        }
        
        .leaflet-popup-content {
          margin: 0;
          min-width: 220px;
        }
        
        .patient-popup-container {
          padding: 12px;
        }
        
        .patient-popup-buttons {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
        }
        
        .patient-popup-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }
        
        .patient-popup-btn-edit {
          background-color: #3b82f6;
          color: white;
        }
        
        .patient-popup-btn-edit:hover {
          background-color: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
        }
        
        .patient-popup-btn-delete {
          background-color: #ef4444;
          color: white;
        }
        
        .patient-popup-btn-delete:hover {
          background-color: #dc2626;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
        }
        
        .patient-popup-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }
        
        .patient-name {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 4px;
          font-size: 14px;
        }
        
        .patient-address {
          color: #4b5563;
          margin-bottom: 4px;
          font-size: 13px;
        }
        
        .patient-date {
          color: #6b7280;
          font-size: 12px;
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
            <div className="text-sm p-2">
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
              <div className="patient-popup-container">
                <div className="patient-name">{patient.nomes}</div>
                <div className="patient-address">
                  {patient.endereços}, {patient.número}
                  {patient.complemento && ` - ${patient.complemento}`}
                </div>
                <div className="patient-date">
                  Última consulta: {patient.ultima_consulta}
                </div>
                
                {/* Botões de Ação */}
                <div className="patient-popup-buttons">
                  <button
                    className="patient-popup-btn patient-popup-btn-edit"
                    onClick={() => handleEdit(patient)}
                    title="Editar paciente"
                  >
                    <Edit size={14} />
                    Editar
                  </button>
                  
                  <button
                    className="patient-popup-btn patient-popup-btn-delete"
                    onClick={() => handleDelete(patient)}
                    disabled={deletingId === patient.id}
                    title="Excluir paciente"
                  >
                    <Trash2 size={14} />
                    {deletingId === patient.id ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  );
}