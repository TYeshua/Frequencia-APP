import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

// --- CORREÇÃO 1: Usar o tipo de Inserção do banco ---
// Este é o objeto que o AttendanceService nos envia.
type AttendanceInsert =
  Database['public']['Tables']['attendance_records']['Insert'];

// A interface para o item NA FILA (adicionamos um ID local)
interface OfflineQueueItem extends AttendanceInsert {
  local_id: string; // Para controle interno do localStorage
}

const OFFLINE_QUEUE_KEY = 'spai_offline_queue';

export class OfflineService {
  /**
   * Verifica se o navegador está online.
   */
  static isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Adiciona um registro de presença (formato Supabase) à fila offline.
   */
  static addToQueue(data: AttendanceInsert): void {
    const queue = this.getQueue();
    const newItem: OfflineQueueItem = {
      ...data,
      local_id: crypto.randomUUID(), // Adiciona um ID local
    };
    queue.push(newItem);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  }

  /**
   * Pega a fila atual do localStorage.
   */
  static getQueue(): OfflineQueueItem[] {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Limpa a fila do localStorage.
   */
  static clearQueue(): void {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  }

  /**
   * Tenta sincronizar todos os itens da fila com o Supabase.
   */
  static async syncQueue(): Promise<{
    success: boolean;
    synced: number;
    errors: number;
  }> {
    const queue = this.getQueue();
    if (queue.length === 0) {
      return { success: true, synced: 0, errors: 0 };
    }

    console.log(`[OfflineService] Sincronizando ${queue.length} itens...`);

    let synced = 0;
    let errors = 0;
    const failedItems: OfflineQueueItem[] = []; // Armazena apenas os que falharem

    for (const item of queue) {
      try {
        // Prepara os dados: remove o ID local e atualiza o status de sync
        const { local_id, ...insertData } = item;
        insertData.synced = true;
        insertData.synced_at = new Date().toISOString();

        // --- CORREÇÃO 2: Sincronização Idempotente ---
        // Tenta inserir.
        // Se já existir (conflito em session_id E student_id),
        // apenas IGNORE (não faça nada e não gere erro).
        const { error } = await supabase
          .from('attendance_records')
          .insert(insertData)
          .onConflict('session_id, student_id') // Chave de segurança
          .ignore();

        if (error) {
          // Se for um erro DIFERENTE (ex: foreign key), jogue o erro
          throw error;
        }

        // Se chegou aqui, foi sucesso (ou foi ignorado com segurança)
        synced++;
      } catch (error) {
        console.error('[OfflineService] Falha ao sincronizar item:', error, item);
        errors++;
        failedItems.push(item); // Adiciona o item à lista de falhas
      }
    }

    // --- CORREÇÃO 3: Lógica de Fila Robusta ---
    // Atualiza o localStorage APENAS com os itens que falharam.
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(failedItems));

    console.log(
      `[OfflineService] Sincronização concluída. Sucesso: ${synced}, Falhas: ${errors}.`
    );

    return { success: errors === 0, synced, errors };
  }

  /**
   * Configura o listener para sincronizar automaticamente quando ficar online.
   * Deve ser chamado UMA VEZ quando o usuário logar.
   */
  static setupAutoSync(): void {
    // Remove listeners antigos para evitar duplicação
    window.removeEventListener('online', this.handleOnline);
    // Adiciona o novo listener
    window.addEventListener('online', this.handleOnline);

    // Tenta uma sincronização inicial caso já esteja online
    if (this.isOnline()) {
      console.log('[OfflineService] Online. Tentando sync inicial.');
      this.syncQueue();
    }
  }

  // Função helper para ser usada no listener
  private static handleOnline = () => {
    console.log('[OfflineService] Conexão restaurada, sincronizando...');
    this.syncQueue();
  };
}