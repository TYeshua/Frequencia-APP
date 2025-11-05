import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type SessionData = Database['public']['Tables']['attendance_sessions']['Row'];
// --- NOVO TIPO ---
// Precisamos dos dados da turma (classes) que vêm do JOIN
type ClassData = Database['public']['Tables']['classes']['Row'];

export interface QRTokenPayload {
  sessionId: string;
  token: string;
}

export class QRService {
  // ... (as funções encode/decode/refreshToken daqui de cima estão corretas) ...
  
  static async refreshToken(sessionId: string): Promise<SessionData> {
    try {
      const newToken = crypto.randomUUID();
      const expirationTime = new Date(Date.now() + 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('attendance_sessions')
        .update({
          qr_token: newToken,
          qr_expires_at: expirationTime,
        })
        .eq('id', sessionId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[QRService] Erro ao atualizar o token:', error);
      throw error;
    }
  }

  static encodeSessionData(sessionId: string, token: string): string {
    const payload: QRTokenPayload = { sessionId, token };
    return JSON.stringify(payload);
  }

  static decodeSessionData(qrString: string): QRTokenPayload | null {
    try {
      const payload = JSON.parse(qrString) as QRTokenPayload;
      if (payload.sessionId && payload.token) {
        return payload;
      }
      return null;
    } catch (error) {
      console.error('[QRService] Erro ao decodificar QR Code:', error);
      return null;
    }
  }
  
  // --- "RECHEIO" (LÓGICA CORRIGIDA) ---
  /**
   * Valida o token E retorna os dados da sessão (com a turma)
   * se for válido.
   */
  static async validateToken(
    sessionId: string,
    token: string
  ): Promise<SessionData & { classes: ClassData | null }> {
    try {
      // 1. Busca a sessão E a turma associada (classes(*))
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select(
          `
            *,
            classes(*)
          `
        )
        .eq('id', sessionId)
        .single();

      if (error || !data) {
        throw new Error('Sessão de chamada não encontrada.');
      }

      // 2. Verifica se o token é o mesmo
      const tokenMatch = data.qr_token === token;
      // 3. Verifica se o tempo de expiração AINDA NÃO passou
      const notExpired =
        new Date(data.qr_expires_at || 0).getTime() > Date.now();

      // 4. Se for válido, retorna os dados completos da sessão
      if (tokenMatch && notExpired) {
        // O tipo 'data' já é o que precisamos (Session + classes)
        return data as SessionData & { classes: ClassData | null };
      } else {
        // Se falhar, lança um erro específico
        throw new Error(
          'QR Code inválido ou expirado. Peça ao professor para atualizar.'
        );
      }
    } catch (error) {
      console.error('[QRService] Erro ao validar token:', error);
      // Re-lança o erro para o handleScan
      throw error;
    }
  }
}