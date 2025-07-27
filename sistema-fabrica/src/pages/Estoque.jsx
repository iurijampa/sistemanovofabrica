// src/pages/Estoque.jsx

import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import ModalAlertaEstoque from '../components/ModalAlertaEstoque';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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

const formatNumber = n => n?.toLocaleString('pt-BR') ?? '0';

function calcularMedias(movimentacoes, malhas) {
  const hoje = new Date();

  const stats = {};
  for (const malha of malhas) {
    const saidas = movimentacoes.filter(mv => mv.malha === malha && mv.tipo === 'saida');
    if (saidas.length === 0) {
      stats[malha] = { diaria: 0, semanal: 0, mensal: 0, total: 0 };
      continue;
    }

    // Ordena por data
    const datas = saidas.map(mv => new Date(mv.data)).sort((a, b) => a - b);
    const primeira = datas[0];
    const ultima = datas[datas.length - 1];

    // Dias totais (inclui hoje)
    const diasTotais = Math.max(1, Math.ceil((hoje - primeira) / (1000 * 60 * 60 * 24)) + 1);

    // Semanas totais
    const semanasTotais = Math.max(1, Math.ceil(diasTotais / 7));

    // Meses totais
    const mesesTotais = Math.max(1, (hoje.getFullYear() - primeira.getFullYear()) * 12 + (hoje.getMonth() - primeira.getMonth()) + 1);

    const totalSaidas = saidas.reduce((sum, mv) => sum + mv.quantidade, 0);

    stats[malha] = {
      diaria: Math.round(totalSaidas / diasTotais),
      semanal: Math.round(totalSaidas / semanasTotais),
      mensal: Math.round(totalSaidas / mesesTotais),
      total: totalSaidas,
    };
  }
  return stats;
}

const cardStyle = {
  background: '#f8fafc',
  borderRadius: 14,
  boxShadow: '0 1px 12px #1976d215',
  padding: '18px 28px',
  fontSize: 15,
  minWidth: 180,
  flex: 1,
  fontWeight: 500,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start'
};
const valorStyle = { fontSize: 32, fontWeight: 900, letterSpacing: 2, marginTop: 5 };

