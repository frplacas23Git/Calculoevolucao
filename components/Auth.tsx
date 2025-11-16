
import React, { useState } from 'react';

interface AuthProps {
    onLogin: (email: string, pass: string) => boolean;
    onRegister: (name: string, email: string, pass: string) => boolean;
}

const Auth: React.FC<AuthProps> = ({ onLogin, onRegister }) => {
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email || !password) {
            setError("Preencha e-mail e senha.");
            return;
        }
        if (password.length < 6) {
            setError("A senha deve ter pelo menos 6 caracteres.");
            return;
        }

        let success = false;
        if (isRegisterMode) {
            if (!name) {
                setError("Informe seu nome para criar a conta.");
                return;
            }
            success = onRegister(name, email, password);
            if (!success) setError("Já existe uma conta com esse e-mail.");
        } else {
            success = onLogin(email, password);
            if (!success) setError("E-mail ou senha inválidos.");
        }
    };

    const toggleMode = () => {
        setIsRegisterMode(!isRegisterMode);
        setError(null);
        setName('');
        setEmail('');
        setPassword('');
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
            <div className="w-full max-w-sm bg-slate-950 rounded-2xl border border-slate-700 p-6 shadow-2xl shadow-slate-950/50">
                <h2 className="text-2xl font-bold text-white">{isRegisterMode ? 'Criar conta' : 'Entrar'}</h2>
                <p className="mt-1 mb-6 text-sm text-slate-400">
                    {isRegisterMode 
                        ? 'Cadastre-se para começar a controlar seus investimentos.' 
                        : 'Acesse seu painel para controlar seus investimentos.'}
                </p>

                {error && <div className="text-sm p-3 rounded-lg mb-4 bg-red-950/50 text-red-300 border border-red-700/50">{error}</div>}

                <form onSubmit={handleSubmit}>
                    {isRegisterMode && (
                        <div className="mb-4">
                            <label htmlFor="auth-nome" className="text-sm text-slate-400 block mb-1">Nome</label>
                            <input id="auth-nome" type="text" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500" />
                        </div>
                    )}
                    <div className="mb-4">
                        <label htmlFor="auth-email" className="text-sm text-slate-400 block mb-1">E-mail</label>
                        <input id="auth-email" type="email" placeholder="seuemail@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500" />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="auth-senha" className="text-sm text-slate-400 block mb-1">Senha</label>
                        <input id="auth-senha" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500" />
                    </div>
                    <div className="flex justify-end mt-6">
                        <button type="submit" className="w-full bg-green-600 text-white font-semibold px-4 py-2 rounded-lg cursor-pointer text-sm hover:bg-green-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                            {isRegisterMode ? 'Criar conta' : 'Entrar'}
                        </button>
                    </div>
                </form>

                <div className="text-sm text-center mt-6 text-slate-400">
                    {isRegisterMode ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
                    <button onClick={toggleMode} className="bg-none border-none text-green-500 cursor-pointer text-sm p-0 font-semibold hover:underline">
                        {isRegisterMode ? 'Entrar' : 'Criar conta'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;
