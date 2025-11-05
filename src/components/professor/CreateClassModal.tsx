import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Save, MapPin, Loader2 } from 'lucide-react';
import type { Database } from '../../lib/database.types';

// Define o tipo de 'Insert' para a tabela 'classes'
type ClassInsert = Database['public']['Tables']['classes']['Insert'];

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateClassModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateClassModalProps) {
  const { profile } = useAuth(); // Para pegar o professor_id

  // Estados do formulário
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geofenceRadius, setGeofenceRadius] = useState(100); // Raio padrão de 100m

  // Estados de controle
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState('');

  // Limpa o formulário sempre que o modal for fechado
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setCode('');
      setLocation('');
      setLatitude(null);
      setLongitude(null);
      setGeofenceRadius(100);
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  // Função para buscar geolocalização atual
  const handleGetLocation = () => {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(Number(position.coords.latitude.toFixed(6)));
        setLongitude(Number(position.coords.longitude.toFixed(6)));
        setGeoLoading(false);
      },
      (geoError) => {
        setError(
          'Não foi possível obter a localização. Verifique as permissões.'
        );
        console.error(geoError);
        setGeoLoading(false);
      }
    );
  };

  // Função de envio do formulário
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) {
      setError('Erro: Perfil do professor não encontrado.');
      return;
    }

    setLoading(true);
    setError('');

    const classData: ClassInsert = {
      name,
      code,
      professor_id: profile.id, // ID do professor logado
      location: location || null,
      latitude: latitude,
      longitude: longitude,
      geofence_radius: geofenceRadius,
    };

    try {
      // Insere a nova turma no Supabase
      const { error: insertError } = await supabase
        .from('classes')
        .insert([classData]);

      if (insertError) throw insertError;

      // Sucesso!
      onSuccess(); // Chama a função do Dashboard (para recarregar e fechar)
    } catch (err: any) {
      if (err.message.includes('unique constraint')) {
        setError('Já existe uma turma com este código.');
      } else {
        setError('Ocorreu um erro ao criar a turma.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Se o modal não estiver aberto, não renderiza nada
  if (!isOpen) {
    return null;
  }

  // Renderização do Modal (Overlay + Painel)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Criar Nova Turma
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Fechar modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Linha 1: Nome e Código */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nome da Turma (ex: Cálculo I)
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Código da Turma (ex: TCC-00123)
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Linha 2: Localização (Opcional) */}
          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Local (ex: Sala 201, Bloco B)
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Linha 3: Geofence (Opcional) */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-medium text-gray-800 mb-2">
              Validação por GPS (Opcional)
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Defina as coordenadas da sala para garantir que os alunos estão
              presentes fisicamente.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="latitude"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Latitude
                </label>
                <input
                  id="latitude"
                  type="number"
                  step="any"
                  value={latitude ?? ''}
                  onChange={(e) => setLatitude(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label
                  htmlFor="longitude"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Longitude
                </label>
                <input
                  id="longitude"
                  type="number"
                  step="any"
                  value={longitude ?? ''}
                  onChange={(e) => setLongitude(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label
                  htmlFor="radius"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Raio (metros)
                </label>
                <input
                  id="radius"
                  type="number"
                  value={geofenceRadius}
                  onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={geoLoading}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
            >
              {geoLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <MapPin size={16} />
              )}
              {geoLoading
                ? 'Obtendo...'
                : 'Usar minha localização atual'}
            </button>
          </div>

          {/* Mensagem de Erro */}
          {error && (
            <div
              className="bg-red-50 text-red-700 p-3 rounded-lg text-sm"
              role="alert"
            >
              {error}
            </div>
          )}
        </form>

        {/* Rodapé do Modal (Ações) */}
        <div className="flex items-center justify-end p-5 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="class-form" // Referencia o form (opcional, mas bom)
            disabled={loading}
            onClick={handleSubmit}
            className="ml-3 inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Save size={20} />
            )}
            {loading ? 'Salvando...' : 'Salvar Turma'}
          </button>
        </div>
      </div>
    </div>
  );
}