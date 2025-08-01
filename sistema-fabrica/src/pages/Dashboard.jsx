import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { supabase } from '../supabaseClient';
import TabelaAtividades from '../components/TabelaAtividades';
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

const marcarVisualizado = (pedidoId, setor, dataEnvio) => {
  const chave = `visualizado_${pedidoId}_${setor}`;
  localStorage.setItem(chave, String(new Date(dataEnvio).getTime()));
};

const isNovo = (pedidoId, setor, dataEnvio) => {
  if (!dataEnvio) return false;
  const dataMov = new Date(dataEnvio).getTime();
  const agora = Date.now();
  if (agora - dataMov > 300000) return false;
  const chave = `visualizado_${pedidoId}_${setor}`;
  const ultimoVisualizado = Number(localStorage.getItem(chave));
  if (ultimoVisualizado && ultimoVisualizado >= dataMov) return false;
  return true;
};

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
  const [setorCardSelecionado, setSetorCardSelecionado] = useState('');
  const isAdmin = usuarioAtual === 'admin';

  const [setorCount, setSetorCount] = useState(() =>
    ordemSetores.reduce((acc, setor) => {
      acc[setor] = 0;
      return acc;
    }, {})
  );

  const [contadorSetor, setContadorSetor] = useState({ fila: 0, concluidas: 0 });
  const [visualizados, setVisualizados] = useState({});

  // Filtro de costureira
  const [costureiraFiltro, setCostureiraFiltro] = useState('');
  const mostrarFiltroCostureira =
  (isAdmin && setorCardSelecionado === 'Costura') ||
  (!isAdmin && usuarioAtual === 'costura');

  // Lista única de costureiras (só para setor Costura)
  const atividadesOrdenadas = React.useMemo(() => {
    const atividadesFiltradas = atividades.filter((a) => {
      const statusOk =
        !isAdmin ||
        (aba === 'andamento' ? a.setorAtual !== 'Finalizado' : a.setorAtual === 'Finalizado');
      const termo = (filtro || '').toLowerCase().trim();
      const setorFiltroAtivo = setorCardSelecionado || setorFiltro;
      const setorOk = !setorFiltroAtivo || a.setorAtual === setorFiltroAtivo;
      if (!termo && setorOk && statusOk) return true;
      const pedido = (a.pedido || '').toLowerCase().trim();
      const cliente = (a.cliente || '').toLowerCase().trim();
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

    // Filtro de costureira
    if (mostrarFiltroCostureira && costureiraFiltro) {
      return atividadesFiltradas.filter(a => a.costureira === costureiraFiltro);
    }
    return atividadesFiltradas;
  }, [atividades, filtro, setorCardSelecionado, setorFiltro, aba, isAdmin, costureiraFiltro, mostrarFiltroCostureira]);

  const costureirasUnicas = React.useMemo(() => {
  const set = new Set();
  atividades
    .filter(a => a.setorAtual === 'Costura' && a.costureira)
    .forEach(a => set.add(a.costureira));
  return Array.from(set);
}, [atividades]);

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

  const handleCardClick = (setor) => {
    setSetorCardSelecionado(setor);
    setSetorFiltro('');
    setFiltro('');
    setCostureiraFiltro('');
    if (setor === 'Finalizado') {
      setAba('finalizados');
    } else {
      setAba('andamento');
    }
  };

  const handleLimparSetorSelecionado = () => {
    setSetorCardSelecionado('');
    setSetorFiltro('');
    setFiltro('');
    setCostureiraFiltro('');
  };

  const handleVisualizar = (a) => {
    onVisualizar(a);
    if (a.setorAtual && a.id && a.dataEnvio) {
      marcarVisualizado(a.id, a.setorAtual.toLowerCase(), a.dataEnvio);
      setVisualizados(v => ({ ...v, [`${a.id}_${a.setorAtual.toLowerCase()}`]: Date.now() }));
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setVisualizados(v => ({ ...v })), 30000);
    return () => clearInterval(timer);
  }, []);

  const adminVisualizandoImpressao =
    isAdmin && (setorCardSelecionado === 'Impressao' || setorFiltro === 'Impressao');

  // --- Filtros padrão, agora com filtro costureira junto ---
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16 }}>
        {isAdmin && (
          <select
            value={setorFiltro}
            onChange={(e) => {
              setSetorFiltro(e.target.value);
              setSetorCardSelecionado('');
              setCostureiraFiltro('');
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
        {mostrarFiltroCostureira && costureirasUnicas.length > 0 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Costureira:</span>
            <select
              value={costureiraFiltro}
              onChange={e => setCostureiraFiltro(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: 6 }}
            >
              <option value="">Todas</option>
              {costureirasUnicas.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        )}
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

      {/* --- TABELA: LOGICA FINAL DE EXIBIÇÃO --- */}
      {adminVisualizandoImpressao ? (
        <div style={{ display: 'flex', gap: 32, marginTop: 32, flexWrap: 'wrap' }}>
          {/* Sublimação */}
          <div style={{ flex: 1, minWidth: 350 }}>
            <TabelaAtividades
              atividades={atividadesOrdenadas.filter(
                (a) => (a.tipo_produto || '').toLowerCase() === 'sublimacao'
              )}
              isAdmin={isAdmin}
              usuarioAtual="impressao"
              onVisualizar={handleVisualizar}
              onAbrirEdicao={onAbrirEdicao}
              onApagar={onApagar}
              onRetornar={onRetornar}
              onConcluir={onConcluir}
              isNovo={isNovo}
              badgeColors={badgeColors}
              getPrazoBadgeClass={getPrazoBadgeClass}
              tituloMoldura={`Sublimação (${atividadesOrdenadas.filter(
                (a) => (a.tipo_produto || '').toLowerCase() === 'sublimacao'
              ).length})`}
              corMoldura="#3182ce"
            />
          </div>
          {/* Algodão */}
          <div style={{ flex: 1, minWidth: 350 }}>
            <TabelaAtividades
              atividades={atividadesOrdenadas.filter(
                (a) => (a.tipo_produto || '').toLowerCase() === 'algodao'
              )}
              isAdmin={isAdmin}
              usuarioAtual="impressao"
              onVisualizar={handleVisualizar}
              onAbrirEdicao={onAbrirEdicao}
              onApagar={onApagar}
              onRetornar={onRetornar}
              onConcluir={onConcluir}
              isNovo={isNovo}
              badgeColors={badgeColors}
              getPrazoBadgeClass={getPrazoBadgeClass}
              tituloMoldura={`Algodão (${atividadesOrdenadas.filter(
                (a) => (a.tipo_produto || '').toLowerCase() === 'algodao'
              ).length})`}
              corMoldura="#22c55e"
            />
          </div>
        </div>
      ) : usuarioAtual === 'impressao' ? (
        <div style={{ display: 'flex', gap: 32, marginTop: 32, flexWrap: 'wrap' }}>
          {/* Sublimação */}
          <div style={{ flex: 1, minWidth: 350 }}>
            <TabelaAtividades
              atividades={atividadesOrdenadas.filter(
                (a) => (a.tipo_produto || '').toLowerCase() === 'sublimacao'
              )}
              isAdmin={isAdmin}
              usuarioAtual={usuarioAtual?.toLowerCase()}
              onVisualizar={handleVisualizar}
              onAbrirEdicao={onAbrirEdicao}
              onApagar={onApagar}
              onRetornar={onRetornar}
              onConcluir={onConcluir}
              isNovo={isNovo}
              badgeColors={badgeColors}
              getPrazoBadgeClass={getPrazoBadgeClass}
              tituloMoldura={`Sublimação (${atividadesOrdenadas.filter(
                (a) => (a.tipo_produto || '').toLowerCase() === 'sublimacao'
              ).length})`}
              corMoldura="#3182ce"
            />
          </div>
          {/* Algodão */}
          <div style={{ flex: 1, minWidth: 350 }}>
            <TabelaAtividades
              atividades={atividadesOrdenadas.filter(
                (a) => (a.tipo_produto || '').toLowerCase() === 'algodao'
              )}
              isAdmin={isAdmin}
              usuarioAtual={usuarioAtual?.toLowerCase()}
              onVisualizar={handleVisualizar}
              onAbrirEdicao={onAbrirEdicao}
              onApagar={onApagar}
              onRetornar={onRetornar}
              onConcluir={onConcluir}
              isNovo={isNovo}
              badgeColors={badgeColors}
              getPrazoBadgeClass={getPrazoBadgeClass}
              tituloMoldura={`Algodão (${atividadesOrdenadas.filter(
                (a) => (a.tipo_produto || '').toLowerCase() === 'algodao'
              ).length})`}
              corMoldura="#22c55e"
            />
          </div>
        </div>
      ) : (
        <TabelaAtividades
          atividades={atividadesOrdenadas}
          isAdmin={isAdmin}
          usuarioAtual={
            isAdmin && setorCardSelecionado === 'Costura'
              ? 'costura'
              : usuarioAtual?.toLowerCase()
          }
          onVisualizar={handleVisualizar}
          onAbrirEdicao={onAbrirEdicao}
          onApagar={onApagar}
          onRetornar={onRetornar}
          onConcluir={onConcluir}
          isNovo={isNovo}
          badgeColors={badgeColors}
          getPrazoBadgeClass={getPrazoBadgeClass}
        />
     )}
    </div>
  );
};

export default Dashboard;