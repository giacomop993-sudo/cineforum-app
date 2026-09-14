'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState('');
  const router = useRouter(); // Strumento per cambiare pagina

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Attendere...');

    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage('Errore: ' + error.message);
      } else {
        setMessage('Accesso effettuato! Reindirizzamento...');
        router.push('/dashboard'); // Teletrasporto alla dashboard!
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage('Errore: ' + error.message);
      } else {
        setMessage('Registrazione completata! Ora puoi fare il Login.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🎬 Cineforum App</h1>
          <p className="text-gray-400">
            {isLogin ? 'Bentornato! Effettua il login.' : 'Crea il tuo account membro.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
          >
            {isLogin ? 'Accedi' : 'Registrati'}
          </button>
        </form>

        {message && (
          <div className="mt-4 p-3 bg-gray-700 rounded-lg text-center text-sm text-white">
            {message}
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            {isLogin 
              ? "Non hai un account? Registrati ora" 
              : "Hai già un account? Accedi"}
          </button>
        </div>
      </div>
    </div>
  );
}