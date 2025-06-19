import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { supabase } from '../supabaseClient';
import ResumoSetor from '../components/ResumoSetor';
import {
  FaRuler,
  FaPrint,
  FaHammer,
  FaCut,
  FaBoxOpen,
  FaCheckCircle,
} from "react-icons/fa";

const setorIcons = {
  Gabarito: <FaRuler size={32} color="#3182ce" />,
  Impressao: <FaPrint size={32} color="#ffee00" />,
  Batida: <FaHammer size={32} color="#ed8936" />,
  Costura: <FaCut size={32} color="#d53f8c" />,
  Embalagem: <FaBoxOpen size={32} color="#805ad5" />,
  Finalizado: <FaCheckCircle size={32} color="#00ff00" />,
};

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

const setoresComuns = ['gabarito', 'impressao', 'batida', 'costura', 'embalagem'];

const Dashboard = ({
  atividades,
  onVisualizar,
  onAbrirEdicao,
  onEditar,
  onApagar,
  onConcluir,
  onRetornar,
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

  const [filtro, setFiltro] = useState('');
  const [setorFiltro, setSetorFiltro] = useState('');
  const [aba, setAba] = useState('andamento');

  // Novo estado para controlar o card selecionado
  const [setorCardSelecionado, setSetorCardSelecionado] = useState('');
  const isAdmin = usuarioAtual === 'admin';

  const [setorCount, setSetorCount] = useState(() =>
    ordemSetores.reduce((acc, setor) => {
      acc[setor] = 0;
      return acc;
    }, {})
  );

  const [contadorSetor, setContadorSetor] = useState({ fila: 0, concluidas: 0 });

  // CONTAGEM ADMIN
  useEffect(() => {
    const buscarContagemPorSetor = async () => {
      const { data, error } = await supabase
        .from('atividades')
        .select('setorAtual');
      if (error) {
        console.error('Erro ao buscar contagem:', error.message);
        return;
      }
      const contagem = ordemSetores.reduce((acc, setor) => {
        acc[setor] = 0;
        return acc;
      }, {});
      data?.forEach((item) => {
        if (item.setorAtual && contagem.hasOwnProperty(item.setorAtual)) {
          contagem[item.setorAtual]++;
        }
      });
      setSetorCount(contagem);
    };

    if (isAdmin) {
      buscarContagemPorSetor();
    }
  }, [isAdmin]);

  // CONTAGEM SETOR
  useEffect(() => {
    const buscarContagemSetor = async () => {
      if (!usuarioAtual || usuarioAtual === 'admin') return;

      const { count: fila, error: erroFila } = await supabase
        .from('atividades')
        .select('*', { count: 'exact', head: true })
        .ilike('setorAtual', usuarioAtual);

      const { count: concluidas, error: erroConcluidas } = await supabase
        .from('movimentacoes')
        .select('*', { count: 'exact', head: true })
        .ilike('setor_origem', usuarioAtual);

      if (erroFila || erroConcluidas) {
        console.error('Erro ao buscar contagem do setor', erroFila || erroConcluidas);
        return;
      }

      setContadorSetor({ fila, concluidas });
    };

    buscarContagemSetor();
  }, [usuarioAtual]);

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

  // AJUSTE: quando um card for selecionado, filtro por ele. Senão, usa os filtros padrão.
  const setorFiltroAtivo = setorCardSelecionado || setorFiltro;

  const atividadesFiltradas = atividades.filter((a) => {
    const statusOk =
      !isAdmin ||
      (aba === 'andamento' ? a.setorAtual !== 'Finalizado' : a.setorAtual === 'Finalizado');
    const termo = normalizar(filtro);
    const setorOk = !setorFiltroAtivo || a.setorAtual === setorFiltroAtivo;

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
    if (!isAdmin) {
      if (a.statusRetorno && !b.statusRetorno) return -1;
      if (!a.statusRetorno && b.statusRetorno) return 1;
    }
    if (a.setorAtual === 'Embalagem' && b.setorAtual !== 'Embalagem') return -1;
    if (b.setorAtual === 'Embalagem' && a.setorAtual !== 'Embalagem') return 1;

    const dataA = criarDataLocal(a.dataEntrega);
    const dataB = criarDataLocal(b.dataEntrega);
    return dataA - dataB;
  });

  const deveMostrarBotaoRetornar = (setor, usuarioAtual) => {
    return (
      !isAdmin &&
      setoresComuns.includes(usuarioAtual) &&
      setor.toLowerCase() !== 'gabarito' &&
      setor.toLowerCase() !== 'finalizado'
    );
  };

  // Função para quando o admin clica no card do setor
  const handleCardClick = (setor) => {
    setSetorCardSelecionado(setor);
    setSetorFiltro(''); // força dropdown a ser limpo
    setFiltro('');
  };

  // Função para limpar filtro do setor via card
  const handleLimparSetorSelecionado = () => {
    setSetorCardSelecionado('');
    setSetorFiltro('');
    setFiltro('');
  };

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      {isAdmin && (
        <>
          <div className="cards">
            {ordemSetores.map((setor) => (
              <div
                key={setor}
                className={`card ${setorCardSelecionado === setor ? 'selecionado' : ''}`}
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  border: setorCardSelecionado === setor ? "2px solid #3182ce" : undefined,
                  boxShadow: setorCardSelecionado === setor ? "0 0 16px #3182ce33" : undefined
                }}
                onClick={() => handleCardClick(setor)}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  {setorIcons[setor]}
                  <span style={{ fontWeight: 600, marginTop: 4 }}>{setor}</span>
                </div>
                <div className={`badge badge-setor ${badgeColors[setor] || ''}`} style={{ marginTop: 8 }}>
                  {setorCount[setor]}
                </div>
              </div>
            ))}
          </div>
          {setorCardSelecionado && (
            <div style={{
              margin: '18px 0 10px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}>
              <ResumoSetor setor={setorCardSelecionado} />
              <button
                onClick={handleLimparSetorSelecionado}
                style={{
                  marginLeft: 16,
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #bbb',
                  background: '#f2f6ff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Limpar seleção
              </button>
            </div>
          )}
        </>
      )}

      {!isAdmin && (
        <div style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: '16px',
          margin: '24px 0'
        }}>
          <div className="card" style={{ borderColor: '#FFD700', minWidth: 120 }}>
            <div style={{ fontWeight: 'bold', color: '#FFD700' }}>Fila do setor</div>
            <div className="badge"
              style={{
                backgroundColor: '#FFD700',
                color: '#fff',
                fontWeight: 'bold',
              }}>
              {contadorSetor.fila}
            </div>
          </div>
          <div className="card" style={{ borderColor: '#28a745', minWidth: 120 }}>
            <div style={{ fontWeight: 'bold', color: '#28a745' }}>Concluídos</div>
            <div className="badge"
              style={{
                backgroundColor: '#28a745',
                color: '#fff',
                fontWeight: 'bold',
              }}>
              {contadorSetor.concluidas}
            </div>
          </div>
          <ResumoSetor setor={usuarioAtual} />
        </div>
      )}

      {/* Filtros padrão */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16 }}>
        {isAdmin && (
          <select
            value={setorFiltro}
            onChange={(e) => {
              setSetorFiltro(e.target.value);
              setSetorCardSelecionado(''); // desativa card caso use dropdown
            }}
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
              onClick={() => setAba('andamento')}
              disabled={aba === 'andamento'}
              style={{
                padding: '8px 18px',
                fontWeight: 'bold',
                background: aba === 'andamento' ? '#eee' : '#fff',
                border: aba === 'andamento' ? '2px solid #999' : '1px solid #ccc',
                borderRadius: '10px',
                cursor: aba === 'andamento' ? 'default' : 'pointer',
              }}
            >
              Em andamento
            </button>
            <button
              onClick={() => setAba('finalizados')}
              disabled={aba === 'finalizados'}
              style={{
                padding: '8px 18px',
                fontWeight: 'bold',
                background: aba === 'finalizados' ? '#eee' : '#fff',
                border: aba === 'finalizados' ? '2px solid #999' : '1px solid #ccc',
                borderRadius: '10px',
                cursor: aba === 'finalizados' ? 'default' : 'pointer',
              }}
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
                background: a.statusRetorno
                  ? '#fff8b0'
                  : a.urgente
                    ? 'red'
                    : undefined,
                color: a.urgente ? '#fff' : undefined,
                fontWeight: a.urgente || a.statusRetorno ? 'bold' : undefined,
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
                {a.statusRetorno && (
                  <span style={{
                    background: '#e00',
                    color: '#fff',
                    borderRadius: 5,
                    padding: '2px 6px',
                    marginRight: 6,
                    fontSize: '0.9em',
                    letterSpacing: 1,
                  }}>
                    RETORNADO
                  </span>
                )}
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
                  onClick={() => onVisualizar(a)}
                  style={{ marginRight: '8px' }}
                >
                  👁️
                </button>

                {isAdmin && (
                  <>
                    <button
                      title="Editar"
                      onClick={() => onAbrirEdicao(a)}
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

                {/* Botão RETORNAR (só para setores comuns, exceto gabarito e finalizado) */}
                {deveMostrarBotaoRetornar(a.setorAtual, usuarioAtual) && (
                  <button
                    title="Retornar para o setor anterior"
                    onClick={() => onRetornar(a)}
                    style={{ marginLeft: '8px', marginRight: '8px' }}
                  >
                    🔙
                  </button>
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
    </div>
  );
};

export default Dashboard;
