import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import CadastroPedido from './pages/CadastroPedido';
import ModalVisualizar from './components/ModalVisualizar';
import ModalEditar from './components/ModalEditar';
import ModalConcluirAtividade from './components/ModalConcluirAtividade';
import LoginEmailSenha from './components/LoginEmailSenha';
import useRealtimeAtividades from './hooks/useRealtimeAtividades';
import somNotificacao from './assets/notificacao.mp3';
import { supabase } from './supabaseClient';

const noop = () => {};

function App() {
  const [usuario, setUsuario] = useState(null);
  const [atividades, setAtividades] = useState([]);
  const [pedidoVisualizado, setPedidoVisualizado] = useState(null);
  const [pedidoEditando, setPedidoEditando] = useState(null);
  const [pedidoParaConcluir, setPedidoParaConcluir] = useState(null);

  const navigate = useNavigate();
  const audio = useRef(new Audio(somNotificacao));

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
  const usuarioSalvo = localStorage.getItem('usuario');
  if (usuarioSalvo) {
    const usuarioObj = JSON.parse(usuarioSalvo);
    setUsuario(usuarioObj);
  }
}, []);

useEffect(() => {
  if (usuario) {
    carregarAtividades();
  }
}, [usuario]);


  const adicionarAtividade = async (novaAtividade) => {
    const { error } = await supabase.from('atividades').insert([novaAtividade]);
    if (error) {
      console.error('Erro ao cadastrar atividade:', error.message, error.details);
    } else {
      await carregarAtividades();
      navigate('/');
    }
  };

  const apagarAtividade = async (pedidoId) => {
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
    if (!pedidoAtualizado.id) {
      alert('Erro: pedidoAtualizado.id está indefinido');
      return;
    }

    const { error } = await supabase
      .from('atividades')
      .update(pedidoAtualizado)
      .eq('id', pedidoAtualizado.id);

    if (error) {
      console.error('Erro ao editar atividade:', error);
    } else {
      await carregarAtividades();
      fecharEdicao();
    }
  };

  const concluirAtividade = async (pedidoId) => {
    const { error } = await supabase
      .from('atividades')
      .update({ status: 'concluido' })
      .eq('id', pedidoId);

    if (error) {
      console.error('Erro ao concluir atividade:', error);
    } else {
      await carregarAtividades();
    }
  };

  const abrirVisualizacao = (pedido) => setPedidoVisualizado(pedido);
  const fecharVisualizacao = () => setPedidoVisualizado(null);
  const abrirEdicao = (pedido) => setPedidoEditando(pedido);
  const fecharEdicao = () => setPedidoEditando(null);
  const abrirModalConcluirAtividade = (pedido) => setPedidoParaConcluir(pedido);
  const fecharModalConcluirAtividade = () => setPedidoParaConcluir(null);

  const normalize = (str) =>
    str?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const setorUsuario = normalize(usuario?.setor || 'admin');


  const handleNovaAtividade = usuario
  ? (novaAtividade) => {
      const setorAtividade = normalize(novaAtividade.setorAtual);

      if (setorUsuario === 'admin' || setorAtividade === setorUsuario) {
        setAtividades((prev) => {
          const jaExiste = prev.some((a) => a.id === novaAtividade.id);

          if (jaExiste) {
            // Atualiza a atividade existente
            return prev.map((a) => a.id === novaAtividade.id ? novaAtividade : a);
          } else {
            // Adiciona nova atividade
            return [...prev, novaAtividade];
          }
        });

        // Só toca som se não for admin
        if (setorUsuario !== 'admin' && setorAtividade === setorUsuario) {
          try {
            audio.current.currentTime = 0;
            audio.current.play().catch(() => {});
          } catch (err) {
            console.warn('Erro ao tocar som:', err);
          }
        }
      }
    }
  : noop;

  // ✅ Sempre chamado na mesma ordem
  useRealtimeAtividades(handleNovaAtividade);

  // Se não estiver logado
  if (!usuario) {
    return <LoginEmailSenha onLogin={setUsuario} />;
  }

  const setorLogado = usuario?.setor || 'admin';
  const atividadesFiltradas =
  normalize(setorLogado) === 'admin'
    ? atividades
    : atividades.filter((a) =>
        a.setorAtual ? normalize(a.setorAtual) === normalize(setorLogado) : false
      );


  return (
    <div style={{ display: 'flex' }}>
      <Sidebar
        setorLogado={setorLogado}
        onLogout={async () => {
          localStorage.removeItem('usuario');
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
                onConcluir={abrirModalConcluirAtividade}
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

        {pedidoVisualizado && (
          <ModalVisualizar pedido={pedidoVisualizado} onClose={fecharVisualizacao} />
        )}

        {pedidoEditando && (
          <ModalEditar
            pedido={pedidoEditando}
            onClose={fecharEdicao}
            onSalvar={salvarEdicao}
          />
        )}

        {pedidoParaConcluir && (
          <ModalConcluirAtividade
            pedido={pedidoParaConcluir}
            onClose={fecharModalConcluirAtividade}
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
