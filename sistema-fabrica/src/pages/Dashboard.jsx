import React, { useEffect, useState } from 'react';
import CadastroPedido from './CadastroPedido';
import ModalVisualizar from '../components/ModalVisualizar';
import ModalEditar from '../components/ModalEditar';
import { supabase } from '../supabaseClient';
import './Dashboard.css';

const Dashboard = ({ atividades, onVisualizar, onAbrirEdicao, onEditar, onApagar, onConcluir, usuarioAtual }) => {
  const criarDataLocal = (dataStr) => {
    if (!dataStr) return null;
    const partes = dataStr.split('-');
    const ano = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    const dia = parseInt(partes[2], 10);
    return new Date(ano, mes, dia);
  };

  const [modalAberto, setModalAberto] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [atividadeSelecionada, setAtividadeSelecionada] = useState(null);

  
  
  // Novo estado para modal concluir
  const [modalConcluirAberto, setModalConcluirAberto] = useState(false);
  const [atividadeParaConcluir, setAtividadeParaConcluir] = useState(null);

  // Campo de filtro de busca
  const [filtro, setFiltro] = useState('');

  // Contagem por setor
  const setorCount = atividades.reduce((acc, atividade) => {
    acc[atividade.setorAtual] = (acc[atividade.setorAtual] || 0) + 1;
    return acc;
  }, {});

  const badgeColors = {
    Gabarito: 'blue',
    Impressao: 'green',
    Batida: 'orange',
    Costura: 'pink',
    Embalagem: 'purple',
    Finalizado: 'gray',
  };

  const getPrazoBadgeClass = (dataEntrega) => {
    if (!dataEntrega) return '';
    const hoje = new Date();
    const entrega = criarDataLocal(dataEntrega);
    const diffDias = Math.ceil((entrega - hoje) / (1000 * 60 * 60 * 24));

    if (diffDias > 10) return 'green';
    if (diffDias > 5) return 'orange';
    return 'red';
  };

  const normalizar = (str) => str?.toString().toLowerCase().trim() || '';

  const atividadesFiltradas = atividades.filter((a) => {
    const termo = normalizar(filtro);
    if (!termo) return true;

    const pedido = normalizar(a.pedido);
    const cliente = normalizar(a.cliente);
    const dataEntregaFormatada = a.dataEntrega
      ? criarDataLocal(a.dataEntrega).toLocaleDateString()
      : '';

    return (
      pedido.includes(termo) ||
      cliente.includes(termo) ||
      dataEntregaFormatada.includes(termo)
    );
  });

  const atividadesOrdenadas = [...atividadesFiltradas].sort((a, b) => {
    const dataA = criarDataLocal(a.dataEntrega);
    const dataB = criarDataLocal(b.dataEntrega);
    return dataA - dataB;
  });

  const abrirModal = (atividade) => {
    setAtividadeSelecionada(atividade);
    setModalAberto(true);
    setModalEditar(false);
  };

  const abrirModalEditar = (atividade) => {
    setAtividadeSelecionada(atividade);
    setModalAberto(true);
    setModalEditar(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setModalEditar(false);
    setAtividadeSelecionada(null);
  };

  const salvarEdicao = (dadosEditados) => {
  console.log('Salvando edição...', dadosEditados); // agora está certo

  const dados = {
    id: atividadeSelecionada.id,
    pedido: dadosEditados.pedido,
    cliente: dadosEditados.cliente,
    imagem: dadosEditados.imagem,
    descricao: dadosEditados.descricao,
    setorAtual: dadosEditados.setorAtual,
    dataEntrega: dadosEditados.dataEntrega,
    funcionarioEnvio: atividadeSelecionada.funcionarioEnvio,
    observacaoEnvio: atividadeSelecionada.observacaoEnvio,
  };

  onEditar(dados);
  fecharModal();
};


  // Função para obter o próximo setor da sequência
  const setores = ['Gabarito', 'Impressao', 'Batida', 'Costura', 'Embalagem', 'Finalizado'];
  const proximoSetor = (setorAtual) => {
    const indexAtual = setores.indexOf(setorAtual);
    if (indexAtual === -1 || indexAtual === setores.length - 1) {
      return setorAtual;
    }
    return setores[indexAtual + 1];
  };

  // NOVAS FUNÇÕES para modal concluir

  const abrirModalConcluir = (atividade) => {
    setAtividadeParaConcluir(atividade);
    setModalConcluirAberto(true);
  };

  const fecharModalConcluir = () => {
    setModalConcluirAberto(false);
    setAtividadeParaConcluir(null);
  };

  // ALTERAÇÃO AQUI: adicionando a dataEnvio com data/hora atual
  const concluirAtividadeComDados = (nomeFuncionario, observacao) => {
    if (!atividadeParaConcluir) return;

    const novoSetor = proximoSetor(atividadeParaConcluir.setorAtual);
    if (novoSetor === atividadeParaConcluir.setorAtual) {
      alert('Esta atividade já está no setor Finalizado.');
      fecharModalConcluir();
      return;
    }

    if (!nomeFuncionario.trim() || !observacao.trim()) {
      alert('Nome do funcionário e observação são obrigatórios.');
      return;
    }

    onEditar({
      ...atividadeParaConcluir,
      setorAtual: novoSetor,
      funcionarioEnvio: nomeFuncionario.trim(),
      observacaoEnvio: observacao.trim(),
      dataEnvio: new Date().toISOString(), // <-- adiciona data e hora da ação
    });

    fecharModalConcluir();
  };

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

            <div className="cards">
        {Object.entries(setorCount).map(([setor, count]) => (
          <div key={setor} className="card">
            <div>{setor}</div>
            <div className={`badge badge-setor ${badgeColors[setor] || ''}`}>{count}</div>
          </div>
        ))}
      </div>

      {/* Campo de busca */}
      <input
        type="text"
        placeholder="Buscar por cliente, pedido ou data de entrega"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        style={{ marginBottom: '16px', padding: '8px', width: '100%', maxWidth: '400px' }}
      />

      <h2>Atividades</h2>
      <table>
        <thead>
          <tr>
            <th>Foto</th>
            <th>Pedido</th>
            <th>Cliente</th>
            <th>Setor Atual</th>
            <th>Data de Entrega</th>
            <th>Enviado Por</th>
            <th>Observação</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {atividadesOrdenadas.map((a) => {
    return (
      
      <tr key={a.id}>
        <td>
  {a.imagem ? (
    <img
      src={a.imagem}
      alt="Imagem principal"
      style={{
        width: '60px',
        height: '60px',
        objectFit: 'cover',
        borderRadius: '4px',
        marginBottom: '4px',
      }}
      onError={(e) => {
        e.target.onerror = null;
        e.target.src = 'https://via.placeholder.com/40x40?text=Erro';
      }}
    />
  ) : (
    <span>Sem imagem</span>
  )}

  {/* IMAGENS EXTRAS */}
  {Array.isArray(a.imagensExtras) && a.imagensExtras.length > 0 && (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
      {a.imagensExtras.map((url, i) => (
        <img
          key={i}
          src={url}
          alt={`Imagem extra ${i}`}
          style={{
            width: '40px',
            height: '40px',
            objectFit: 'cover',
            borderRadius: '4px',
            border: '1px solid #ccc',
          }}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://via.placeholder.com/40x40?text=Erro';
          }}
        />
      ))}
    </div>
  )}
</td>

              <td>{a.pedido}</td>
              <td>{a.cliente}</td>
              <td>
                <span className={`badge badge-setor ${badgeColors[a.setorAtual] || ''}`}>
                  {a.setorAtual}
                </span>
              </td>
              <td>
                <span className={`badge badge-prazo ${getPrazoBadgeClass(a.dataEntrega)}`}>
                  {a.dataEntrega ? criarDataLocal(a.dataEntrega).toLocaleDateString() : '-'}
                </span>
              </td>
              {/* ALTERAÇÃO AQUI: mostrar nome + data/hora da ação */}
              <td>
                {a.funcionarioEnvio || '-'}
                {a.dataEnvio && (
                  <div style={{ fontSize: '0.8em', color: '#666' }}>
                    {new Date(a.dataEnvio).toLocaleString()}
                  </div>
                )}
              </td>
              <td>{a.observacaoEnvio || '-'}</td>

              <td>
                <button
                  title="Visualizar"
                  onClick={() => abrirModal(a)}
                  style={{ marginRight: '8px' }}
                >
                  👁️
                </button>

                {usuarioAtual === 'admin' && (
                  <>
                    <button
                      title="Editar"
                      onClick={() => abrirModalEditar(a)}
                      style={{ marginRight: '8px' }}
                    >
                      ✏️
                    </button>
                    <button
                      title="Apagar"
                      onClick={() => {
                        if (window.confirm('Quer mesmo apagar este pedido?')) {
                          onApagar(a.id);
                        }
                      }}
                    >
                      🗑️
                    </button>
                  </>
                )}

                {/* Botão concluir para enviar ao próximo setor */}
                {usuarioAtual !== 'finalizado' && a.setorAtual.toLowerCase() !== 'finalizado' && (
                  <button
                    title="Concluir e enviar para o próximo setor"
                    onClick={() => abrirModalConcluir(a)}
                    style={{ marginLeft: '8px' }}
                  >
                    ✅
                  </button>
                )}
              </td>
            </tr>
           );
})}
        </tbody>
      </table>

      {modalAberto && atividadeSelecionada && (
  modalEditar ? (
    <ModalEditar
      pedido={atividadeSelecionada}
      onClose={fecharModal}
      onSalvar={salvarEdicao}
    />
  ) : (
    <ModalVisualizar
      pedido={atividadeSelecionada}
      onClose={fecharModal}
    />
  )
)}

      {/* Modal concluir */}
      {modalConcluirAberto && atividadeParaConcluir && (
        <div className="modalOverlay" onClick={fecharModalConcluir}>
          <div
            className="modalContent"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              maxWidth: '400px',
              margin: '50px auto',
            }}
          >
            <h2>Concluir e Enviar para o Próximo Setor</h2>
            <p>
              Pedido: <strong>{atividadeParaConcluir.pedido}</strong>
            </p>
            <p>
              Setor Atual: <strong>{atividadeParaConcluir.setorAtual}</strong>
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const nomeFuncionario = e.target.nomeFuncionario.value;
                const observacao = e.target.observacao.value;
                concluirAtividadeComDados(nomeFuncionario, observacao);
              }}
            >
              <label>
                Seu Nome:
                <input type="text" name="nomeFuncionario" required />
              </label>
              <br />
              <label>
                Observação:
                <textarea name="observacao" required />
              </label>
              <br />
              <button type="submit">Concluir</button>
              <button type="button" onClick={fecharModalConcluir} style={{ marginLeft: '10px' }}>
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
