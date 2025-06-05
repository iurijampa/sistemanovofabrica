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
import Estoque from './pages/Estoque';
import ModalAlertaEstoque from './components/ModalAlertaEstoque';

// Limites personalizados para cada malha (tudo em maiúsculo)
const LIMITES_ALERTA = {
  'AERODRY': 200,
  'DRYFIT': 500,
  'DRY JERSIE': 500,
  'DRY MANCHESTER': 200,
  'DRY NBA': 100,
  'DRY SOLUTION': 200,
  'DRY TEC': 100,
  'HELANCA COLEGIAL': 50,
  'HELANQUINHA': 600,
  'OXFORD': 100,
  'PIQUET ALGODÃO': 600,
  'PIQUET DE POLIESTER': 100,
  'POLIESTER': 100,
  'RIBANA': 600,
  'TACTEL': 100,
  'UV FT50': 150
};

const noop = () => {};

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

  const [alertaEstoque, setAlertaEstoque] = useState([]); // ALERTA GLOBAL

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

  // Checar estoque baixo (usando limites personalizados)
  async function verificarEstoqueBaixo() {
    const { data, error } = await supabase
      .from('estoque')
      .select('*');
    if (!error && data) {
      const baixo = data.filter(item => {
        const nome = item.malha?.toUpperCase();
        const limite = LIMITES_ALERTA[nome];
        return limite !== undefined && item.quantidade <= limite;
      });
      setAlertaEstoque(baixo);
    }
  }

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
      if (normalize(setorLogado) === 'admin') {
        verificarEstoqueBaixo();
      }
    }
    // eslint-disable-next-line
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

      // Checar estoque baixo depois do cadastro de pedido
      await verificarEstoqueBaixo();

      await carregarAtividades();
      navigate('/');
    }
  };

  const apagarAtividade = async (pedidoId) => {
    if (!pedidoId) {
      alert('Erro: ID do pedido está undefined');
      return;
    }

    const { data: atividade } = await supabase
      .from('atividades')
      .select('setorAtual, funcionarioEnvio, observacaoEnvio')
      .eq('id', pedidoId)
      .single();

    await registrarMovimentacao({
      pedidoId,
      setorOrigem: atividade?.setorAtual || usuario.setor,
      setorDestino: null,
      tipo: 'apagou',
      funcionarioEnvio: atividade?.funcionarioEnvio || '',
      observacaoEnvio: atividade?.observacaoEnvio || '',
    });

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

  const concluirAtividade = async (pedidoId, nomeFuncionario, observacao) => {
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

  const setorLogado = usuario?.setor || 'admin';

  // Função de realtime otimizada!
  const handleNovaAtividade = usuario
    ? (novaAtividade) => {
        const setorAtividade = normalize(novaAtividade.setorAtual);

        if (normalize(setorLogado) === 'admin' || setorAtividade === normalize(setorLogado)) {
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

          if (normalize(setorLogado) !== 'admin' && setorAtividade === normalize(setorLogado)) {
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

  useRealtimeAtividades(
    handleNovaAtividade,
    handleRemoverAtividade,
    normalize(setorLogado) === 'admin' ? null : setorLogado
  );

  if (!usuario) {
    return <LoginEmailSenha onLogin={setUsuario} />;
  }

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
      {normalize(setorLogado) === 'admin' && alertaEstoque.length > 0 && (
        <ModalAlertaEstoque
          baixoEstoque={alertaEstoque}
          onClose={() => setAlertaEstoque([])}
          limites={LIMITES_ALERTA}
        />
      )}
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
            element={<Historico setorUsuario={setorLogado.toLowerCase()} />}
          />
          <Route
            path="/estoque"
            element={
              normalize(setorLogado) === 'admin' ? (
                <Estoque />
              ) : (
                <Navigate to="/" />
              )
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
