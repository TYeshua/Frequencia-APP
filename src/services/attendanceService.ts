import { supabase } from '../lib/supabase';
import { OfflineService } from './offlineService';
import { GeolocationService } from './geolocationService';
import type { Database } from '../lib/database.types';

// Definindo o tipo para os dados de presença
type AttendanceInsert =
  Database['public']['Tables']['attendance_records']['Insert'];

export class AttendanceService {
  /**
   * Marca a presença, validando GPS e offline.
   * AGORA com verificação anti-duplicados.
   */
  static async markAttendance(
    sessionId: string,
    studentId: string,
    method: 'qr_scan' | 'manual',
    requireGeolocation: boolean = false,
    classCoords?: { latitude: number; longitude: number; radius: number }
  ) {
    // --- NOVO "RECHEIO" ---
    // 1. Verifica se a presença já foi registrada
    try {
      const alreadyExists = await this.checkAttendanceExists(
        sessionId,
        studentId
      );
      if (alreadyExists) {
        // Se já existe, não faz nada e retorna com sucesso
        // (ou lança um erro, mas é melhor ser idempotente)
        return { success: true, offline: false, data: null, message: 'Presença já registrada.' };
      }
    } catch (checkError) {
      console.error('Falha ao verificar duplicados:', checkError);
      // Decide se quer parar ou continuar (vamos continuar por enquanto)
    }
    // --- FIM DO NOVO "RECHEIO" ---


    let latitude: number | null = null;
    let longitude: number | null = null;

    // 2. Valida a geolocalização (seu código original está perfeito)
    if (requireGeolocation && classCoords) {
      const validation = await GeolocationService.validateLocation(
        classCoords.latitude,
        classCoords.longitude,
        classCoords.radius
      );

      if (!validation.valid) {
        throw new Error(
          validation.distance
            ? `Você está muito longe da sala de aula (${Math.round(
                validation.distance
              )}m)`
            : 'Não foi possível obter sua localização'
        );
      }

      latitude = validation.userCoords?.latitude ?? null;
      longitude = validation.userCoords?.longitude ?? null;
    }

    // 3. Prepara os dados de inserção
    const attendanceData: AttendanceInsert = {
      session_id: sessionId,
      student_id: studentId,
      method,
      latitude,
      longitude,
      marked_at: new Date().toISOString(),
      synced: true, // Começa como 'true' (será 'false' se offline)
    };

    // 4. Lida com o Modo Offline (seu código original)
    if (!OfflineService.isOnline()) {
      attendanceData.synced = false; // Marca como não sincronizado
      // Adiciona o objeto de dados completo à fila
      OfflineService.addToQueue(attendanceData); 
      return { success: true, offline: true };
    }

    // 5. Insere no banco (Online)
    attendanceData.synced = true; // Garante que está marcado como sync
    const { data, error } = await supabase
      .from('attendance_records')
      .insert(attendanceData)
      .select()
      .single();

    if (error) throw error;
    return { success: true, offline: false, data };
  }

  /**
   * Busca o histórico de presença de UM aluno.
   * (Seu código está perfeito)
   */
  static async getStudentAttendance(studentId: string, classId?: string) {
    let query = supabase
      .from('attendance_records')
      .select(
        `
        *,
        attendance_sessions!inner(
          *,
          classes!inner(*)
        )
      `
      )
      .eq('student_id', studentId)
      .order('marked_at', { ascending: false });

    // Este filtro em tabela estrangeira está correto
    if (classId) {
      query = query.eq('attendance_sessions.class_id', classId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  /**
   * Busca todas as presenças de UMA sessão (para o professor).
   * (Seu código está perfeito e é o que o AttendanceSession.tsx usa)
   */
  static async getSessionAttendance(sessionId: string) {
    const { data, error } = await supabase
      .from('attendance_records')
      .select(
        `
        id,
        marked_at,
        method,
        student_id, 
        profiles(full_name, registration_number)
      `
      )
      .eq('session_id', sessionId)
      .order('marked_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  /**
   * Verifica se o aluno já marcou presença nesta sessão.
   * (Seu código está perfeito)
   */
  static async checkAttendanceExists(sessionId: string, studentId: string) {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('session_id', sessionId)
      .eq('student_id', studentId)
      .limit(1) // Garante que estamos buscando apenas 1
      .maybeSingle();

    if (error) throw error;
    return !!data; // Retorna true se 'data' não for nulo
  }
}