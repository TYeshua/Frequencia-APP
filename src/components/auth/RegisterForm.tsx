import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserPlus } from 'lucide-react';
import type { Database } from '../../lib/database.types';

// Perfeito! Tipagem forte vinda direto do DB.
type Role = Database['public']['Tables']['profiles']['Row']['role'];

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false); // Ótimo estado de UX
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    // Chama o signUp do AuthContext
    const { error } = await signUp(
      email,
      password,
      fullName,
      role,
      registrationNumber
    );

    if (error) {
      // Mapeia erros comuns do Supabase
      if (error.message.includes('unique constraint')) {
        setError('Este email ou matrícula já está em uso.');
      } else if (error.message.includes('password length')) {
        setError('A senha deve ter no mínimo 6 caracteres.');
      } else {
        setError('Ocorreu um erro ao criar a conta.');
      }
    } else {
      setSuccess(true); // Mostra a mensagem de sucesso
      // Limpa o formulário
      setEmail('');
      setPassword('');
      setFullName('');
      setRegistrationNumber('');
      setRole('student');
    }

    setLoading(false);
  };

  // Lógica excelente para o label dinâmico
  const getRegistrationLabel = () => {
    switch (role) {
      case 'student':
        return 'Matrícula';
      case 'professor':
        return 'Registro (SIAPE, etc.)';
      case 'institution':
        return 'CNPJ';
      default:
        return 'Identificador';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="fullName-register"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Nome Completo
        </label>
        <input
          id="fullName-register"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-required="true"
        />
      </div>

      <div>
        <label
          htmlFor="role-register"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Tipo de Usuário
        </label>
        <select
          id="role-register"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-required="true"
        >
          {/* Oculta 'institution' se for um formulário de auto-cadastro */}
          <option value="student">Aluno</option>
          <option value="professor">Professor</option>
          {/* <option value="institution">Instituição</option> */}
        </select>
      </div>

      <div>
        <label
          htmlFor="registrationNumber-register"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {getRegistrationLabel()}
        </label>
        <input
          id="registrationNumber-register"
          type="text"
          value={registrationNumber}
          onChange={(e) => setRegistrationNumber(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-required="true"
        />
      </div>

      <div>
        <label
          htmlFor="email-register"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Email
        </label>
        <input
          id="email-register"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-required="true"
        />
      </div>

      <div>
        <label
          htmlFor="password-register"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Senha
        </label>
        <input
          id="password-register"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-required="true"
        />
      </div>

      {error && (
        <div
          className="bg-red-50 text-red-700 p-3 rounded-lg text-sm"
          role="alert"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="bg-green-50 text-green-700 p-3 rounded-lg text-sm"
          role="alert"
        >
          Conta criada com sucesso! Verifique seu email para confirmação e faça
          login.
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        aria-busy={loading}
      >
        <UserPlus size={20} />
        {loading ? 'Criando conta...' : 'Criar Conta'}
      </button>
    </form>
  );
}