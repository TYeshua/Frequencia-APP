import { useState, useEffect } from 'react';
import { QRService } from '../../services/qrService'; // Seu serviço (presumido)
import { RefreshCw, Loader2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react'; // --- CORREÇÃO 2: Importando o gerador local ---
import type { Database } from '../../lib/database.types';

// --- CORREÇÃO 4: Tipagem correta ---
type SessionData = Database['public']['Tables']['attendance_sessions']['Row'];

interface QRCodeDisplayProps {
  session: SessionData;
  // --- CORREÇÃO: 'onRefresh' removido ---
  // O componente pai (AttendanceSession) já usa Realtime,
  // então não precisamos notificá-lo para recarregar a lista.
}

export function QRCodeDisplay({ session }: QRCodeDisplayProps) {
  // Estado para os dados do QR e tempo
  const [qrData, setQrData] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [refreshing, setRefreshing] = useState(false);

  // Armazena a sessão localmente para podermos atualizá-la
  const [localSession, setLocalSession] = useState(session);

  // --- CORREÇÃO 1: Lógica de Timer Unificada ---
  useEffect(() => {
    // Sincroniza a prop 'session' com o estado 'localSession'
    setLocalSession(session);

    // Função que verifica o token e o tempo
    const checkAndRefreshToken = async (currentSession: SessionData) => {
      const expiresAt = new Date(currentSession.qr_expires_at || 0).getTime();
      const now = Date.now();
      const left = Math.max(0, Math.floor((expiresAt - now) / 1000));

      setTimeLeft(left);

      // Se o token estiver expirado (ou for o primeiro carregamento)
      // e não estivermos já atualizando...
      if (left <= 0 && !refreshing) {
        await refreshToken(currentSession.id);
      }
    };

    // --- CORREÇÃO 5: Gera o primeiro token se não existir ---
    if (
      !localSession.qr_token ||
      !localSession.qr_expires_at ||
      new Date(localSession.qr_expires_at).getTime() < Date.now()
    ) {
      refreshToken(localSession.id);
    }

    // Inicia UM timer que roda a cada segundo
    const timerId = setInterval(
      // Passamos o 'localSession' atual para o timer
      () => checkAndRefreshToken(localSession),
      1000
    );

    // Limpa o timer quando o componente desmontar ou a sessão mudar
    return () => clearInterval(timerId);
  }, [localSession.id, refreshing]); // Reinicia se a sessão ou o 'refreshing' mudar

  // Efeito separado para ATUALIZAR a string do QR
  // Roda sempre que o 'localSession' (com o novo token) for atualizado
  useEffect(() => {
    if (localSession.qr_token) {
      const data = QRService.encodeSessionData(
        localSession.id,
        localSession.qr_token
      );
      setQrData(data);
    }
  }, [localSession.qr_token, localSession.id]);

  // Atualiza o token no banco (via QRService) e atualiza o estado local
  const refreshToken = async (sessionId: string) => {
    setRefreshing(true);
    try {
      // 1. Chama seu serviço (que deve atualizar o DB)
      // 2. O serviço DEVE retornar a sessão ATUALIZADA
      const updatedSession = await QRService.refreshToken(sessionId);
      
      // 3. Atualiza o estado local, o que dispara os outros useEffects
      setLocalSession(updatedSession);
      setTimeLeft(60); // Reseta o timer visual
    } catch (error) {
      console.error('Error refreshing token:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white p-6 rounded-lg border-2 border-gray-200 mb-4">
        {/* --- CORREÇÃO 2: Renderizando o QR Code localmente --- */}
        {qrData ? (
          <QRCodeCanvas
            value={qrData}
            size={256} // 256x256
            bgColor="#ffffff"
            fgColor="#000000"
            level="Q" // Alta correção de erro
            includeMargin={true}
          />
        ) : (
          <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded">
            <Loader2 className="animate-spin text-gray-500" size={32} />
            <p className="text-gray-500 ml-2">Gerando QR Code...</p>
          </div>
        )}
      </div>

      {/* Barra de Tempo (Seu código está perfeito) */}
      <div className="text-center mb-4">
        <p className="text-sm text-gray-600 mb-2">
          Expira em {timeLeft} segundos
        </p>
        <div className="w-64 bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / 60) * 100}%` }}
          />
        </div>
      </div>

      {/* Botão de Atualizar (Seu código está perfeito) */}
      <button
        onClick={() => refreshToken(localSession.id)}
        disabled={refreshing}
        className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
        aria-label="Atualizar QR Code"
      >
        <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
        Atualizar QR Code
      </button>

      <div className="mt-6 text-center max-w-md">
        <p className="text-sm text-gray-600">
          Os alunos devem escanear este QR Code para registrar presença. O código
          é atualizado automaticamente para maior segurança.
        </p>
      </div>
    </div>
  );
}