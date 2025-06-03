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
import Historico from './pages/Historico';
import { registrarMovimentacao } from './utils/registrarMovimentacao';

const noop = () => {};

// Lista dos setores em ordem
const setores = ['Gabarito', 'Impressao', 'Batida', 'Costura', 'Embalagem', 'Finalizado'];
const proximoSetor = (setorAtual) => {
  const indexAtual = setores.indexOf(setorAtual);
  if (indexAtual === -1 || indexAtual === setores.length - 1) {
    return setorAtual;
  }
  return setores[indexAtual + 1];
};

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
    const { data, error } = await supabase
      .from('atividades')
      .insert([novaAtividade])
      .select();

    if (error) {
      console.error('Erro ao cadastrar atividade:', error.message, error.details);
    } else {
      const idPedido = data && data[0]?.id;

      await registrarMovimentacao({
        pedidoId: idPedido,
        setorOrigem: usuario.setor,
        setorDestino: novaAtividade.setorAtual,
        tipo: 'cadastrou',
      });

      await carregarAtividades();
      navigate('/');
    }
  };

  const apagarAtividade = async (pedidoId) => {
  if (!pedidoId) {
    alert('Erro: ID do pedido está undefined');
    return;
  }

  // Busca dados da atividade antes de deletar (opcional, se quiser setorOrigem, etc)
  const { data: atividade } = await supabase
    .from('atividades')
    .select('setorAtual, funcionarioEnvio, observacaoEnvio')
    .eq('id', pedidoId)
    .single();

  // 1. Registra movimentação ANTES de deletar!
  await registrarMovimentacao({
    pedidoId,
    setorOrigem: atividade?.setorAtual || usuario.setor,
    setorDestino: null,
    tipo: 'apagou',
    funcionarioEnvio: atividade?.funcionarioEnvio || '',
    observacaoEnvio: atividade?.observacaoEnvio || '',
  });

  // 2. Agora pode deletar
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

  // Adicione este trecho:
  const { data: ver, error: errVer } = await supabase
    .from('atividades')
    .select('id, urgente')
    .eq('id', pedidoAtualizado.id)
    .single();
  console.log('Verificando após update:', ver, errVer);

  if (error) {
    console.error('Erro ao editar atividade:', error);
  } else {
    await registrarMovimentacao({
      pedidoId: pedidoAtualizado.id,
      setorOrigem: usuario.setor,
      setorDestino: pedidoAtualizado.setorAtual,
      tipo: 'editou',
    });

    await carregarAtividades();
    fecharEdicao();
  }
};




  // ATENÇÃO: Aqui está o novo fluxo com avanço de setor!
  const concluirAtividade = async (pedidoId, nomeFuncionario, observacao) => {
    // Busca atividade atual para saber o setor
    const { data: atividadeAtual, error: fetchError } = await supabase
      .from('atividades')
      .select('*')
      .eq('id', pedidoId)
      .single();

    if (fetchError || !atividadeAtual) {
      alert('Erro ao buscar a atividade!');
      return;
    }

    const setorAnterior = atividadeAtual.setorAtual;
    const novoSetor = proximoSetor(setorAnterior);
  

    // Atualiza para o novo setor, nome, observação e data de envio
    const { error } = await supabase
      .from('atividades')
      .update({
        status: novoSetor === 'Finalizado' ? 'concluido' : 'pendente',
        setorAtual: novoSetor,
        funcionarioEnvio: nomeFuncionario,
        observacaoEnvio: observacao,
        dataEnvio: new Date().toISOString(),
      })
      .eq('id', pedidoId);

    if (!error) {
      // Busca valores salvos (garante que vai registrar o que realmente ficou no banco)
      const { data: atividadeAtualizada } = await supabase
        .from('atividades')
        .select('funcionarioEnvio, observacaoEnvio')
        .eq('id', pedidoId)
        .single();

      await registrarMovimentacao({
        pedidoId,
        setorOrigem: setorAnterior,
        setorDestino: novoSetor,
        tipo: 'concluiu',
        funcionarioEnvio: atividadeAtualizada?.funcionarioEnvio,
        observacaoEnvio: atividadeAtualizada?.observacaoEnvio,
      });

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
              return prev.map((a) =>
                a.id === novaAtividade.id ? novaAtividade : a
              );
            } else {
              return [...prev, novaAtividade];
            }
          });

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

  const handleRemoverAtividade = (idRemovido) => {
    setAtividades((prev) => prev.filter((a) => a.id !== idRemovido));
  };

  useRealtimeAtividades(handleNovaAtividade, handleRemoverAtividade);

  if (!usuario) {
    return <LoginEmailSenha onLogin={setUsuario} />;
  }

  const setorLogado = usuario?.setor || 'admin';
  const atividadesFiltradas =
    normalize(setorLogado) === 'admin'
      ? atividades
      : atividades.filter((a) =>
          a.setorAtual
            ? normalize(a.setorAtual) === normalize(setorLogado)
            : false
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
          <Route
            path="/historico"
            element={
              <Historico setorUsuario={setorLogado.toLowerCase()} />
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

        {pedidoVisualizado && (
          <ModalVisualizar
            pedido={pedidoVisualizado}
            onClose={fecharVisualizacao}
          />
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
            atividade={pedidoParaConcluir}
            onCancelar={fecharModalConcluirAtividade}
            onConfirmar={(nome, observacao) => {
              concluirAtividade(pedidoParaConcluir.id, nome, observacao);
              fecharModalConcluirAtividade();
            }}
          />
        )}
      </main>
    </div>
  );
}

export default App;