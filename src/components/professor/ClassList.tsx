import { useState } from 'react';
import { BookOpen, MapPin, QrCode, Loader2, AlertTriangle } from 'lucide-react';
import type { Database } from '../../lib/database.types';
import { supabase } from '../../lib/supabase'; // Importamos o Supabase

type Class = Database['public']['Tables']['classes']['Row'];
// Precisamos do tipo 'Insert' para criar uma nova sessão
type AttendanceSessionInsert =
  Database['public']['Tables']['attendance_sessions']['Insert'];

interface ClassListProps {
  classes: Class[];
  onSelectClass: (classData: Class) => void;
  onStartSession: (sessionId: string) => void;
  onRefresh: () => void; // Prop é recebida (para uso futuro, se necessário)
}

export function ClassList({
  classes,
  onSelectClass,
  onStartSession,
  // onRefresh, // Descomente se for usar um botão de refresh aqui
}: ClassListProps) {
  // --- LÓGICA "RECHEADA" ---

  // ID da turma que está sendo carregada (para feedback no botão)
  const [loadingClassId, setLoadingClassId] = useState<string | null>(null);
  // Estado de erro geral
  const [error, setError] = useState<string | null>(null);

  /**
   * Esta é a função principal.
   * 1. Cria a sessão no banco.
   * 2. Se for sucesso, notifica o Dashboard (componente pai).
   */
  const handleStartSessionClick = async (classData: Class) => {
    setLoadingClassId(classData.id);
    setError(null);

    try {
      // Prepara os dados da nova sessão
      const newSessionData: AttendanceSessionInsert = {
        class_id: classData.id,
        professor_id: classData.professor_id,
        // Por padrão, iniciamos no Modo 1 (Professor Gera QR)
        mode: 'professor_generates', 
        // Se a turma tem dados de GPS, marcamos que a sessão exige
        require_geolocation: !!classData.latitude && !!classData.longitude,
        // qr_token e qr_expires_at serão definidos na próxima tela
      };

      // 1. Insere a nova sessão no Supabase e pede o registro de volta
      const { data, error: insertError } = await supabase
        .from('attendance_sessions')
        .insert(newSessionData)
        .select() // Pede o registro recém-criado de volta
        .single(); // Esperamos apenas um

      if (insertError) throw insertError;
      if (!data) throw new Error('Falha ao obter dados da sessão criada.');

      // 2. Notifica o ProfessorDashboard para mudar de tela
      onSelectClass(classData); // Diz qual turma foi selecionada
      onStartSession(data.id); // Passa o ID da *nova sessão*
      
    } catch (err: any) {
      console.error('Error starting session:', err);
      setError('Falha ao iniciar a sessão. Tente novamente.');
    } finally {
      setLoadingClassId(null); // Para o loading do botão
    }
  };

  return (
    <div className="space-y-6">
      {/* Exibe um erro geral se a criação da sessão falhar */}
      {error && (
        <div
          className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2"
          role="alert"
        >
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* A lista de turmas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((classData) => {
          // Verifica se *este* card específico está carregando
          const isLoading = loadingClassId === classData.id;

          return (
            <div
              key={classData.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col"
            >
              {/* Conteúdo do card */}
              <div className="p-6 flex-grow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {classData.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Código: {classData.code}
                    </p>
                  </div>
                  <BookOpen className="text-blue-600 flex-shrink-0" size={24} />
                </div>

                {classData.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin size={16} />
                    <span>{classData.location}</span>
                  </div>
                )}
              </div>

              {/* Rodapé com o botão de ação */}
              <div className="p-4 bg-gray-50 rounded-b-lg border-t border-gray-100">
                <button
                  onClick={() => handleStartSessionClick(classData)}
                  disabled={isLoading} // Desabilita o botão durante o loading
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <QrCode size={18} />
                  )}
                  {isLoading ? 'Iniciando...' : 'Iniciar Chamada'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}