import React, { useState } from 'react';
import CadastroPedido from './CadastroPedido';
import ModalVisualizar from '../components/ModalVisualizar';
import ModalEditar from '../components/ModalEditar';
import './Dashboard.css';

const ordemSetores = [
  'Gabarito',
  'Impressao',
  'Batida',
  'Costura',
  'Embalagem',
  'Finalizado',
];

const badgeColors = {
  Gabarito: 'blue',
  Impressao: 'green',
  Batida: 'orange',
  Costura: 'pink',
  Embalagem: 'purple',
  Finalizado: 'gray',
};

const Dashboard = ({
  atividades,
  onVisualizar,
  onAbrirEdicao,
  onEditar,
  onApagar,
  onConcluir,
  usuarioAtual,
}) => {
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

  // Filtros
  const [filtro, setFiltro] = useState('');
  const [setorFiltro, setSetorFiltro] = useState('');
  const [aba, setAba] = useState('andamento'); // 'andamento' ou 'finalizados'

  // Contagem por setor (garantindo todos aparecem)
  const setorCount = ordemSetores.reduce((acc, setor) => {
    acc[setor] = 0;
    return acc;
  }, {});
  atividades.forEach((a) => {
    if (setorCount.hasOwnProperty(a.setorAtual)) {
      setorCount[a.setorAtual]++;
    }
  });

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

  // Só mostra essas melhorias se admin:
  const isAdmin = usuarioAtual === 'admin';

  // Filtro com aba, setor e texto
  const atividadesFiltradas = atividades.filter((a) => {
    // Aba: andamento = tudo que NÃO é finalizado, finalizados = só finalizado
    const statusOk =
      !isAdmin ||
      (aba === 'andamento' ? a.setorAtual !== 'Finalizado' : a.setorAtual === 'Finalizado');
    const termo = normalizar(filtro);
    const setorOk = !setorFiltro || a.setorAtual === setorFiltro;

    if (!termo && setorOk && statusOk) return true;

    const pedido = normalizar(a.pedido);
    const cliente = normalizar(a.cliente);
    const dataEntregaFormatada = a.dataEntrega
      ? criarDataLocal(a.dataEntrega).toLocaleDateString()
      : '';

    return (
      setorOk &&
      statusOk &&
      (pedido.includes(termo) ||
        cliente.includes(termo) ||
        dataEntregaFormatada.includes(termo))
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

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      {/* Contadores por setor na ordem certa - só para admin */}
      {isAdmin && (
        <div className="cards">
          {ordemSetores.map((setor) => (
            <div key={setor} className="card">
              <div>{setor}</div>
              <div className={`badge badge-setor ${badgeColors[setor] || ''}`}>
                {setorCount[setor]}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Abas de andamento/finalizados - só para admin */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16 }}>
  {isAdmin && (
    <select
      value={setorFiltro}
      onChange={(e) => setSetorFiltro(e.target.value)}
      style={{ padding: 8 }}
    >
      <option value="">Todos os setores</option>
      {ordemSetores
  .filter(setor => setor !== "Finalizado")
  .map((setor) => (
    <option key={setor} value={setor}>{setor}</option>
))}

    </select>
  )}
  <input
    type="text"
    placeholder="Buscar por cliente, pedido ou data de entrega"
    value={filtro}
    onChange={(e) => setFiltro(e.target.value)}
    style={{ padding: '8px', width: '100%', maxWidth: '400px' }}
  />
  {isAdmin && (
    <>
      <button
        style={{
          padding: '8px 18px',
          fontWeight: 'bold',
          background: aba === 'andamento' ? '#eee' : '#fff',
          border: aba === 'andamento' ? '2px solid #999' : '1px solid #ccc',
          borderRadius: '10px',
          cursor: aba === 'andamento' ? 'default' : 'pointer',
        }}
        onClick={() => setAba('andamento')}
        disabled={aba === 'andamento'}
      >
        Em andamento
      </button>
      <button
        style={{
          padding: '8px 18px',
          fontWeight: 'bold',
          background: aba === 'finalizados' ? '#eee' : '#fff',
          border: aba === 'finalizados' ? '2px solid #999' : '1px solid #ccc',
          borderRadius: '10px',
          cursor: aba === 'finalizados' ? 'default' : 'pointer',
        }}
        onClick={() => setAba('finalizados')}
        disabled={aba === 'finalizados'}
      >
        Finalizados
      </button>
    </>
  )}
</div>


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
  {atividadesOrdenadas.map((a) => (
    <tr
      key={a.id}
      style={{
        background: a.urgente ? 'red' : undefined,
        color: a.urgente ? '#fff' : undefined,
        fontWeight: a.urgente ? 'bold' : undefined,
        fontSize: a.urgente ? '1.1em' : undefined,
        letterSpacing: a.urgente ? 2 : undefined,
        transition: 'background 0.3s',
      }}
    >
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
      <td>
        {a.urgente && (
          <span style={{
            fontSize: '0.95em',
            marginRight: 10,
            background: '#fff3',
            padding: '2px 12px',
            borderRadius: 6,
            verticalAlign: 'middle',
            display: 'inline-block',
            marginBottom: 4,
            marginTop: 2,
            boxShadow: '0 2px 10px #f001',
            animation: 'pulseUrgente 1s infinite alternate',
            color: '#fff',
          }}>
            🚨 URGENTE
          </span>
        )}
        <span style={{ verticalAlign: 'middle' }}>{a.cliente}</span>
      </td>

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

                {isAdmin && (
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
                    onClick={() => onConcluir(a)}
                    style={{ marginLeft: '8px' }}
                  >
                    ✅
                  </button>
                )}
              </td>
            </tr>
          ))}
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
    </div>
  );
};

export default Dashboard;
