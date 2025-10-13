'use client';

import { useState, useEffect } from 'react';
import { MapPin, Plus, Calendar, User, Home, Hash, Search, Edit2, Trash2, X, Save } from 'lucide-react';

interface Patient {
  id: number;
  nomes: string;
  endereços: string;
  número: string;
  ultima_consulta: string;
  lat?: number;
  lng?: number;
}

export default function Page() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nomes: '',
    endereços: '',
    número: '',
    ultima_consulta: ''
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

  // Carregar pacientes ao montar o componente
  useEffect(() => {
    fetchPatients();
  }, []);

  // Filtrar pacientes quando o termo de busca mudar
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPatients(patients);
    } else {
      const filtered = patients.filter(patient =>
        patient.nomes.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.endereços.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.número.includes(searchTerm)
      );
      setFilteredPatients(filtered);
    }
  }, [searchTerm, patients]);

  // Buscar pacientes da API
  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/patients');
      const data = await response.json();
      
      if (data.success) {
        const patientsWithCoords = data.data.map((p: Patient) => ({
          ...p,
          lat: Math.random() * 80 + 10,
          lng: Math.random() * 80 + 10
        }));
        setPatients(patientsWithCoords);
        setFilteredPatients(patientsWithCoords);
      }
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      alert('Erro ao carregar pacientes');
    } finally {
      setLoading(false);
    }
  };

  // Adicionar novo paciente
  const handleSubmit = async () => {
    if (formData.nomes && formData.endereços && formData.número && formData.ultima_consulta) {
      try {
        setLoading(true);
        const response = await fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
          alert('Paciente adicionado com sucesso!');
          setFormData({ nomes: '', endereços: '', número: '', ultima_consulta: '' });
          fetchPatients();
        } else {
          alert(data.message || 'Erro ao adicionar paciente');
        }
      } catch (error) {
        console.error('Erro ao adicionar paciente:', error);
        alert('Erro ao adicionar paciente');
      } finally {
        setLoading(false);
      }
    } else {
      alert('Preencha todos os campos!');
    }
  };

  // Abrir modal de edição
  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setIsEditing(true);
  };

  // Salvar edição
  const handleSaveEdit = async () => {
    if (!editingPatient) return;

    try {
      setLoading(true);
      const response = await fetch('/api/patients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPatient)
      });

      const data = await response.json();

      if (data.success) {
        alert('Paciente atualizado com sucesso!');
        setIsEditing(false);
        setEditingPatient(null);
        fetchPatients();
      } else {
        alert(data.message || 'Erro ao atualizar paciente');
      }
    } catch (error) {
      console.error('Erro ao atualizar paciente:', error);
      alert('Erro ao atualizar paciente');
    } finally {
      setLoading(false);
    }
  };

  // Deletar paciente
  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover este paciente?')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/patients?id=${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        alert('Paciente removido com sucesso!');
        fetchPatients();
      } else {
        alert(data.message || 'Erro ao remover paciente');
      }
    } catch (error) {
      console.error('Erro ao remover paciente:', error);
      alert('Erro ao remover paciente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Monitoramento de Pacientes Diabéticos Unidade de Saúde Passo das Pedras I
          </h1>
          <p className="text-gray-600">Sistema de localização e acompanhamento de pacientes diabéticos</p>
        </header>

        {/* Barra de Busca */}
        <div className="mb-6 bg-white rounded-xl shadow-lg p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar paciente por nome, endereço ou número..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Cadastrar Paciente
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4" />
                    Nome do Paciente
                  </label>
                  <input
                    type="text"
                    value={formData.nomes}
                    onChange={(e) => setFormData({ ...formData, nomes: e.target.value })}
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
                    value={formData.endereços}
                    onChange={(e) => setFormData({ ...formData, endereços: e.target.value })}
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
                    value={formData.número}
                    onChange={(e) => setFormData({ ...formData, número: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Número da casa"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4" />
                    Última Consulta
                  </label>
                  <input
                    type="date"
                    value={formData.ultima_consulta}
                    onChange={(e) => setFormData({ ...formData, ultima_consulta: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  {loading ? 'Adicionando...' : 'Adicionar Paciente'}
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
              
              <div className="relative bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg h-[400px] overflow-hidden mb-4">
                <svg className="w-full h-full">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(99, 102, 241, 0.1)" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  
                  {filteredPatients.map((patient) => (
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

              <div className="max-h-48 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Lista de Pacientes {searchTerm && `(${filteredPatients.length} resultado(s))`}
                </h3>
                <div className="space-y-2">
                  {filteredPatients.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      {loading ? 'Carregando...' : 'Nenhum paciente encontrado'}
                    </p>
                  ) : (
                    filteredPatients.map((patient) => (
                      <div key={patient.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-2 flex-1">
                          <MapPin className="w-4 h-4 text-indigo-600" />
                          <div>
                            <span className="font-medium text-gray-800 block">{patient.nomes}</span>
                            <span className="text-gray-600 text-xs">
                              {patient.endereços}, {patient.número}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(patient)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(patient.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Edição */}
        {isEditing && editingPatient && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-indigo-600" />
                  Editar Paciente
                </h2>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4" />
                    Nome do Paciente
                  </label>
                  <input
                    type="text"
                    value={editingPatient.nomes}
                    onChange={(e) => setEditingPatient({ ...editingPatient, nomes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Home className="w-4 h-4" />
                    Endereço
                  </label>
                  <select
                    value={editingPatient.endereços}
                    onChange={(e) => setEditingPatient({ ...editingPatient, endereços: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
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
                    value={editingPatient.número}
                    onChange={(e) => setEditingPatient({ ...editingPatient, número: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4" />
                    Última Consulta
                  </label>
                  <input
                    type="date"
                    value={editingPatient.ultima_consulta}
                    onChange={(e) => setEditingPatient({ ...editingPatient, ultima_consulta: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={loading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}