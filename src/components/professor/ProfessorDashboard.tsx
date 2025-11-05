import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ClassList } from './ClassList'; // Componente filho que lista as turmas
import { AttendanceSession } from './AttendanceSession'; // Componente filho da sessão ativa
import { CreateClassModal } from './CreateClassModal'; // Componente para o novo modal
import {
  Plus,
  BookOpen,
  Loader2,
  List,
  History, // Ícone para o Histórico
  Users, // Ícone para contagem de alunos
  Clock, // Ícone para hora
} from 'lucide-react';
import type { Database } from '../../lib/database.types';

// O tipo 'Class' importado dos tipos do DB
type Class = Database['public']['Tables']['classes']['Row'];

// --- NOVO TIPO ---
// Este é o tipo de dado que esperamos do histórico
type SessionHistoryRecord = {
  id: string;
  started_at: string;
  ended_at: string | null;
  classes: { // Objeto 'classes' aninhado
    name: string;
    code: string;
  } | null;
  attendance_records: [ // Array de 'attendance_records'
    { count: number } // Com um objeto 'count' dentro
  ];
};

// ===================================================================
// 1. O DASHBOARD (O Orquestrador)
// ===================================================================

export function ProfessorDashboard() {
  const { profile } = useAuth();

  // Estados de controle do Dashboard
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  // --- NOVO ESTADO DE ABA ---
  const [activeView, setActiveView] = useState<'turmas' | 'historico'>(
    'turmas'
  );
  // --- FIM DO NOVO ESTADO ---

  const [classes, setClasses] = useState<Class[]>([]);

  useEffect(() => {
    // Carrega as turmas (para a aba 'turmas') quando o perfil carregar
    if (profile) {
      loadClasses();
    }
  }, [profile]);

  // Busca apenas as turmas associadas a este professor
  const loadClasses = async () => {
    if (!profile) return;
    
    setLoadingClasses(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('professor_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  // --- Funções de Controle de Sessão (Sem mudança) ---
  const handleStartSession = (sessionId: string) => {
    setActiveSession(sessionId);
  };

  const handleEndSession = () => {
    setActiveSession(null);
    setSelectedClass(null);
    loadClasses(); // Recarrega as turmas
  };

  // --- ROTEADOR DE UI PRINCIPAL ---

  // 1. Se uma sessão estiver ATIVA, renderiza a sessão (Prioridade Máxima)
  if (activeSession && selectedClass) {
    return (
      <AttendanceSession
        sessionId={activeSession}
        classData={selectedClass}
        onEnd={handleEndSession}
      />
    );
  }

  // 2. Se não houver sessão ativa, renderiza o Dashboard com Abas
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Cabeçalho do Dashboard */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Dashboard do Professor
            </h1>
            <p className="text-gray-600">
              Bem-vindo, {profile?.full_name}
            </p>
          </div>
          {/* O botão "Criar Turma" agora só aparece na aba de turmas */}
          {activeView === 'turmas' && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 sm:mt-0 inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Criar Turma
            </button>
          )}
        </div>

        {/* --- "RECHEIO": NAVEGAÇÃO POR ABAS --- */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              {/* Botão da Aba "Minhas Turmas" */}
              <button
                onClick={() => setActiveView('turmas')}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  activeView === 'turmas'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <List size={20} />
                  Minhas Turmas
                </div>
              </button>
              {/* Botão da Aba "Histórico de Chamadas" */}
              <button
                onClick={() => setActiveView('historico')}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  activeView === 'historico'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <History size={20} />
                  Histórico de Chamadas
                </div>
              </button>
            </div>
          </div>
        </div>
        {/* --- FIM DO RECHEIO --- */}

        {/* Conteúdo Principal (condicional à aba) */}
        <div className="mt-6">
          {activeView === 'turmas' && (
            <>
              {loadingClasses ? (
                <div className="flex items-center justify-center p-16">
                  <Loader2 className="animate-spin text-gray-600" size={24} />
                  <span className="ml-2 text-gray-600">Carregando turmas...</span>
                </div>
              ) : classes.length === 0 ? (
                // Estado Vazio (Nenhuma turma)
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Nenhuma turma cadastrada
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Clique em "Criar Turma" para começar.
                  </p>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={20} />
                    Criar Turma
                  </button>
                </div>
              ) : (
                // Lista de Turmas (Seu componente antigo)
                <ClassList
                  classes={classes}
                  onSelectClass={setSelectedClass}
                  onStartSession={handleStartSession}
                  onRefresh={loadClasses}
                />
              )}
            </>
          )}

          {/* --- "RECHEIO": RENDERIZAÇÃO DA ABA DE HISTÓRICO --- */}
          {activeView === 'historico' && (
            <SessionHistoryList professorId={profile!.id} />
          )}
          {/* --- FIM DO RECHEIO --- */}
        </div>
      </div>

      {/* O Modal de Criação (sem mudança) */}
      <CreateClassModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          loadClasses();
        }}
      />
    </div>
  );
}

// ===================================================================
// 2. O NOVO COMPONENTE: SessionHistoryList
// (Criado aqui dentro para manter em um só arquivo)
// ===================================================================

interface SessionHistoryListProps {
  professorId: string;
}

function SessionHistoryList({ professorId }: SessionHistoryListProps) {
  const [history, setHistory] = useState<SessionHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (professorId) {
      loadHistory();
    }
  }, [professorId]);

  /**
   * Esta consulta busca o histórico de sessões do professor.
   * 1. Filtra por 'professor_id'.
   * 2. Ordena pela mais recente.
   * 3. Faz "join" com 'classes' para pegar o nome da turma.
   * 4. Pede a 'contagem' (count) da tabela 'attendance_records'.
   */
  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select(`
          id,
          started_at,
          ended_at,
          classes(name, code),
          attendance_records(count)
        `)
        .eq('professor_id', professorId)
        .order('started_at', { ascending: false });

      if (error) throw error;
      setHistory(data as SessionHistoryRecord[]);
    } catch (error) {
      console.error('Error loading session history:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Renderização do Histórico ---

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="animate-spin text-gray-600" size={24} />
        <span className="ml-2 text-gray-600">Carregando histórico...</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <History className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Nenhuma chamada realizada
        </h2>
        <p className="text-gray-600">
          Quando você iniciar uma chamada pela aba "Minhas Turmas", ela aparecerá aqui.
        </p>
      </div>
    );
  }

  // Se houver histórico, renderiza a lista
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <ul className="divide-y divide-gray-200">
        {history.map((session) => (
          <li key={session.id} className="p-4 sm:p-6 hover:bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              {/* Informação da Turma */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {session.classes?.name || 'Turma não encontrada'}
                </h3>
                <p className="text-sm text-gray-600">
                  {session.classes?.code || ''}
                </p>
              </div>
              
              {/* Contagem de Alunos */}
              <div className="flex items-center gap-1 mt-2 sm:mt-0 text-gray-800">
                <Users size={18} />
                <span className="text-lg font-bold">
                  {session.attendance_records[0]?.count || 0}
                </span>
                <span className="text-sm">alunos presentes</span>
              </div>
            </div>
            
            {/* Informações de Data e Hora */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mt-3">
              <div className="flex items-center gap-1">
                <Clock size={16} />
                <span>
                  {new Date(session.started_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                  {' - '}
                  {new Date(session.started_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}