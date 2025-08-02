import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import CadastroPedido from './pages/CadastroPedido';
import ModalVisualizar from './components/ModalVisualizar';
import ModalEditar from './components/ModalEditar';
import ModalConcluirAtividade from './components/ModalConcluirAtividade';
import ModalRetornarAtividade from './components/ModalRetornarAtividade';
import LoginEmailSenha from './components/LoginEmailSenha';
import useRealtimeAtividades from './hooks/useRealtimeAtividades';
import somNotificacao from './assets/notificacao.mp3';
import somRetorno from './assets/retorno.mp3';
import { supabase } from './supabaseClient';
import Historico from './pages/Historico';
import { registrarMovimentacao } from './utils/registrarMovimentacao';
import Estoque from './pages/Estoque';
import ModalAlertaEstoque from './components/ModalAlertaEstoque';
import RelatorioBatedores from './pages/RelatorioBatedores';
import EstoquePapel from './pages/EstoquePapel';

const LIMITES_ALERTA = {
  'AERODRY': 100,
  'DRYFIT': 500,
  'DRY JERSIE': 500,
  'DRY MANCHESTER': 100,
  'DRY NBA': 100,
  'DRY SOLUTION': 200,
  'DRY TEC': 50,
  'HELANCA COLEGIAL': 50,
  'HELANQUINHA': 600,
  'OXFORD': 50,
  'PIQUET ALGODÃO': 600,
  'PIQUET DE POLIESTER': 50,
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
const setorAnterior = (setorAtual) => {
  const indexAtual = setores.indexOf(setorAtual);
  if (indexAtual <= 0) {
    return setorAtual;
  }
  return setores[indexAtual - 1];
};

function App() {
  const [usuario, setUsuario] = useState(null);
  const [atividades, setAtividades] = useState([]);
  const [pedidoVisualizado, setPedidoVisualizado] = useState(null);
  const [pedidoEditando, setPedidoEditando] = useState(null);
  const [pedidoParaConcluir, setPedidoParaConcluir] = useState(null);
  const [pedidoParaRetornar, setPedidoParaRetornar] = useState(null);

  const [alertaEstoque, setAlertaEstoque] = useState([]);

  // NOVO: Estado para batedores
  const [batedores, setBatedores] = useState([]);

  const navigate = useNavigate();
  const audio = useRef(new Audio(somNotificacao));
  const audioRetorno = useRef(new Audio(somRetorno));

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

  // NOVO: Carregar batedores do banco
  const carregarBatedores = async () => {
    const { data, error } = await supabase.from('batedores').select('*');
    if (!error && data) setBatedores(data);
  };

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
      carregarBatedores(); // <-- Carrega batedores ao logar
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

  const concluirAtividade = async (
  pedidoId,
  nomeFuncionario,
  observacao,
  costureira = null,
  destinoPersonalizado = null,
  funcionariosBatida = null,
  maquinaBatida = null,
  papel = null, // <-- novo
  maquinaImpressao = null // <-- novo
) => {
    const { data: atividadeAtual, error: fetchError } = await supabase
      .from('atividades')
      .select('*')
      .eq('id', pedidoId)
      .single();

    if (fetchError || !atividadeAtual) {
      alert('Erro ao buscar a atividade!');
      return;
    }

    // NOVO: Verifica se veio de retorno
    const veioDeRetorno = atividadeAtual.statusRetorno === true;

    const setorAnteriorVal = atividadeAtual.setorAtual;
    const novoSetor = destinoPersonalizado || proximoSetor(setorAnteriorVal);

    const { error } = await supabase
      .from('atividades')
      .update({
        status: novoSetor === 'Finalizado' ? 'concluido' : 'pendente',
        setorAtual: novoSetor,
        funcionarioEnvio: nomeFuncionario,
        observacaoEnvio: observacao,
        // Mantém o valor salvo se existir, senão usa o novo, nunca sobrescreve por vazio/null
        costureira:
          atividadeAtual.costureira !== null &&
          atividadeAtual.costureira !== undefined &&
          atividadeAtual.costureira !== ''
            ? atividadeAtual.costureira
            : (costureira !== null &&
               costureira !== undefined &&
               costureira !== ''
                ? costureira
                : null),
        dataEnvio: new Date().toISOString(),
        statusRetorno: false,
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
  setorOrigem: setorAnteriorVal,
  setorDestino: novoSetor,
  tipo: veioDeRetorno ? 'retornou' : 'concluiu', // padronizado!
  funcionarioEnvio: atividadeAtualizada?.funcionarioEnvio,
  observacaoEnvio: atividadeAtualizada?.observacaoEnvio,
  costureira: costureira,
  funcionariobatida: funcionariosBatida ? funcionariosBatida.join(',') : null,
  maquinabatida: maquinaBatida || null,
});

      // Após atualizar a atividade:
      if (
  setorAnteriorVal === 'Impressao' &&
  (atividadeAtual.tipo_produto || '').toLowerCase() === 'sublimacao'
) {
  const quantidade = Number(atividadeAtual.quantidade_pecas) || 1;

  const [nomePapel, gramaturaPapel] = (papel || '').split('|');

  const { data: papelDb } = await supabase
    .from('papeis')
    .select('id')
    .eq('nome', nomePapel)
    .eq('gramatura', gramaturaPapel)
    .single();

  if (!papelDb) {
    alert('Tipo de papel não encontrado!');
    return;
  }

  // Buscar o estoque do papel
  const { data: estoque } = await supabase
    .from('estoque_papel')
    .select('id, quantidade_atual')
    .eq('papel_id', papelDb.id)
    .single();

  if (!estoque) {
    alert('Papel não encontrado no estoque!');
    return;
  }

  if (estoque.quantidade_atual < quantidade) {
    alert('Estoque de papel insuficiente!');
    return;
  }

  // Atualizar estoque_papel
  const novaQtd = estoque.quantidade_atual - quantidade;
  await supabase
    .from('estoque_papel')
    .update({ quantidade_atual: novaQtd })
    .eq('id', estoque.id);

  // Registrar movimentação
  await supabase.from('movimentacoes_papel').insert([{
    papel_id: papelDb.id,
    quantidade: -quantidade,
    tipo: 'saida',
    usuario: nomeFuncionario,
    maquina: maquinaImpressao,
    obs: observacao || `Saída automática ao concluir atividade ${pedidoId}`,
    atividade_id: pedidoId
  }]);
}

      await carregarAtividades();
    }
  };

  const abrirModalRetornarAtividade = (pedido) => setPedidoParaRetornar(pedido);
  const fecharModalRetornarAtividade = () => setPedidoParaRetornar(null);

  const retornarAtividade = async (pedidoId, nomeFuncionario, observacao) => {
    const { data: atividadeAtual, error: fetchError } = await supabase
      .from('atividades')
      .select('*')
      .eq('id', pedidoId)
      .single();

    if (fetchError || !atividadeAtual) {
      alert('Erro ao buscar a atividade!');
      return;
    }

    const setorOrigemVal = atividadeAtual.setorAtual;
    const novoSetor = setorAnterior(setorOrigemVal);

    if (novoSetor === setorOrigemVal) {
      alert('Já está no primeiro setor, não pode retornar.');
      return;
    }

    const { error } = await supabase
      .from('atividades')
      .update({
        setorAtual: novoSetor,
        funcionarioEnvio: nomeFuncionario,
        observacaoEnvio: observacao,
        dataEnvio: new Date().toISOString(),
        statusRetorno: true,
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
        setorOrigem: setorOrigemVal,
        setorDestino: novoSetor,
        tipo: 'retornou',
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
  const handleNovaAtividade = usuario
    ? (novaAtividade) => {
        const setorAtividade = normalize(novaAtividade.setorAtual);

        if (
          normalize(setorLogado) === 'admin' ||
          setorAtividade === normalize(setorLogado)
        ) {
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

          // 🔊 Lógica para som
          const isAdmin = normalize(setorLogado) === 'admin';
          const isSetorCorreto = setorAtividade === normalize(setorLogado);
          const isRetorno = novaAtividade.statusRetorno === true;

          if (!isAdmin && isSetorCorreto) {
            try {
              if (isRetorno) {
                audioRetorno.current.currentTime = 0;
                audioRetorno.current.play().catch(() => {});
              } else {
                audio.current.currentTime = 0;
                audio.current.play().catch(() => {});
              }
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
                onRetornar={abrirModalRetornarAtividade}
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

<Route
  path="/estoque-papel"
  element={
    normalize(setorLogado) === 'admin' ? (
      <EstoquePapel />
    ) : (
      <Navigate to="/" />
    )
  }
/>
          
          <Route path="*" element={<Navigate to="/" />} />

          <Route
            path="/relatorio"
            element={
              normalize(setorLogado) === 'admin' || normalize(setorLogado) === 'batida' ? (
                <RelatorioBatedores />
              ) : (
                <Navigate to="/" />
              )
            }
          />
        </Routes>

        {pedidoVisualizado && (
          <ModalVisualizar
            pedido={pedidoVisualizado}
            onClose={fecharVisualizacao}
            usuarioAtual={setorLogado.toLowerCase()}
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
    onConfirmar={(
      nome,
      observacao,
      costureira,
      destinoPersonalizado,
      funcionariosBatida,
      maquinaBatida,
      papel, // <-- novo
      maquinaImpressao // <-- novo
    ) => {
      concluirAtividade(
        pedidoParaConcluir.id,
        nome,
        observacao,
        costureira,
        destinoPersonalizado,
        funcionariosBatida,
        maquinaBatida,
        papel, // <-- novo
        maquinaImpressao // <-- novo
      );
      fecharModalConcluirAtividade();
    }}
    batedores={batedores}
  />
)}

        {pedidoParaRetornar && (
          <ModalRetornarAtividade
            atividade={pedidoParaRetornar}
            onCancelar={fecharModalRetornarAtividade}
            onConfirmar={(nome, observacao) => {
              retornarAtividade(pedidoParaRetornar.id, nome, observacao);
              fecharModalRetornarAtividade();
            }}
          />
        )}
      </main>
    </div>
  );
}

export default App;