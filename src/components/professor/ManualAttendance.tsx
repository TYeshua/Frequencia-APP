import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, Search, Loader2 } from 'lucide-react';
import type { Database } from '../../lib/database.types';

// O tipo 'Student' é inferido da consulta
interface Student {
  id: string;
  full_name: string;
  registration_number: string;
}

interface ManualAttendanceProps {
  classId: string;
  sessionId: string; // O ID da sessão (passado, mas usado por onMarkAttendance)
  markedStudents: string[]; // IDs dos alunos já presentes (vem do pai)
  onMarkAttendance: (studentId: string) => Promise<void>; // Função do pai
}

export function ManualAttendance({
  classId,
  markedStudents,
  onMarkAttendance,
}: ManualAttendanceProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null); // ID do aluno sendo marcado

  useEffect(() => {
    loadStudents();
  }, [classId]); // Recarrega se a turma mudar

  /**
   * Esta é a consulta mais eficiente:
   * 1. Seleciona os perfis...
   * 2. ...onde existe uma matrícula (enrollment) interna...
   * 3. ...que bate com o ID da turma (classId).
   */
  const loadStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles') // Começa pela tabela 'profiles'
        .select(
          `
          id,
          full_name,
          registration_number,
          class_enrollments!inner(class_id) 
        ` // Faz um INNER JOIN na tabela 'class_enrollments'
        )
        .eq('class_enrollments.class_id', classId) // Filtra pelo ID da turma
        .order('full_name', { ascending: true }); // Ordena

      if (error) throw error;

      // O 'data' já é a lista de Student[] correta
      setStudents(data as Student[]);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função de marcar (perfeita)
  const handleMark = async (studentId: string) => {
    setMarking(studentId); // Mostra o loading no botão
    try {
      // Chama a função do pai (que chama o AttendanceService)
      await onMarkAttendance(studentId);
      // O Realtime no AttendanceSession vai atualizar
      // a prop 'markedStudents' automaticamente.
    } catch (error) {
      console.error('Error marking attendance:', error);
    } finally {
      setMarking(null); // Para o loading do botão
    }
  };

  // Filtro de busca (perfeito)
  const filteredStudents = students.filter(
    (student) =>
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.registration_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Renderização do Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-600">
        <Loader2 className="animate-spin mr-2" size={20} />
        Carregando lista de alunos...
      </div>
    );
  }

  // Renderização do Componente
  return (
    <div>
      {/* Barra de Busca */}
      <div className="mb-4">
        <label htmlFor="search" className="sr-only">
          Buscar aluno
        </label>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            id="search"
            type="text"
            placeholder="Buscar por nome ou matrícula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Estado Vazio */}
      {filteredStudents.length === 0 ? (
        <p className="text-center py-8 text-gray-600">
          {searchTerm ? 'Nenhum aluno encontrado' : 'Nenhum aluno matriculado'}
        </p>
      ) : (
        // Lista de Alunos
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredStudents.map((student) => {
            const isMarked = markedStudents.includes(student.id);
            const isMarking = marking === student.id;

            return (
              <div
                key={student.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  isMarked
                    ? 'bg-green-50 border-green-300' // Verde se já presente
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Info do Aluno */}
                <div>
                  <p className="font-medium text-gray-900">
                    {student.full_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    Matrícula: {student.registration_number}
                  </p>
                </div>

                {/* Botão de Ação */}
                <button
                  onClick={() => handleMark(student.id)}
                  disabled={isMarked || isMarking}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 w-32 ${
                    isMarked
                      ? 'bg-green-600 text-white cursor-default'
                      : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait'
                  }`}
                  aria-label={
                    isMarked
                      ? `${student.full_name} já está presente`
                      : `Marcar presença de ${student.full_name}`
                  }
                >
                  {isMarking ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : isMarked ? (
                    <>
                      <Check size={18} />
                      Presente
                    </>
                  ) : (
                    'Marcar'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}