'use client';

import { useState } from 'react';
import { MapPin, Plus, Calendar, User, Home, Hash } from 'lucide-react';

export default function Page() {
  const [patients, setPatients] = useState([
    { id: 1, name: 'Maria Silva', street: 'Rua das Flores', number: '123', date: '2025-10-10', lat: 35, lng: 20 },
    { id: 2, name: 'João Santos', street: 'Av. Principal', number: '456', date: '2025-10-11', lat: 45, lng: 35 },
    { id: 3, name: 'Ana Costa', street: 'Rua do Sol', number: '789', date: '2025-10-12', lat: 55, lng: 50 }
  ]);

  const [formData, setFormData] = useState({
    name: '',
    street: '',
    number: '',
    date: ''
  });

  const streets = [
    'Rua das Flores',
    'Av. Principal',
    'Rua do Sol',
    'Rua da Esperança',
    'Av. Central',
    'Rua dos Jardins',
    'Rua Santa Maria',
    'Av. Independência'
  ];

  const handleSubmit = () => {
    if (formData.name && formData.street && formData.number && formData.date) {
      const newPatient = {
        id: patients.length + 1,
        name: formData.name,
        street: formData.street,
        number: formData.number,
        date: formData.date,
        lat: Math.random() * 80 + 10,
        lng: Math.random() * 80 + 10
      };
      setPatients([...patients, newPatient]);
      setFormData({ name: '', street: '', number: '', date: '' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Monitoramento de Pacientes Diabéticos da Unidade Passo das Pedras I
          </h1>
          <p className="text-gray-600">Sistema de localização e acompanhamento de pacientes diabéticos</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Adicionar Paciente
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4" />
                    Nome do Paciente
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Digite o nome"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Home className="w-4 h-4" />
                    Endereço
                  </label>
                  <select
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Selecione uma rua</option>
                    {streets.map((street) => (
                      <option key={street} value={street}>
                        {street}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Hash className="w-4 h-4" />
                    Número
                  </label>
                  <input
                    type="text"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Número da casa"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4" />
                    Data da Consulta
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Cadastrar Paciente
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Total de Pacientes: {patients.length}
                </h3>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6 h-full">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                Mapa de Localização
              </h2>
              
              <div className="relative bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg h-[500px] overflow-hidden">
                <svg className="w-full h-full">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(99, 102, 241, 0.1)" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  
                  {patients.map((patient) => (
                    <g key={patient.id}>
                      <circle
                        cx={`${patient.lng}%`}
                        cy={`${patient.lat}%`}
                        r="8"
                        fill="#4F46E5"
                        className="cursor-pointer hover:fill-indigo-700 transition-colors"
                      />
                      <circle
                        cx={`${patient.lng}%`}
                        cy={`${patient.lat}%`}
                        r="14"
                        fill="none"
                        stroke="#4F46E5"
                        strokeWidth="2"
                        opacity="0.3"
                      />
                    </g>
                  ))}
                </svg>

                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-md">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                    <span className="text-gray-700">Localização de Pacientes</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 max-h-40 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Lista de Pacientes</h3>
                <div className="space-y-2">
                  {patients.map((patient) => (
                    <div key={patient.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-indigo-600" />
                        <span className="font-medium text-gray-800">{patient.name}</span>
                      </div>
                      <span className="text-gray-600">
                        {patient.street}, {patient.number}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}