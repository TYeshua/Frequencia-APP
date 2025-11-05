import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { OfflineService } from '../../services/offlineService';
import { QRScanner } from './QRScanner'; // Componente filho para escanear
import { AttendanceHistory } from './AttendanceHistory'; // Componente filho para o histórico
import { WifiOff, Wifi, QrCode, History, Loader2, UploadCloud } from 'lucide-react'; // Ícones

export function StudentDashboard() {
  const { profile } = useAuth(); // 'user' não é mais necessário aqui
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeView, setActiveView] = useState<'scanner' | 'history'>('scanner');
  const [queueCount, setQueueCount] = useState(0);

  // --- NOVO ESTADO ---
  const [syncing, setSyncing] = useState(false); // Para feedback do botão

  useEffect(() => {
    // Funções para atualizar o estado da rede
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // --- CORREÇÃO (API v29) ---
    // setupAutoSync() não precisa mais do user.id
    OfflineService.setupAutoSync();
    // --- FIM DA CORREÇÃO ---

    // Atualiza a contagem da fila
    updateQueueCount();
    // O polling (verificação a cada 5s) é uma boa estratégia
    const interval = setInterval(updateQueueCount, 5000);

    // Limpa os listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []); // Roda apenas uma vez na montagem

  // Pega a contagem da fila do localStorage
  const updateQueueCount = () => {
    const queue = OfflineService.getQueue();
    setQueueCount(queue.length);
  };

  // Sincronização manual
  const handleSync = async () => {
    setSyncing(true);
    try {
      // --- CORREÇÃO (API v29) ---
      // syncQueue() não precisa mais do user.id
      await OfflineService.syncQueue();
      // --- FIM DA CORREÇÃO ---
      updateQueueCount(); // Atualiza a contagem após a tentativa
    } catch (error) {
      console.error('Falha na sincronização manual:', error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            {/* Título */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                Dashboard do Aluno
              </h1>
              <p className="text-gray-600">
                Bem-vindo, {profile?.full_name}
              </p>
            </div>

            {/* Ações (Status e Sincronização) */}
            <div className="flex items-center gap-4 mt-4 sm:mt-0">
              {/* Botão de Sincronizar (Aparece se houver itens na fila) */}
              {queueCount > 0 && (
                <button
                  onClick={handleSync}
                  disabled={syncing || !isOnline}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-wait"
                  aria-label="Sincronizar presenças pendentes"
                >
                  {syncing ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <UploadCloud size={18} />
                  )}
                  {syncing
                    ? 'Sincronizando...'
                    : `Sincronizar (${queueCount})`}
                </button>
              )}

              {/* Indicador de Status Online/Offline */}
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  isOnline
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
                role="status"
                aria-live="polite"
              >
                {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
                <span className="text-sm font-medium">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Navegação por Abas */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  onClick={() => setActiveView('scanner')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeView === 'scanner'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <QrCode size={20} />
                    Registrar Presença
                  </div>
                </button>
                <button
                  onClick={() => setActiveView('history')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeView === 'history'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <History size={20} />
                    Histórico
                  </div>
                </button>
              </div>
            </div>

            {/* Conteúdo das Abas */}
            <div className="p-6">
              {activeView === 'scanner' ? (
                <QRScanner
                  // Passa a função para o filho poder
                  // notificar o pai sobre uma nova presença offline
                  onSuccess={updateQueueCount}
                />
              ) : (
                <AttendanceHistory studentId={profile?.id || ''} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}