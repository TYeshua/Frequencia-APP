import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { QRService } from '../../services/qrService';
import { AttendanceService } from '../../services/attendanceService';
import { OfflineService } from '../../services/offlineService';
import { Camera, CheckCircle, AlertCircle, ScanLine, Loader2 } from 'lucide-react';

// --- "RECHEIO" (A CORREÇÃO) ---
// Importamos 'Scanner' e o apelidamos de 'QrScanner'
import { Scanner as QrScanner } from '@yudiel/react-qr-scanner';

interface QRScannerProps {
  onSuccess: () => void; // Para atualizar a contagem no pai
}

export function QRScanner({ onSuccess }: QRScannerProps) {
  const { profile } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  /**
   * Sua lógica de 'handleScan' está perfeita.
   */
  const handleScan = async (data: string) => {
    if (processing || !profile) return;

    setProcessing(true);
    setMessage(null);
    setScanning(false); // Fecha a câmera ao processar

    try {
      // 1. Decodifica
      const decoded = QRService.decodeSessionData(data);
      if (!decoded) {
        throw new Error('QR Code inválido ou ilegível.');
      }

      // 2. Valida o token
      const session = await QRService.validateToken(
        decoded.sessionId,
        decoded.token
      );

      // 3. Verifica duplicados
      const exists = await AttendanceService.checkAttendanceExists(
        session.id,
        profile.id
      );
      if (exists) {
        throw new Error('Você já registrou presença nesta sessão.');
      }

      // 4. Prepara Geo-localização
      const classCoords = session.classes
        ? {
            latitude: session.classes.latitude!,
            longitude: session.classes.longitude!,
            radius: session.classes.geofence_radius,
          }
        : undefined;

      // 5. Tenta marcar a presença (online ou offline)
      const result = await AttendanceService.markAttendance(
        session.id,
        profile.id,
        'qr_scan',
        session.require_geolocation,
        classCoords
      );

      // 6. Mostra a mensagem de sucesso
      if (result.offline) {
        setMessage({
          type: 'success',
          text: 'Presença salva offline. Será sincronizada quando você estiver online.',
        });
      } else {
        setMessage({
          type: 'success',
          text: 'Presença registrada com sucesso!',
        });
      }

      onSuccess(); // Notifica o pai
      setManualCode('');
    } catch (error) {
      // 7. Mostra a mensagem de erro
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao registrar presença',
      });
    } finally {
      setProcessing(false); // Libera o botão
    }
  };

  // Função para o <QrScanner> (a biblioteca mudou o nome da prop)
  const handleQrDecode = (result: string) => {
    handleScan(result);
  };

  // Função do formulário manual
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
    }
  };

  const isOnline = OfflineService.isOnline();

  // --- RENDERIZAÇÃO ---
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <ScanLine className="w-16 h-16 mx-auto text-blue-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Registrar Presença
        </h2>
        <p className="text-gray-600">
          Escaneie o QR Code exibido pelo professor.
        </p>
      </div>

      {/* Aviso de Modo Offline */}
      {!isOnline && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-medium text-yellow-900 mb-1">
              Modo Offline
            </p>
            <p className="text-sm text-yellow-700">
              Você está offline. As presenças serão salvas localmente e sincronizadas.
            </p>
          </div>
        </div>
      )}

      {/* Mensagens de Status */}
      {message && (
        <div
          className={`mb-4 rounded-lg p-4 flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
          role="alert"
        >
          {message.type === 'success' ? (
            <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          ) : (
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          )}
          <p
            className={`text-sm ${
              message.type === 'success' ? 'text-green-900' : 'text-red-900'
            }`}
          >
            {message.text}
          </p>
        </div>
      )}

      {/* Botão de Ativar Câmera */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-6 mb-4">
        <button
          onClick={() => setScanning(!scanning)}
          disabled={processing}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors mb-4"
          aria-label="Abrir câmera para escanear QR Code"
        >
          <Camera size={20} />
          {scanning ? 'Fechar Câmera' : 'Escanear QR Code'}
        </button>

        {/* O SCANNER (o JSX continua o mesmo graças ao 'as QrScanner') */}
        {scanning && (
          <div className="mb-4 bg-black rounded-lg overflow-hidden">
            <QrScanner
              onDecode={handleQrDecode}
              onError={(error) => console.error(error?.message)}
              constraints={{
                facingMode: 'environment',
              }}
              containerStyle={{ width: '100%', paddingTop: '100%' }}
              videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}
        
        {/* Divisor "ou" */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">ou</span>
          </div>
        </div>
      </div>

      {/* Formulário Manual */}
      <form onSubmit={handleManualSubmit} className="space-y-4">
        <div>
          <label htmlFor="manualCode" className="block text-sm font-medium text-gray-700 mb-1">
            Colar dados do QR Code
          </label>
          <input
            id="manualCode"
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Cole os dados do QR Code aqui"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={processing}
          />
        </div>

        <button
          type="submit"
          disabled={!manualCode.trim() || processing}
          className="w-full bg-gray-800 text-white py-3 px-6 rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {processing ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            'Registrar Presença'
          )}
        </button>
      </form>
    </div>
  );
}