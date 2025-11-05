import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
// import { QRService } from '../../services/qrService'; // O QRService não está sendo usado aqui
import { AttendanceService } from '../../services/attendanceService';
import { supabase } from '../../lib/supabase';
import { QRCodeDisplay } from './QRCodeDisplay';
import { ManualAttendance } from './ManualAttendance';
import { X, Users, QrCode, ClipboardList, Loader2 } from 'lucide-react';
import type { Database } from '../../lib/database.types';
import type { RealtimeChannel } from '@supabase/supabase-js';

// --- CORREÇÃO 1: Adicionar a definição de 'Class' ---
type Class = Database['public']['Tables']['classes']['Row'];

// --- TIPOS MELHORADOS ---
type SessionData =
  Database['public']['Tables']['attendance_sessions']['Row'];

// Este tipo é o que esperamos do 'AttendanceService.getSessionAttendance'
type AttendanceRecordWithProfile = {
  id: string;
  marked_at: string;
  method: 'qr_scan' | 'manual';
  student_id: string | null; // <-- CORREÇÃO 5 (Necessário para o map)
  profiles: {
    full_name: string;
    registration_number: string;
  } | null;
};

interface AttendanceSessionProps {
  sessionId: string;
  classData: Class;
  onEnd: () => void;
}

export function AttendanceSession({
  sessionId,
  classData,
  onEnd,
}: AttendanceSessionProps) {
  // O 'profile' do useAuth() não está sendo usado, pode ser removido se quiser.
  // const { profile } = useAuth(); 
  const [mode, setMode] = useState<'qr' | 'manual'>('qr');
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [attendanceList, setAttendanceList] = useState<
    AttendanceRecordWithProfile[]
  >([]);
  
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const initSessionAndListen = async () => {
      setLoading(true);
      
      // Carrega os dados da sessão e a lista de presença inicial em paralelo
      await Promise.all([
        loadSessionData(), 
        loadInitialAttendance()
      ]);
      
      // Começa a "ouvir" por NOVOS alunos
      subscribeToChanges(); 
      
      setLoading(false);
    };

    initSessionAndListen();

    // Função de limpeza
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sessionId]); // Roda sempre que o sessionId mudar

  // 1. Busca os dados da sessão
  const loadSessionData = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      setSession(data);
    } catch (error) {
      console.error('Error loading session data:', error);
    }
  };

  // 2. Busca a lista inicial de presentes
  const loadInitialAttendance = async () => {
    try {
      const records = await AttendanceService.getSessionAttendance(sessionId);
      setAttendanceList(records as AttendanceRecordWithProfile[]);
    } catch (error) {
      console.error('Error loading initial attendance:', error);
    }
  };

  // 3. "Ouve" por novas presenças (Realtime)
  const subscribeToChanges = () => {
    if (channelRef.current) return;

    const channel = supabase
      .channel(`session_attendance_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_records',
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          // 'payload.new' é o registro que acabou de ser inserido
          const newRecord = payload.new as Database['public']['Tables']['attendance_records']['Row'];

          // --- CORREÇÃO 2: Verificar se student_id não é nulo ---
          if (newRecord.student_id) { 
            // O payload.new não vem com o 'profiles'. Precisamos buscar.
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, registration_number')
              .eq('id', newRecord.student_id) // Agora é seguro
              .single();

            if (profileData) {
              // Adiciona o novo aluno à lista em tempo real!
              setAttendanceList((currentList) => [
                ...currentList,
                {
                  ...newRecord, // Espalha o novo registro
                  profiles: profileData, // Adiciona os dados do perfil
                },
              ]);
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  // Função para encerrar a sessão
  const handleEndSession = async () => {
    setEnding(true);
    try {
      // --- CORREÇÃO 3: (Garantia)
      // Este .update() deve funcionar se o supabase.ts estiver correto.
      await supabase
        .from('attendance_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', sessionId);
      
      onEnd();
    } catch (error) {
      console.error('Error ending session:', error);
    } finally {
      setEnding(false);
    }
  };

  // Função para o "Plano B" (Chamada Manual)
  const handleManualMark = async (studentId: string) => {
    if (!session) return;
    try {
      await AttendanceService.markAttendance(
        session.id,
        studentId,
        'manual',
        false // 'false' pois não requer geolocalização (é manual)
      );
      // Não precisamos do loadAttendance(), o Realtime vai pegar!
    } catch (error) {
      console.error('Error marking attendance:', error);
    }
  };

  if (loading || !session) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="flex flex-col items-center gap-2 text-gray-600">
          <Loader2 className="animate-spin" size={32} />
          Carregando sessão...
        </div>
      </div>
    );
  }

  // --- RENDERIZAÇÃO ---
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {classData.name}
            </h1>
            <p className="text-gray-600">
              <span className="font-bold text-blue-600">
                {attendanceList.length}
              </span>{' '}
              presença(s) registrada(s)
            </p>
          </div>
          <button
            onClick={handleEndSession}
            disabled={ending}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {ending ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <X size={20} />
            )}
            {ending ? 'Encerrando...' : 'Encerrar Chamada'}
          </button>
        </div>

        {/* Abas de Navegação (Seu código está perfeito) */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setMode('qr')}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  mode === 'qr'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <QrCode size={20} />
                  QR Code
                </div>
              </button>
              <button
                onClick={() => setMode('manual')}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  mode === 'manual'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <ClipboardList size={20} />
                  Chamada Manual
                </div>
              </button>
            </div>
          </div>

          {/* Conteúdo das Abas */}
          <div className="p-6">
            {mode === 'qr' ? (
              <QRCodeDisplay
                session={session}
                // --- CORREÇÃO 4: Passar a prop 'onRefresh' ---
                onRefresh={loadInitialAttendance}
              />
            ) : (
              <ManualAttendance
                classId={classData.id}
                sessionId={session.id}
                // --- CORREÇÃO 5: Usar 'student_id' ---
                markedStudents={attendanceList.map((r) => r.student_id || '')}
                onMarkAttendance={handleManualMark}
              />
            )}
          </div>
        </div>

        {/* Lista de Alunos Presentes (Seu código está perfeito) */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={20} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Lista de Presença (em tempo real)
            </h2>
          </div>

          {attendanceList.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              Nenhuma presença registrada ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {attendanceList.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {record.profiles?.full_name || 'Aluno não encontrado'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Matrícula:{' '}
                      {record.profiles?.registration_number || 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {new Date(record.marked_at).toLocaleTimeString('pt-BR')}
                    </p>
                    <p
                      className={`text-xs font-medium ${
                        record.method === 'manual'
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}
                    >
                      {record.method === 'manual' ? 'Manual' : 'QR Code'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}