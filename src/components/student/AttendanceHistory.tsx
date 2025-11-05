import { useState, useEffect } from 'react';
import { AttendanceService } from '../../services/attendanceService';
import { Calendar, MapPin, Clock, Loader2, ListX } from 'lucide-react'; // Ícones
import type { Database } from '../../lib/database.types'; // Importando tipos

// --- "RECHEIO" (Tipagem mais precisa) ---
// Este tipo representa o que esperamos do AttendanceService.getStudentAttendance
type AttendanceRecord = {
  id: string;
  marked_at: string;
  method: 'qr_scan' | 'manual';
  attendance_sessions: { // Objeto de sessão aninhado
    session_date: string;
    classes: { // Objeto de turma aninhado
      name: string;
      code: string;
      location: string | null; // Localização pode ser nula
    };
  } | null; // A sessão inteira pode ser nula (embora improvável com !inner)
};
// --- FIM DO "RECHEIO" ---

interface AttendanceHistoryProps {
  studentId: string;
}

export function AttendanceHistory({ studentId }: AttendanceHistoryProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Não carrega se o studentId ainda não estiver pronto
    if (studentId) {
      loadHistory();
    }
  }, [studentId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      // Chama o serviço que faz o join complexo
      const data = await AttendanceService.getStudentAttendance(studentId);
      // Filtra registros onde os dados aninhados podem ter falhado
      setRecords(data?.filter(isValidRecord) as AttendanceRecord[] || []);
    } catch (error) {
      console.error('Error loading attendance history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper para garantir que os joins funcionaram
  const isValidRecord = (record: any): record is AttendanceRecord => {
    return record && record.attendance_sessions && record.attendance_sessions.classes;
  };

  // 1. Estado de Carregamento (Perfeito)
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-600">
        <Loader2 className="animate-spin mr-2" size={20} />
        Carregando histórico...
      </div>
    );
  }

  // 2. Estado Vazio (Perfeito)
  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <ListX className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-800">Nenhum registro</p>
        <p className="text-gray-600">Nenhuma presença registrada ainda.</p>
      </div>
    );
  }

  // 3. Lógica de Agrupamento por Mês (Excelente)
  const groupByMonth = records.reduce((acc, record) => {
    const date = new Date(record.marked_at);
    // Cria uma chave "Setembro de 2025"
    const monthKey = date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
    });

    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(record);
    return acc;
  }, {} as Record<string, AttendanceRecord[]>);

  // 4. Renderização (Perfeito)
  return (
    <div className="space-y-6">
      {Object.entries(groupByMonth).map(([month, monthRecords]) => (
        <div key={month}>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 capitalize">
            {month}
          </h3>
          <div className="space-y-3">
            {monthRecords.map((record) => (
              <div
                key={record.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {record.attendance_sessions!.classes.name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {record.attendance_sessions!.classes.code}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      record.method === 'manual'
                        ? 'bg-yellow-100 text-yellow-800' // 'Manual' agora é amarelo
                        : 'bg-green-100 text-green-800'  // 'QR Code' agora é verde
                    }`}
                  >
                    {record.method === 'manual' ? 'Manual' : 'QR Code'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar size={16} />
                    <span>
                      {new Date(record.marked_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={16} />
                    <span>
                      {new Date(record.marked_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {record.attendance_sessions!.classes.location && (
                    <div className="flex items-center gap-1">
                      <MapPin size={16} />
                      <span>{record.attendance_sessions!.classes.location}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}