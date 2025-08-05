import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const LoginEmailSenha = ({ onLogin }) => {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro(null);

    const { data, error } = await supabase
  .from('usuarios')
  .select('id, login, setor') // <-- Não selecione a senha!
  .eq('login', login)
  .eq('senha', senha)
  .single();

    if (error || !data) {
  setErro('Usuário ou senha incorretos');
} else {
  localStorage.setItem('usuario', JSON.stringify(data));
  // Salva o setor como 'role' para facilitar o controle de admin
  if (data.setor) {
    localStorage.setItem('role', data.setor.toLowerCase());
  }
  onLogin(data);
}
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
  type="text"
  placeholder="Usuário"
  value={login}
  onChange={e => setLogin(e.target.value)}
  required
  autoComplete="username" // recomendado!
/>
        <br />
        <input
  type="password"
  placeholder="Senha"
  value={senha}
  onChange={e => setSenha(e.target.value)}
  required
  autoComplete="current-password" // correto!
/>
        <br />
        <button type="submit">Entrar</button>
      </form>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}
    </div>
  );
};

export default LoginEmailSenha;
