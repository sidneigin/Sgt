import { LogIn, ShieldCheck } from 'lucide-react';
import logoImg from '../assets/images/sgt_armas_logo_ui.jpg';

interface LoginScreenProps {
  onLogin: () => void;
  isLoggingIn: boolean;
}

// Tela exibida sempre que não há um usuário autenticado.
// Nenhuma parte do app (formulário, lista, dados) é renderizada antes do login com Google.
export default function LoginScreen({ onLogin, isLoggingIn }: LoginScreenProps) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 p-8 text-center space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shadow-xs">
            <img
              src={logoImg}
              alt="Insanos MC Logo"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold font-sans tracking-tight text-slate-800">
              Relatório Sgt Armas
            </h1>
            <p className="text-[11px] text-slate-400 font-mono tracking-wider uppercase">
              CMD XXIX - IMC
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Faça login com sua conta Google para acessar os relatórios. Todos os dados são
          sincronizados em nuvem e ficam visíveis apenas para você.
        </p>

        <button
          id="btn-google-signin-gate"
          onClick={onLogin}
          disabled={isLoggingIn}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 disabled:pointer-events-none text-white shadow-md shadow-emerald-900/10 transition-all cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          {isLoggingIn ? 'Entrando...' : 'Entrar com Google'}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />
          Acesso restrito por conta autenticada
        </div>
      </div>
    </div>
  );
}
