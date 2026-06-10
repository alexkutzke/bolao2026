import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function ProfilePage() {
  const { profile, user } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg('');
    setSavingProfile(true);

    const updates: { name?: string; email?: string } = {};
    if (name !== profile?.name) updates.name = name;

    // Atualizar nome na tabela profiles
    if (updates.name) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ name })
        .eq('id', user!.id);

      if (profileError) {
        setProfileMsg(`❌ Erro ao salvar nome: ${profileError.message}`);
        setSavingProfile(false);
        return;
      }
    }

    // Atualizar email (via Auth API)
    if (email !== profile?.email && email) {
      const { error: emailError } = await supabase.auth.updateUser({ email });

      if (emailError) {
        setProfileMsg(`❌ Erro ao atualizar email: ${emailError.message}`);
        setSavingProfile(false);
        return;
      }

      // Atualizar email na tabela profiles também
      await supabase.from('profiles').update({ email }).eq('id', user!.id);
      setProfileMsg('✅ Perfil atualizado! Verifique seu novo email para confirmação.');
    } else {
      setProfileMsg('✅ Perfil atualizado!');
    }

    setSavingProfile(false);
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg('');

    if (newPassword !== confirmPassword) {
      setPasswordMsg('❌ As senhas não conferem.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg('❌ A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setSavingPassword(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordMsg(`❌ Erro: ${error.message}`);
    } else {
      setPasswordMsg('✅ Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    }

    setSavingPassword(false);
  }

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <h1 className="text-xl font-bold">👤 Meu Perfil</h1>

      {/* Nome e Email */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-4">Dados pessoais</h2>
        <form onSubmit={handleUpdateProfile} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
          </div>

          {profileMsg && (
            <p className={`text-sm ${profileMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
              {profileMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={savingProfile}
            className="px-5 py-2.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-medium rounded-lg transition"
          >
            {savingProfile ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </div>

      {/* Senha */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-4">Alterar senha</h2>
        <form onSubmit={handleUpdatePassword} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nova senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Confirmar nova senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Repita a senha"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
          </div>

          {passwordMsg && (
            <p className={`text-sm ${passwordMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
              {passwordMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={savingPassword}
            className="px-5 py-2.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-medium rounded-lg transition"
          >
            {savingPassword ? 'Alterando...' : 'Alterar senha'}
          </button>
        </form>
      </div>

      {/* Conta criada em */}
      {profile?.created_at && (
        <p className="text-xs text-gray-600 text-center">
          Conta criada em{' '}
          {new Date(profile.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </p>
      )}
    </div>
  );
}
