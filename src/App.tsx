import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { ProfessorDashboard } from './components/professor/ProfessorDashboard';
import { StudentDashboard } from './components/student/StudentDashboard';
import { useState } from 'react';
import { LogOut, GraduationCap } from 'lucide-react';

function AppContent() {
  const { user, profile, loading, signOut } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <GraduationCap className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              SPAI
            </h1>
            <p className="text-gray-600">
              Sistema de Presença Acadêmica Inteligente
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-6">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setShowRegister(false)}
                  className={`flex-1 pb-3 text-sm font-medium transition-colors ${
                    !showRegister
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Entrar
                </button>
                <button
                  onClick={() => setShowRegister(true)}
                  className={`flex-1 pb-3 text-sm font-medium transition-colors ${
                    showRegister
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Criar Conta
                </button>
              </div>
            </div>

            {showRegister ? <RegisterForm /> : <LoginForm />}
          </div>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Sistema com modo offline e validação por geolocalização</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
              <GraduationCap className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">SPAI</h1>
              <p className="text-xs text-gray-600">{profile.role === 'student' ? 'Aluno' : 'Professor'}</p>
            </div>
          </div>

          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Sair"
          >
            <LogOut size={18} />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </header>

      {profile.role === 'professor' ? <ProfessorDashboard /> : <StudentDashboard />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
