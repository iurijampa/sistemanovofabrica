import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import CadastroPedido from './pages/CadastroPedido';
import ModalVisualizar from './components/ModalVisualizar';
import ModalEditar from './components/ModalEditar';
import ModalConcluirAtividade from './components/ModalConcluirAtividade'; // <== cria esse componente!
import LoginEmailSenha from './components/LoginEmailSenha';

import { supabase } from './supabaseClient';

function App() {
  const [usuario, setUsuario] = useState(null);
  const [atividades, setAtividades] = useState([]);

  const [pedidoVisualizado, setPedidoVisualizado] = useState(null);
  const [pedidoEditando, setPedidoEditando] = useState(null);
  const [pedidoParaConcluir, setPedidoParaConcluir] = useState(null);

  const navigate = useNavigate();

  // Função para carregar as atividades do banco
  const carregarAtividades = async () => {
    const { data, error } = await supabase
      .from('atividades')
      .select('*')
      .order('dataEntrega', { ascending: true });

    if (error) {
      console.error('Erro ao buscar atividades:', error);
    } else {
      setAtividades(data);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUsuario(session.user);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setUsuario(session?.user ?? null);
    });

    carregarAtividades();
  }, []);

  // CRUD e ações no supabase
  const adicionarAtividade = async (novaAtividade) => {
    console.log('Atividade a ser cadastrada:', novaAtividade);

    const { error } = await supabase.from('atividades').insert([novaAtividade]);

    if (error) {
      console.error('Erro ao cadastrar atividade:', error.message, error.details);
    } else {
      await carregarAtividades();
      navigate('/');
    }
  };

  const apagarAtividade = async (pedidoId) => {
  console.log('Apagando atividade ID:', pedidoId);

  if (!pedidoId) {
    alert('Erro: ID do pedido está undefined');
    return;
  }

  const { error } = await supabase.from('atividades').delete().eq('id', pedidoId);

  if (error) {
    console.error('Erro ao apagar atividade:', error);
    alert('Erro ao apagar: ' + error.message);
  } else {
    await carregarAtividades();
    alert('Atividade apagada com sucesso!');
  }
};


  const salvarEdicao = async (pedidoAtualizado) => {
  console.log('Salvando edição:', pedidoAtualizado);

  if (!pedidoAtualizado.id) {
    alert('Erro: pedidoAtualizado.id está indefinido');
    return;
  }

  const { error } = await supabase
    .from('atividades')
    .update(pedidoAtualizado)
    .eq('id', pedidoAtualizado.id); // aqui precisa ser o UUID correto

  if (error) {
    console.error('Erro ao editar atividade:', error);
  } else {
    await carregarAtividades();
    fecharEdicao();
  }
};



  const concluirAtividade = async (pedidoId) => {
  console.log('Concluindo pedido ID:', pedidoId); // <-- debug

  const { error } = await supabase
    .from('atividades')
    .update({ status: 'concluido' })
    .eq('id', pedidoId);

  if (error) {
    console.error('Erro ao concluir atividade:', error);
  } else {
    console.log('Pedido concluído com sucesso!');
    await carregarAtividades();
  }
};




  // Abrir/fechar modais
  const abrirVisualizacao = (pedido) => setPedidoVisualizado(pedido);
  const fecharVisualizacao = () => setPedidoVisualizado(null);

  const abrirEdicao = (pedido) => setPedidoEditando(pedido);
  const fecharEdicao = () => setPedidoEditando(null);

  const abrirModalConcluirAtividade = (pedido) => setPedidoParaConcluir(pedido);
  const fecharModalConcluirAtividade = () => setPedidoParaConcluir(null);

  // Normalização para filtro por setor
  const normalize = (str) => str?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  if (!usuario) {
    return <LoginEmailSenha onLogin={setUsuario} />;
  }

  const setorLogado = usuario.user_metadata?.setor || 'admin';

  const atividadesFiltradas =
    normalize(setorLogado) === 'admin'
      ? atividades
      : atividades.filter((a) => normalize(a.setorAtual) === normalize(setorLogado));

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar
        setorLogado={setorLogado}
        onLogout={async () => {
          await supabase.auth.signOut();
          setUsuario(null);
        }}
      />
      <main style={{ flex: 1, padding: '20px' }}>
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                atividades={atividadesFiltradas}
                onVisualizar={abrirVisualizacao}
                onAbrirEdicao={abrirEdicao}
                onEditar={salvarEdicao}
                onApagar={apagarAtividade}
                onConcluir={abrirModalConcluirAtividade} // <-- Aqui chama o modal, não conclui direto
                usuarioAtual={setorLogado.toLowerCase()}
              />
            }
          />
          <Route
            path="/cadastro-pedido"
            element={
              normalize(setorLogado) === 'admin' ? (
                <CadastroPedido onCadastrar={adicionarAtividade} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

        {pedidoVisualizado && <ModalVisualizar pedido={pedidoVisualizado} onClose={fecharVisualizacao} />}

        {pedidoEditando && <ModalEditar pedido={pedidoEditando} onClose={fecharEdicao} onSalvar={salvarEdicao} />}

        {pedidoParaConcluir && (
          <ModalConcluirAtividade
            pedido={pedidoParaConcluir}
            onClose={fecharModalConcluir}
            onConfirmar={() => {
              concluirAtividade(pedidoParaConcluir.id);
              fecharModalConcluirAtividade();
            }}
          />
        )}
      </main>
    </div>
  );
}

export default App;
