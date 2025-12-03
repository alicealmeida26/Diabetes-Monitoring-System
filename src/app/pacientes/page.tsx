'use client';
import Toast from '@/components/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useState, useEffect } from 'react';
import { MapPin, Plus, Calendar, User, Home, Hash, Search, Edit2, Trash2, X, Save, DoorOpen, LocateFixed } from 'lucide-react';
import { useRouter } from 'next/navigation';  
import dynamic from 'next/dynamic';
import Image from 'next/image';

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

interface Street {
  id: number;
  nome: string;
  tipo_logradouro: string;
}

const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
      <p className="text-gray-500">Carregando mapa...</p>
    </div>
  ),
});

export default function Page() {
  const router = useRouter();
  
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      router.push('/login');
    }
  }, [router]);
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [streets, setStreets] = useState<string[]>([]);
  const [filteredStreets, setFilteredStreets] = useState<string[]>([]);
  const [streetSearchTerm, setStreetSearchTerm] = useState('');
  const [showStreetDropdown, setShowStreetDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);

  const [confirmation, setConfirmation] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ message, type });
  };

  const showConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmation({ title, message, onConfirm });
  };

  const [formData, setFormData] = useState({
    nomes: '',
    endereços: '',
    número: '',
    complemento: '',
    ultima_consulta: ''
  });

  useEffect(() => {
    fetchStreets();
    fetchPatients();
  }, []);

  useEffect(() => {
    if (streetSearchTerm.trim() === '') {
      setFilteredStreets(streets);
    } else {
      const filtered = streets.filter(street =>
        street.toLowerCase().includes(streetSearchTerm.toLowerCase())
      );
      setFilteredStreets(filtered);
    }
  }, [streetSearchTerm, streets]);

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUserName(parsed.nome_completo || parsed.usuario || 'Usuário');
        } catch {
          setUserName('Usuário');
        }
      } else {
        setUserName('Usuário');
      }
    }
  }, []);

  const fetchStreets = async () => {
    try {
      const response = await fetch('/api/streets');
      const data = await response.json();
      
      if (data.success) {
        const streetNames = data.data.map((s: Street) => s.nome);
        setStreets(streetNames);
        setFilteredStreets(streetNames);
      }
    } catch (error) {
      console.error('Erro ao carregar ruas:', error);
      showToast('Erro ao carregar ruas do banco de dados', 'error');
    }
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/patients');
      const data = await response.json();
      
      if (data.success) {
        setPatients(data.data);
        setFilteredPatients(data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      showToast('Erro ao carregar pacientes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStreet = (street: string) => {
    setFormData({ ...formData, endereços: street });
    setStreetSearchTerm(street);
    setShowStreetDropdown(false);
  };

  const handleSubmit = async () => {
    if (formData.nomes && formData.endereços && formData.número && formData.ultima_consulta) {
      try {
        setLoading(true);
        
        const dataFormatada = formData.ultima_consulta.split('-').reverse().join('/');
        
        const response = await fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            ultima_consulta: dataFormatada
          })
        });

        const data = await response.json();

        if (data.success) {
          showToast('Paciente adicionado com sucesso!', 'success');
          setFormData({ nomes: '', endereços: '', número: '', complemento: '', ultima_consulta: '' });
          setStreetSearchTerm('');
          fetchPatients();
        } else {
          showToast(data.message || 'Erro ao adicionar paciente', 'error');
        }
      } catch (error) {
        console.error('Erro ao adicionar paciente:', error);
        showToast('Erro ao adicionar paciente', 'error');
      } finally {
        setLoading(false);
      }
    } else {
      showToast('Preencha todos os campos obrigatórios!', 'warning');
    }
  };

  const handleEdit = (patient: Patient) => {
    const [day, month, year] = patient.ultima_consulta.split('/');
    const dataFormatada = `${year}-${month}-${day}`;
    
    setEditingPatient({
      ...patient,
      ultima_consulta: dataFormatada
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPatient) return;

    try {
      setLoading(true);
      
      const dataFormatada = editingPatient.ultima_consulta.split('-').reverse().join('/');
      
      const response = await fetch('/api/patients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingPatient,
          ultima_consulta: dataFormatada
        })
      });

      const data = await response.json();

      if (data.success) {
        showToast('Paciente atualizado com sucesso!', 'success');
        setIsEditing(false);
        setEditingPatient(null);
        fetchPatients();
      } else {
        showToast(data.message || 'Erro ao atualizar paciente', 'error');
      }
    } catch (error) {
      console.error('Erro ao atualizar paciente:', error);
      showToast('Erro ao atualizar paciente', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    showConfirmation(
      'Excluir Paciente',
      'Tem certeza que deseja remover este paciente? Esta ação não pode ser desfeita.',
      async () => {
        try {
          setLoading(true);
          const response = await fetch(`/api/patients?id=${id}`, {
            method: 'DELETE'
          });

          const data = await response.json();

          if (data.success) {
            showToast('Paciente removido com sucesso!', 'success');
            fetchPatients();
          } else {
            showToast(data.message || 'Erro ao remover paciente', 'error');
          }
        } catch (error) {
          console.error('Erro ao remover paciente:', error);
          showToast('Erro ao remover paciente', 'error');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  return (
    <div className="min-h-screen h-screen overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Header compacto */}
        <header className="mb-3 text-center flex-shrink-0">
          <div className="flex justify-center mb-2">
            <Image
              src="/infobio.png"
              alt="Logo InfoBio"
              width={120}
              height={40}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-1">
            Monitoramento de Pacientes Diabéticos - US Passo das Pedras I
          </h1>
        </header>

        {/* Barra superior: Busca + User */}
        <div className="mb-3 flex gap-3 flex-shrink-0">
          {/* Busca */}
          <div className="flex-1 bg-white rounded-lg shadow px-3 py-2">
            <div className="relative">
              <Search className="absolute left-0 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar paciente, rua, endereço..."
                className="w-full pl-6 pr-2 py-1 text-sm border-0 focus:ring-0 focus:outline-none"
              />
            </div>
          </div>
          
          {/* User info */}
          <div className="bg-white rounded-lg shadow px-3 py-2 flex items-center gap-2 flex-shrink-0">
            <User className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-700">{userName ?? 'Carregando...'}</span>
            <button
              onClick={() => {
                localStorage.removeItem('user');
                router.push('/login');
              }}
              className="text-xs text-red-600 hover:text-red-700 font-medium ml-2"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Conteúdo principal - ocupa espaço restante */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
          {/* Formulário */}
          <div className="lg:col-span-1 overflow-y-auto">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                Cadastrar Paciente
              </h2>
              
              <div className="space-y-3">
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                    <User className="w-3 h-3" />
                    Nome
                  </label>
                  <input
                    type="text"
                    value={formData.nomes}
                    onChange={(e) => setFormData({ ...formData, nomes: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Nome do paciente"
                  />
                </div>

                <div className="relative">
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                    <MapPin className="w-3 h-3" />
                    Rua
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 z-10" />
                    <input
                      type="text"
                      value={streetSearchTerm}
                      onChange={(e) => {
                        setStreetSearchTerm(e.target.value);
                        setShowStreetDropdown(true);
                      }}
                      onFocus={() => setShowStreetDropdown(true)}
                      className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Buscar rua..."
                    />
                  </div>
                  
                  {showStreetDropdown && filteredStreets.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto">
                      {filteredStreets.map((street) => (
                        <div
                          key={street}
                          onClick={() => handleSelectStreet(street)}
                          className="px-3 py-1.5 hover:bg-indigo-50 cursor-pointer text-xs text-gray-700"
                        >
                          {street}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                    <Home className="w-3 h-3" />
                    Número
                  </label>
                  <input
                    type="text"
                    value={formData.número}
                    onChange={(e) => setFormData({ ...formData, número: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Nº"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                    <DoorOpen className="w-3 h-3" />
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={formData.complemento}
                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Opcional"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                    <Calendar className="w-3 h-3" />
                    Data
                  </label>
                  <input
                    type="date"
                    value={formData.ultima_consulta}
                    onChange={(e) => setFormData({ ...formData, ultima_consulta: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2 px-3 rounded transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  {loading ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  Total: <span className="font-semibold">{patients.length}</span> pacientes
                </p>
              </div>
            </div>
          </div>

          {/* Mapa */}
          <div className="lg:col-span-2 overflow-hidden">
            <div className="bg-white rounded-lg shadow p-4 h-full flex flex-col">
              
              
              <div className="flex-1 min-h-0">
                <MapComponent 
                  patients={filteredPatients}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Edição */}
        {isEditing && editingPatient && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full relative z-[10000]">
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
                    <DoorOpen className="w-4 h-4" />
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={editingPatient.complemento || ''}
                    onChange={(e) => setEditingPatient({ ...editingPatient, complemento: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Apto, bloco, etc (opcional)"
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

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {confirmation && (
          <ConfirmationModal
            title={confirmation.title}
            message={confirmation.message}
            confirmText="Sim, excluir"
            cancelText="Cancelar"
            onConfirm={() => {
              confirmation.onConfirm();
              setConfirmation(null);
            }}
            onCancel={() => setConfirmation(null)}
            type="danger"
          />
        )}
      </div>
    </div>
  );
}