const Estoque = () => {
  const [estoque, setEstoque] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAlerta, setShowAlerta] = useState(false);
  const [baixoEstoque, setBaixoEstoque] = useState([]);
  const [movimentando, setMovimentando] = useState(null);
  const [tipoMov, setTipoMov] = useState('saida');
  const [qtdMov, setQtdMov] = useState(1);
  const [obsMov, setObsMov] = useState('');
  const [malhaSelecionada, setMalhaSelecionada] = useState(null);

  useEffect(() => {
    buscarEstoque();
    // eslint-disable-next-line
  }, []);

  async function buscarEstoque() {
    setLoading(true);
    const { data: estoqueData } = await supabase.from('estoque').select('*').order('malha', { ascending: true });
    const { data: movData } = await supabase.from('movimentacoes_estoque').select('*');
    setEstoque(estoqueData || []);
    setMovimentacoes(movData || []);
    setLoading(false);
  }

  useEffect(() => {
    if (!loading && estoque.length > 0) {
      const emAlerta = estoque.filter((item) => {
        const nome = item.malha?.toUpperCase();
        const limite = LIMITES_ALERTA[nome];
        return limite !== undefined && item.quantidade <= limite;
      });
      setBaixoEstoque(emAlerta);
      setShowAlerta(emAlerta.length > 0);
    } else {
      setShowAlerta(false);
      setBaixoEstoque([]);
    }
  }, [estoque, loading]);

  async function confirmarMovimentacao(item) {
    if (!qtdMov || qtdMov <= 0) {
      alert('Informe uma quantidade válida!');
      return;
    }
    let novaQtd = item.quantidade;
    if (tipoMov === 'entrada') {
      novaQtd += qtdMov;
    } else {
      if (qtdMov > item.quantidade) {
        alert('Estoque insuficiente!');
        return;
      }
      novaQtd -= qtdMov;
    }
    await supabase.from('estoque').update({ quantidade: novaQtd }).eq('id', item.id);

    await supabase.from('movimentacoes_estoque').insert([{
      malha: item.malha,
      quantidade: qtdMov,
      tipo: tipoMov,
      data: new Date().toISOString(),
      usuario: "admin",
      obs: obsMov || (tipoMov === 'entrada' ? 'Entrada manual' : 'Saída manual')
    }]);

    setMovimentando(null);
    setQtdMov(1);
    setObsMov('');
    buscarEstoque();
  }

  function gerarRelatorioWhatsapp() {
    if (!estoque.length) return;
    const estoqueOrdenado = [...estoque].sort((a, b) =>
      (a.malha || '').localeCompare(b.malha || '')
    );
    let mensagem = `*Relatório do Estoque Stamp BLUE®*\n\n`;
    mensagem += estoqueOrdenado.map(item =>
      `• ${item.malha?.toUpperCase()}: *${item.quantidade}*`
    ).join('\n');
    mensagem += '\n\nAtualizado em: ' + new Date().toLocaleString('pt-BR');
    const url = `https://wa.me/558393828491?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  }

  // Dashboard metrics
  const malhas = estoque.map(m => m.malha).filter(Boolean);
  const medias = calcularMedias(movimentacoes, malhas);
  const totalEstoque = estoque.reduce((sum, m) => sum + (m.quantidade || 0), 0);
  const totalSaidaHoje = movimentacoes.filter(mv =>
    mv.tipo === 'saida' && new Date(mv.data).toDateString() === new Date().toDateString()
  ).reduce((sum, mv) => sum + mv.quantidade, 0);
  const totalEntradaHoje = movimentacoes.filter(mv =>
    mv.tipo === 'entrada' && new Date(mv.data).toDateString() === new Date().toDateString()
  ).reduce((sum, mv) => sum + mv.quantidade, 0);

  const rankingMensal = malhas.map(malha => ({
    malha: malha.toUpperCase(),
    consumo: medias[malha]?.mensal || 0,
    estoque: estoque.find(e => e.malha === malha)?.quantidade || 0,
  }))
    .sort((a, b) => b.consumo - a.consumo)
    .slice(0, 8);

  const rankingBaixo = estoque
    .map(item => ({
      malha: item.malha?.toUpperCase(),
      quantidade: item.quantidade
    }))
    .sort((a, b) => a.quantidade - b.quantidade)
    .slice(0, 8);

  return (
    <div style={{ maxWidth: 1200, margin: '32px auto', padding: 24 }}>
      <h1 style={{ fontSize: 32, color: '#1976d2', fontWeight: 800, marginBottom: 20 }}>
        Dashboard Estoque <span style={{ color: '#bbb', fontWeight: 400 }}>Stamp BLUE®</span>
      </h1>

      {/* Cards de Resumo */}
      <div style={{ display: 'flex', gap: 32, margin: '22px 0 28px 0', flexWrap: 'wrap' }}>
        <div style={cardStyle}>
          <div>Total em estoque</div>
          <strong style={valorStyle}>{formatNumber(totalEstoque)}</strong>
        </div>
        <div style={{ ...cardStyle, background: '#fef2f2', color: '#b91c1c' }}>
          <div>Saídas hoje</div>
          <strong style={valorStyle}>{formatNumber(totalSaidaHoje)}</strong>
        </div>
        <div style={{ ...cardStyle, background: '#f0fdf4', color: '#15803d' }}>
          <div>Entradas hoje</div>
          <strong style={valorStyle}>{formatNumber(totalEntradaHoje)}</strong>
        </div>
        <div style={{ ...cardStyle, background: '#f3f4f6', color: '#475569' }}>
          <div>Malhas no limite</div>
          <strong style={valorStyle}>{baixoEstoque.length}</strong>
          {baixoEstoque.length > 0 && (
            <div style={{ fontSize: 12, marginTop: 6 }}>
              {baixoEstoque.map(b => b.malha?.toUpperCase()).join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* TABELA DE MÉDIA DE USO POR MALHA */}
      <div style={{
        background: "#fff", borderRadius: 16, boxShadow: "0 1px 9px #1976d208", margin: "32px 0",
        overflow: 'auto'
      }}>
        <h2 style={{ color: "#2563eb", fontWeight: 700, padding: 18, paddingBottom: 4 }}>Consumo por Malha</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
          <thead>
            <tr style={{ background: "#e3f2fd", fontWeight: 700 }}>
              <th style={{ padding: 10, fontSize: 15 }}>Malha</th>
              <th style={{ padding: 10, fontSize: 15 }}>Média Diária</th>
              <th style={{ padding: 10, fontSize: 15 }}>Semanal</th>
              <th style={{ padding: 10, fontSize: 15 }}>Mensal</th>
              <th style={{ padding: 10, fontSize: 15 }}>Total Saídas</th>
              <th style={{ padding: 10, fontSize: 15 }}>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {malhas.map((malha) => (
              <React.Fragment key={malha}>
                <tr style={{ background: malhaSelecionada === malha ? "#e0e7ff" : "#fff" }}>
                  <td style={{ padding: 9, fontWeight: 600, color: "#222" }}>{malha.toUpperCase()}</td>
                  <td style={{ padding: 9, textAlign: "center", color: "#2563eb" }}>{formatNumber(medias[malha]?.diaria || 0)}</td>
                  <td style={{ padding: 9, textAlign: "center", color: "#ea580c" }}>{formatNumber(medias[malha]?.semanal || 0)}</td>
                  <td style={{ padding: 9, textAlign: "center", color: "#059669" }}>{formatNumber(medias[malha]?.mensal || 0)}</td>
                  <td style={{ padding: 9, textAlign: "center", color: "#64748b" }}>{formatNumber(medias[malha]?.total || 0)}</td>
                  <td style={{ padding: 9, textAlign: "center" }}>
                    <button
                      style={{
                        background: "#1976d2", color: "#fff", fontWeight: 600, borderRadius: 7,
                        border: "none", padding: "4px 14px", cursor: "pointer"
                      }}
                      onClick={() => setMalhaSelecionada(malhaSelecionada === malha ? null : malha)}
                    >
                      {malhaSelecionada === malha ? "Fechar" : "Ver"}
                    </button>
                  </td>
                </tr>
                {malhaSelecionada === malha && (
                  <tr>
                    <td colSpan={6} style={{ padding: "0 16px 20px 16px", background: "#f3f4f6" }}>
                      <div>
                        <b style={{ color: "#1976d2", fontSize: 18 }}>Movimentações recentes: {malha.toUpperCase()}</b>
                        <table style={{ width: "100%", marginTop: 8, borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ background: "#f1f5f9", fontSize: 15 }}>
                              <th style={{ padding: 7 }}>Data</th>
                              <th style={{ padding: 7 }}>Tipo</th>
                              <th style={{ padding: 7 }}>Qtd</th>
                              <th style={{ padding: 7 }}>Usuário</th>
                              <th style={{ padding: 7 }}>Obs.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {movimentacoes
                              .filter(mv => (mv.malha || '').toLowerCase() === malha.toLowerCase())
                              .sort((a, b) => new Date(b.data) - new Date(a.data))
                              .slice(0, 15)
                              .map((mv, i) => (
                                <tr key={i} style={{ background: mv.tipo === 'saida' ? '#fef2f2' : '#f0fdf4', fontSize: 15 }}>
                                  <td style={{ padding: 6 }}>{new Date(mv.data).toLocaleDateString('pt-BR')}</td>
                                  <td style={{ padding: 6 }}>{mv.tipo}</td>
                                  <td style={{ padding: 6 }}>{formatNumber(mv.quantidade)}</td>
                                  <td style={{ padding: 6 }}>{mv.usuario}</td>
                                  <td style={{ padding: 6 }}>{mv.obs}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Gráficos */}
      <div style={{ margin: '24px 0 36px 0', background: '#fff', borderRadius: 18, padding: 24, boxShadow: '0 2px 18px #3182ce15' }}>
        <h2 style={{ color: '#2563eb', fontWeight: 700, marginBottom: 12 }}>Ranking de Consumo (Mensal)</h2>
        <ResponsiveContainer width="100%" height={290}>
          <BarChart data={rankingMensal}>
            <XAxis dataKey="malha" fontSize={15} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="consumo" fill="#2563eb" name="Consumo mensal (saídas)" />
            <Bar dataKey="estoque" fill="#22c55e" name="Estoque atual" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ margin: '28px 0 28px 0', background: '#fff', borderRadius: 18, padding: 24, boxShadow: '0 2px 18px #3182ce12' }}>
        <h2 style={{ color: '#b91c1c', fontWeight: 700, marginBottom: 12 }}>Malhas com Estoque Mais Baixo</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rankingBaixo}>
            <XAxis dataKey="malha" fontSize={15} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="quantidade" fill="#b91c1c" name="Qtd. em estoque" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Botão Relatório WhatsApp */}
      <button
        onClick={gerarRelatorioWhatsapp}
        style={{
          background: '#25D366',
          color: '#fff',
          fontWeight: 700,
          fontSize: 16,
          border: 'none',
          borderRadius: 8,
          padding: '10px 26px',
          margin: '18px 0 22px 0',
          cursor: 'pointer',
          boxShadow: '0 3px 12px #25D36633',
          display: 'flex',
          alignItems: 'center',
          gap: 9
        }}
        disabled={!estoque.length}
        title="Gerar relatório do estoque e enviar pelo WhatsApp"
      >
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none" style={{ marginRight: 5 }}>
          <circle cx="16" cy="16" r="16" fill="#25D366" />
          <path d="M9.5 22.5l1.7-4.1a6.7 6.7 0 111.8 1.4l-4.2 1.6zm3.8-8.8a.8.8 0 00-.8.8c0 2.8 2.2 5 5 5 .4 0 .8-.3.8-.8s-.3-.8-.8-.8c-2 0-3.6-1.6-3.6-3.6 0-.4-.3-.8-.8-.8z" fill="#fff" />
        </svg>
        Gerar relatório do estoque
      </button>

      {/* Tabela Estoque/Movimentação */}
      <div style={{ marginTop: 36 }}>
        {loading && <p>Carregando...</p>}
        {!loading && estoque.length === 0 && (
          <p style={{ color: '#b71c1c', fontWeight: 500 }}>
            Estoque vazio.<br />Cadastre as malhas na tabela "estoque" do Supabase.
          </p>
        )}
        {!loading && estoque.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              background: '#fff',
              borderRadius: 10,
              overflow: 'hidden',
              boxShadow: '0 2px 12px #1565c011'
            }}>
              <thead>
                <tr style={{ background: '#e3f2fd' }}>
                  <th style={{
                    textAlign: 'left', padding: 12, fontWeight: 600,
                    fontSize: 16, letterSpacing: 0.2, color: '#1976d2', borderBottom: '2px solid #bbdefb'
                  }}>Malha</th>
                  <th style={{
                    textAlign: 'center', padding: 12, fontWeight: 600,
                    fontSize: 16, color: '#1976d2', borderBottom: '2px solid #bbdefb'
                  }}>Quantidade</th>
                  <th style={{ borderBottom: '2px solid #bbdefb' }}></th>
                </tr>
              </thead>
              <tbody>
                {estoque.map((item) => {
                  const nome = item.malha?.toUpperCase();
                  const limite = LIMITES_ALERTA[nome];
                  let bg = '#e3f9e5';
                  if (limite !== undefined) {
                    if (item.quantidade <= limite) {
                      bg = '#ffebee';
                    } else if (item.quantidade <= (limite * 1.5)) {
                      bg = '#fffde7';
                    }
                  }
                  return (
                    <tr
                      key={item.id}
                      style={{
                        background: bg,
                        transition: 'background 0.2s'
                      }}
                    >
                      <td style={{ padding: 10, fontWeight: 500 }}>
                        {nome}
                      </td>
                      <td style={{ padding: 10, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          fontSize: 16,
                          color:
                            limite !== undefined && item.quantidade <= limite
                              ? '#b71c1c'
                              : limite !== undefined && item.quantidade <= (limite * 1.5)
                                ? '#bfa900'
                                : '#2e7d32',
                          borderRadius: 6,
                          padding: '3px 12px',
                          fontWeight: 700
                        }}>
                          {item.quantidade}
                        </span>
                      </td>
                      <td style={{ padding: 10 }}>
                        <button
                          style={{
                            background: '#007FFF',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            padding: '6px 14px',
                            fontWeight: 600,
                            fontSize: 15,
                            cursor: 'pointer',
                            marginRight: 4,
                            boxShadow: '0 2px 8px #00968813',
                            transition: 'background .15s'
                          }}
                          onClick={() => {
                            setMovimentando(item.id);
                            setTipoMov('saida');
                            setQtdMov(1);
                            setObsMov('');
                          }}
                        >
                          Movimentar
                        </button>
                        {movimentando === item.id && (
                          <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            <select value={tipoMov} onChange={e => setTipoMov(e.target.value)}>
                              <option value="saida">Saída</option>
                              <option value="entrada">Entrada</option>
                            </select>
                            <input
                              type="number"
                              min={1}
                              value={qtdMov}
                              style={{ width: 60 }}
                              onChange={e => setQtdMov(Number(e.target.value))}
                            />
                            <input
                              type="text"
                              placeholder="Obs. (opcional)"
                              value={obsMov}
                              onChange={e => setObsMov(e.target.value)}
                              style={{ width: 120 }}
                            />
                            <button
                              style={{ background: '#43a047', color: '#fff', borderRadius: 6, padding: '6px 10px', fontWeight: 600, border: 'none' }}
                              onClick={() => confirmarMovimentacao(item)}
                            >OK</button>
                            <button
                              style={{ background: '#eee', color: '#888', borderRadius: 6, padding: '6px 8px', border: 'none', fontWeight: 600 }}
                              onClick={() => setMovimentando(null)}
                            >Cancelar</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showAlerta && baixoEstoque.length > 0 && (
        <ModalAlertaEstoque
          baixoEstoque={baixoEstoque}
          onClose={() => setShowAlerta(false)}
          limites={LIMITES_ALERTA}
        />
      )}
    </div>
  );
};

export default Estoque;
