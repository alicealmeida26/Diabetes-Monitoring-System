'use client';
import Toast from '@/components/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useState, useEffect, useMemo } from 'react';
import {
  MapPin, Plus, Calendar, User, Home, Hash, Search, Edit2, X, Save,
  DoorOpen, LocateFixed, Bell, AlertTriangle, Users, Clock, CheckCircle,
  BarChart2, Activity
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';

type Condicao = 'hipertenso' | 'diabetico' | 'gravidez' | '';
type Tab = 'cadastro' | 'dashboard';

interface Patient {
  id: number;
  nomes: string;
  condicao: Condicao;
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

const parseDateBR = (dateStr: string): Date => {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return new Date(0);
  return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
};

const daysSince = (dateStr: string): number => {
  const date = parseDateBR(dateStr);
  return Math.floor((new Date().getTime() - date.getTime()) / 86400000);
};

const formatDaysAgo = (days: number): string => {
  if (days === 0) return 'hoje';
  if (days === 1) return 'há 1 dia';
  if (days < 7) return `há ${days} dias`;
  if (days < 14) return 'há 1 semana';
  if (days < 30) return `há ${Math.floor(days / 7)} semanas`;
  if (days < 60) return 'há 1 mês';
  if (days < 365) return `há ${Math.floor(days / 30)} meses`;
  return `há ${Math.floor(days / 365)} ano${Math.floor(days / 365) > 1 ? 's' : ''}`;
};

export default function Page() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('cadastro');
  const [notifiedPatients, setNotifiedPatients] = useState<Set<number>>(new Set());
  const [sendingReminder, setSendingReminder] = useState<number | null>(null);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) router.push('/login');
  }, [router]);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [streets, setStreets] = useState<string[]>([]);
  const [filteredStreets, setFilteredStreets] = useState<string[]>([]);
  const [streetSearchTerm, setStreetSearchTerm] = useState('');
  const [showStreetDropdown, setShowStreetDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCondicoes, setSelectedCondicoes] = useState<Set<Condicao>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [confirmation, setConfirmation] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => setToast({ message, type });
  const showConfirmation = (title: string, message: string, onConfirm: () => void) => setConfirmation({ title, message, onConfirm });

  const [formData, setFormData] = useState({
    nomes: '', condicao: '' as Condicao, endereços: '', número: '', complemento: '', ultima_consulta: ''
  });

  useEffect(() => { fetchStreets(); fetchPatients(); }, []);

  useEffect(() => {
    if (streetSearchTerm.trim() === '') {
      setFilteredStreets(streets);
    } else {
      setFilteredStreets(streets.filter(s => s.toLowerCase().includes(streetSearchTerm.toLowerCase())));
    }
  }, [streetSearchTerm, streets]);

  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    setFilteredPatients(patients.filter(p => {
      const matchesText = term === '' || p.nomes.toLowerCase().includes(term) || p.endereços.toLowerCase().includes(term) || p.número.includes(term);
      const matchesCondicao = selectedCondicoes.size === 0 || selectedCondicoes.has(p.condicao);
      return matchesText && matchesCondicao;
    }));
  }, [searchTerm, selectedCondicoes, patients]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user');
      if (stored) {
        try { const p = JSON.parse(stored); setUserName(p.nome_completo || p.usuario || 'Usuário'); }
        catch { setUserName('Usuário'); }
      } else { setUserName('Usuário'); }
    }
  }, []);

  // --- Dashboard computeds ---
  const patientsNeedingAttention = useMemo(() =>
    patients.filter(p => daysSince(p.ultima_consulta) > 90)
      .sort((a, b) => daysSince(b.ultima_consulta) - daysSince(a.ultima_consulta)),
    [patients]);

  const recentPatients = useMemo(() =>
    [...patients].sort((a, b) => parseDateBR(b.ultima_consulta).getTime() - parseDateBR(a.ultima_consulta).getTime()).slice(0, 6),
    [patients]);

  const conditionCounts = useMemo(() => ({
    diabetico: patients.filter(p => p.condicao === 'diabetico').length,
    hipertenso: patients.filter(p => p.condicao === 'hipertenso').length,
    gravidez: patients.filter(p => p.condicao === 'gravidez').length,
  }), [patients]);

  const followUpRate = useMemo(() => {
    if (patients.length === 0) return 100;
    return Math.round((patients.filter(p => daysSince(p.ultima_consulta) <= 90).length / patients.length) * 100);
  }, [patients]);

  // --- Data fetchers ---
  const fetchStreets = async () => {
    try {
      const res = await fetch('/api/streets');
      const data = await res.json();
      if (data.success) {
        const names = data.data.map((s: Street) => s.nome);
        setStreets(names); setFilteredStreets(names);
      }
    } catch { showToast('Erro ao carregar ruas do banco de dados', 'error'); }
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/patients');
      const data = await res.json();
      if (data.success) { setPatients(data.data); setFilteredPatients(data.data); }
    } catch { showToast('Erro ao carregar pacientes', 'error'); }
    finally { setLoading(false); }
  };

  // --- Handlers ---
  const handleSelectStreet = (street: string) => {
    setFormData({ ...formData, endereços: street });
    setStreetSearchTerm(street);
    setShowStreetDropdown(false);
  };

  const handleSubmit = async () => {
    if (!formData.nomes || !formData.endereços || !formData.número || !formData.ultima_consulta) {
      showToast('Preencha todos os campos obrigatórios!', 'warning'); return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/patients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, ultima_consulta: formData.ultima_consulta.split('-').reverse().join('/') })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Paciente adicionado com sucesso!', 'success');
        setFormData({ nomes: '', condicao: '', endereços: '', número: '', complemento: '', ultima_consulta: '' });
        setStreetSearchTerm(''); fetchPatients();
      } else { showToast(data.message || 'Erro ao adicionar paciente', 'error'); }
    } catch { showToast('Erro ao adicionar paciente', 'error'); }
    finally { setLoading(false); }
  };

  const handleEdit = (patient: Patient) => {
    const [day, month, year] = patient.ultima_consulta.split('/');
    setEditingPatient({ ...patient, ultima_consulta: `${year}-${month}-${day}` });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPatient) return;
    try {
      setLoading(true);
      const res = await fetch('/api/patients', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editingPatient, ultima_consulta: editingPatient.ultima_consulta.split('-').reverse().join('/') })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Paciente atualizado com sucesso!', 'success');
        setIsEditing(false); setEditingPatient(null); fetchPatients();
      } else { showToast(data.message || 'Erro ao atualizar paciente', 'error'); }
    } catch { showToast('Erro ao atualizar paciente', 'error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    showConfirmation('Excluir Paciente', 'Tem certeza que deseja remover este paciente? Esta ação não pode ser desfeita.', async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/patients?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) { showToast('Paciente removido com sucesso!', 'success'); fetchPatients(); }
        else { showToast(data.message || 'Erro ao remover paciente', 'error'); }
      } catch { showToast('Erro ao remover paciente', 'error'); }
      finally { setLoading(false); }
    });
  };

  const handleSendReminder = async (patientId: number, patientName: string) => {
    setSendingReminder(patientId);
    await new Promise(r => setTimeout(r, 1200));
    setNotifiedPatients(prev => new Set([...prev, patientId]));
    setSendingReminder(null);
    showToast(`Lembrete enviado para ${patientName}!`, 'success');
  };

  // --- Helpers ---
  const conditionLabel = (c: Condicao) => {
    if (c === 'diabetico') return 'Diabético';
    if (c === 'hipertenso') return 'Hipertenso';
    if (c === 'gravidez') return 'Gestante';
    return 'Não informado';
  };

  const conditionStyle = (c: Condicao) => {
    if (c === 'diabetico') return 'bg-blue-100 text-blue-700';
    if (c === 'hipertenso') return 'bg-red-100 text-red-700';
    if (c === 'gravidez') return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">

        <header className="mb-8 mt-16 flex items-center gap-6">
          <Image src="/infobio.png" alt="Logo InfoBio" width={220} height={88} className="object-contain shrink-0" priority />
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">Cadastro e Monitoramento Geográfico de Pacientes</h1>
            <p className="text-gray-600">Sistema de mapa inteligente para acompanhamento de pacientes</p>
            <p className="text-sm font-medium text-indigo-500 mt-0.5 tracking-wide">Sistemas de Informação</p>
          </div>
        </header>

        {/* User bar */}
        <div className="mb-4 flex justify-end">
          <div className="bg-white rounded-lg shadow px-4 py-2 flex items-center gap-3">
            <User className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-700">{userName ?? 'Carregando...'}</span>
            <button onClick={() => { localStorage.removeItem('user'); router.push('/login'); }} className="text-sm text-red-600 hover:text-red-700 font-medium">
              Sair
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 bg-white rounded-xl shadow-lg p-1.5 flex gap-1">
          <button
            onClick={() => setActiveTab('cadastro')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'cadastro' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" />
            Cadastro de Pacientes
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Dashboard
            {patientsNeedingAttention.length > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'dashboard' ? 'bg-white text-indigo-600' : 'bg-red-500 text-white'
              }`}>
                {patientsNeedingAttention.length}
              </span>
            )}
          </button>
        </div>

        {/* ===================== TAB: CADASTRO ===================== */}
        {activeTab === 'cadastro' && (
          <>
            <div className="mb-6 bg-white rounded-xl shadow-lg p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar paciente por nome, endereço ou número"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 font-medium">Filtrar por condição:</span>
                {([
                  { value: 'diabetico', label: 'Diabético', bg: '#dbeafe', color: '#2563eb', ring: '#93c5fd' },
                  { value: 'hipertenso', label: 'Hipertenso', bg: '#fee2e2', color: '#dc2626', ring: '#fca5a5' },
                  { value: 'gravidez', label: 'Gravidez', bg: '#ede9fe', color: '#7c3aed', ring: '#c4b5fd' },
                ] as const).map(({ value, label, bg, color, ring }) => {
                  const active = selectedCondicoes.has(value);
                  return (
                    <button key={value}
                      onClick={() => setSelectedCondicoes(prev => { const n = new Set(prev); active ? n.delete(value) : n.add(value); return n; })}
                      style={{ backgroundColor: active ? bg : 'transparent', color: active ? color : '#6b7280', border: `2px solid ${active ? color : '#d1d5db'}`, outline: active ? `3px solid ${ring}` : 'none' }}
                      className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                    >{label}</button>
                  );
                })}
                {selectedCondicoes.size > 0 && (
                  <button onClick={() => setSelectedCondicoes(new Set())} className="px-3 py-1 rounded-full text-xs font-medium text-gray-400 border border-gray-200 hover:text-gray-600 transition-colors">
                    Limpar
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-indigo-800" />
                    Cadastrar Paciente
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1"><User className="w-3 h-3" />Nome</label>
                      <input type="text" value={formData.nomes} onChange={(e) => setFormData({ ...formData, nomes: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-transparent" placeholder="Nome do paciente" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Condição</label>
                      <select value={formData.condicao} onChange={(e) => setFormData({ ...formData, condicao: e.target.value as Condicao })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                        <option value="">Selecione...</option>
                        <option value="diabetico">Diabético</option>
                        <option value="hipertenso">Hipertenso</option>
                        <option value="gravidez">Gravidez</option>
                      </select>
                    </div>
                    <div className="relative">
                      <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1"><MapPin className="w-3 h-3" />Rua</label>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 z-10" />
                        <input type="text" value={streetSearchTerm}
                          onChange={(e) => { setStreetSearchTerm(e.target.value); setShowStreetDropdown(true); }}
                          onFocus={() => setShowStreetDropdown(true)}
                          className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-transparent" placeholder="Buscar rua..." />
                      </div>
                      {showStreetDropdown && filteredStreets.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto">
                          {filteredStreets.map((street) => (
                            <div key={street} onClick={() => handleSelectStreet(street)} className="px-3 py-1.5 hover:bg-indigo-50 cursor-pointer text-xs text-gray-700">{street}</div>
                          ))}
                        </div>
                      )}
                      {showStreetDropdown && streetSearchTerm && filteredStreets.length === 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
                          <p className="text-sm text-gray-500 text-center">Nenhuma rua encontrada</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1"><Home className="w-3 h-3" />Número</label>
                      <input type="text" value={formData.número} onChange={(e) => setFormData({ ...formData, número: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-transparent" placeholder="Nº" />
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1"><DoorOpen className="w-3 h-3" />Complemento</label>
                      <input type="text" value={formData.complemento} onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Apartamento, bloco (opcional)" />
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1"><Calendar className="w-3 h-3" />Data</label>
                      <input type="date" value={formData.ultima_consulta} onChange={(e) => setFormData({ ...formData, ultima_consulta: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-transparent" />
                    </div>
                    <button onClick={handleSubmit} disabled={loading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2 px-3 rounded transition-colors flex items-center justify-center gap-2 text-sm">
                      <Plus className="w-4 h-4" />
                      {loading ? 'Adicionando...' : 'Adicionar'}
                    </button>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-600">Total: <span className="font-semibold">{patients.length}</span> pacientes</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-lg p-6 h-full">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <LocateFixed className="w-5 h-5 text-indigo-600" />
                    Mapa de Localização
                  </h2>
                  <MapComponent patients={filteredPatients} onEdit={handleEdit} onDelete={handleDelete} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ===================== TAB: DASHBOARD ===================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-xl shadow-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pacientes</span>
                  <div className="bg-indigo-100 p-2 rounded-lg"><Users className="w-4 h-4 text-indigo-600" /></div>
                </div>
                <p className="text-3xl font-bold text-gray-800">{patients.length}</p>
                <p className="text-xs text-gray-500 mt-1">cadastrados</p>
              </div>

              <div className={`bg-white rounded-xl shadow-lg p-5 border-l-4 ${patientsNeedingAttention.length > 0 ? 'border-amber-400' : 'border-green-400'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Atenção</span>
                  <div className={`p-2 rounded-lg ${patientsNeedingAttention.length > 0 ? 'bg-amber-100' : 'bg-green-100'}`}>
                    {patientsNeedingAttention.length > 0
                      ? <AlertTriangle className="w-4 h-4 text-amber-600" />
                      : <CheckCircle className="w-4 h-4 text-green-600" />}
                  </div>
                </div>
                <p className={`text-3xl font-bold ${patientsNeedingAttention.length > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {patientsNeedingAttention.length}
                </p>
                <p className="text-xs text-gray-500 mt-1">sem consulta +3 meses</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Diabéticos</span>
                  <div className="bg-blue-100 p-2 rounded-lg"><Activity className="w-4 h-4 text-blue-600" /></div>
                </div>
                <p className="text-3xl font-bold text-blue-600">{conditionCounts.diabetico}</p>
                <p className="text-xs text-gray-500 mt-1">{patients.length > 0 ? Math.round((conditionCounts.diabetico / patients.length) * 100) : 0}% do total</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hipertensos</span>
                  <div className="bg-red-100 p-2 rounded-lg"><Activity className="w-4 h-4 text-red-600" /></div>
                </div>
                <p className="text-3xl font-bold text-red-600">{conditionCounts.hipertenso}</p>
                <p className="text-xs text-gray-500 mt-1">{patients.length > 0 ? Math.round((conditionCounts.hipertenso / patients.length) * 100) : 0}% do total</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gestantes</span>
                  <div className="bg-purple-100 p-2 rounded-lg"><Activity className="w-4 h-4 text-purple-600" /></div>
                </div>
                <p className="text-3xl font-bold text-purple-600">{conditionCounts.gravidez}</p>
                <p className="text-xs text-gray-500 mt-1">{patients.length > 0 ? Math.round((conditionCounts.gravidez / patients.length) * 100) : 0}% do total</p>
              </div>
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

              {/* Left: Attention list */}
              <div className="lg:col-span-3 bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h3 className="font-semibold text-gray-800">Pacientes sem consulta há mais de 3 meses</h3>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                    {patientsNeedingAttention.length} paciente{patientsNeedingAttention.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {patientsNeedingAttention.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="bg-green-100 p-4 rounded-full mb-4">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <p className="text-lg font-semibold text-gray-700">Todos em dia!</p>
                    <p className="text-sm text-gray-500 mt-1">Nenhum paciente sem consulta há mais de 3 meses.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-[460px] overflow-y-auto">
                    {patientsNeedingAttention.map(patient => {
                      const days = daysSince(patient.ultima_consulta);
                      const isUrgent = days > 180;
                      const isNotified = notifiedPatients.has(patient.id);
                      const isSending = sendingReminder === patient.id;
                      const initials = patient.nomes.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

                      return (
                        <div key={patient.id} className={`px-6 py-4 flex items-center gap-4 transition-colors ${isUrgent ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-amber-50/30'}`}>
                          <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isUrgent ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-medium text-gray-800 truncate">{patient.nomes}</p>
                              {isUrgent && <span className="shrink-0 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Urgente</span>}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full font-medium ${conditionStyle(patient.condicao)}`}>{conditionLabel(patient.condicao)}</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {patient.ultima_consulta} •{' '}
                                <span className={isUrgent ? 'text-red-500 font-medium' : 'text-amber-600 font-medium'}>{formatDaysAgo(days)}</span>
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => !isNotified && !isSending && handleSendReminder(patient.id, patient.nomes)}
                            disabled={isNotified || isSending}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              isNotified ? 'bg-green-50 text-green-600 border border-green-200 cursor-default'
                                : isSending ? 'bg-gray-100 text-gray-400 cursor-wait'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                            }`}
                          >
                            {isNotified ? (
                              <><CheckCircle className="w-3 h-3" /> Enviado</>
                            ) : isSending ? (
                              <><span className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin inline-block" /> Enviando</>
                            ) : (
                              <><Bell className="w-3 h-3" /> Lembrete</>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right column */}
              <div className="lg:col-span-2 space-y-6">

                {/* Condition distribution */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <BarChart2 className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-semibold text-gray-800">Distribuição por Condição</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: 'Diabéticos', count: conditionCounts.diabetico, bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' },
                      { label: 'Hipertensos', count: conditionCounts.hipertenso, bar: 'bg-red-500', badge: 'bg-red-100 text-red-700' },
                      { label: 'Gestantes', count: conditionCounts.gravidez, bar: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700' },
                    ].map(({ label, count, bar, badge }) => {
                      const pct = patients.length > 0 ? (count / patients.length) * 100 : 0;
                      return (
                        <div key={label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium text-gray-700">{label}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>{count}</span>
                              <span className="text-xs text-gray-400 w-8 text-right">{Math.round(pct)}%</span>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${bar}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-500">Taxa de acompanhamento</span>
                      <span className={`text-sm font-bold ${followUpRate >= 70 ? 'text-green-600' : followUpRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                        {followUpRate}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${followUpRate >= 70 ? 'bg-green-500' : followUpRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${followUpRate}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">pacientes com consulta nos últimos 3 meses</p>
                  </div>
                </div>

                {/* Recent consultations */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-semibold text-gray-800">Consultas Recentes</h3>
                  </div>
                  {recentPatients.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-400">Nenhuma consulta registrada</div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {recentPatients.map((patient, idx) => {
                        const days = daysSince(patient.ultima_consulta);
                        return (
                          <div key={patient.id} className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${idx === 0 ? 'bg-green-500' : days < 30 ? 'bg-blue-400' : days < 60 ? 'bg-amber-400' : 'bg-gray-300'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-700 truncate">{patient.nomes}</p>
                              <p className="text-xs text-gray-400">{patient.ultima_consulta}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${conditionStyle(patient.condicao)}`}>{conditionLabel(patient.condicao)}</span>
                              <span className="text-xs text-gray-400">{formatDaysAgo(days)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {isEditing && editingPatient && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full relative z-[10000]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-indigo-600" />
                  Editar Paciente
                </h2>
                <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"><User className="w-4 h-4" />Nome do Paciente</label>
                  <input type="text" value={editingPatient.nomes} onChange={(e) => setEditingPatient({ ...editingPatient, nomes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Condição</label>
                  <select value={editingPatient.condicao} onChange={(e) => setEditingPatient({ ...editingPatient, condicao: e.target.value as Condicao })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="">Selecione...</option>
                    <option value="diabetico">Diabético</option>
                    <option value="hipertenso">Hipertenso</option>
                    <option value="gravidez">Gravidez</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"><Home className="w-4 h-4" />Endereço</label>
                  <select value={editingPatient.endereços} onChange={(e) => setEditingPatient({ ...editingPatient, endereços: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    {streets.map((street) => <option key={street} value={street}>{street}</option>)}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"><Hash className="w-4 h-4" />Número</label>
                  <input type="text" value={editingPatient.número} onChange={(e) => setEditingPatient({ ...editingPatient, número: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"><DoorOpen className="w-4 h-4" />Complemento</label>
                  <input type="text" value={editingPatient.complemento || ''} onChange={(e) => setEditingPatient({ ...editingPatient, complemento: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Apto, bloco, etc (opcional)" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"><Calendar className="w-4 h-4" />Última Consulta</label>
                  <input type="date" value={editingPatient.ultima_consulta} onChange={(e) => setEditingPatient({ ...editingPatient, ultima_consulta: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setIsEditing(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleSaveEdit} disabled={loading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" />
                    {loading ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        {confirmation && (
          <ConfirmationModal
            title={confirmation.title} message={confirmation.message}
            confirmText="Sim, excluir" cancelText="Cancelar" type="danger"
            onConfirm={() => { confirmation.onConfirm(); setConfirmation(null); }}
            onCancel={() => setConfirmation(null)}
          />
        )}
      </div>
    </div>
  );
}
