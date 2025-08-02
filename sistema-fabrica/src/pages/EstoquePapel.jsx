import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import ModalAlertaEstoque from '../components/ModalAlertaEstoque';

const LIMITES_PAPEL = {
  'SEM TACK 75G': 200,
  'COM TACK 75G': 200,
  'SEM TACK 50G': 200,
};

const formatNumber = n => n?.toLocaleString('pt-BR') ?? '0';

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

const EstoquePapel = () => {
  const [estoque, setEstoque] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [movimentando, setMovimentando] = useState(null);
  const [tipoMov, setTipoMov] = useState('saida');
  const [qtdMov, setQtdMov] = useState(1);
  const [obsMov, setObsMov] = useState('');
  const [baixoEstoque, setBaixoEstoque] = useState([]);
  const [showAlerta, setShowAlerta] = useState(false);

  useEffect(() => {
    buscarEstoque();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!loading && estoque.length > 0) {
      const emAlerta = estoque.filter((item) => {
        const nome = (item.papeis?.nome + ' ' + (item.papeis?.gramatura || '')).trim().toUpperCase();
        const limite = LIMITES_PAPEL[nome];
        return limite !== undefined && item.quantidade_atual <= limite;
      });
      setBaixoEstoque(emAlerta);
      setShowAlerta(emAlerta.length > 0);
    } else {
      setShowAlerta(false);
      setBaixoEstoque([]);
    }
  }, [estoque, loading]);

  async function buscarEstoque() {
    setLoading(true);
    const { data: estoqueData } = await supabase
      .from('estoque_papel')
      .select('id, quantidade_atual, papel_id, papeis:papel_id (nome, gramatura)')
      .order('papel_id', { ascending: true });
    const { data: movData } = await supabase
  .from('movimentacoes_papel')
  .select('*, papeis:papel_id (nome, gramatura)')
  .order('created_at', { ascending: false });
    setEstoque(estoqueData || []);
    setMovimentacoes(movData || []);
    setLoading(false);
  }

  async function confirmarMovimentacao(item) {
    if (!qtdMov || qtdMov <= 0) {
      alert('Informe uma quantidade válida!');
      return;
    }
    let novaQtd = item.quantidade_atual;
    if (tipoMov === 'entrada') {
      novaQtd += qtdMov;
    } else {
      if (qtdMov > item.quantidade_atual) {
        alert('Estoque insuficiente!');
        return;
      }
      novaQtd -= qtdMov;
    }
    await supabase.from('estoque_papel').update({ quantidade_atual: novaQtd }).eq('id', item.id);

    await supabase.from('movimentacoes_papel').insert([{
      papel_id: item.papel_id,
      quantidade: tipoMov === 'entrada' ? qtdMov : -qtdMov,
      tipo: tipoMov,
      maquina: item.maquina || '',
      usuario: "admin",
      obs: obsMov || (tipoMov === 'entrada' ? 'Entrada manual' : 'Saída manual')
    }]);

    setMovimentando(null);
    setQtdMov(1);
    setObsMov('');
    buscarEstoque();
  }


  return (
  <div style={{ maxWidth: 900, margin: '32px auto', padding: 24 }}>
    <h1 style={{ fontSize: 32, color: '#1976d2', fontWeight: 800, marginBottom: 20 }}>
      Estoque de Papel <span style={{ color: '#bbb', fontWeight: 400 }}>Stamp BLUE®</span>
    </h1>

    {showAlerta && baixoEstoque.length > 0 && (
      <ModalAlertaEstoque
        baixoEstoque={baixoEstoque}
        onClose={() => setShowAlerta(false)}
        limites={LIMITES_PAPEL}
      />
    )}
      {/* Alerta de estoque baixo */}
      {showAlerta && baixoEstoque.length > 0 && (
        <div style={{
          background: '#ffebee',
          color: '#b71c1c',
          border: '1px solid #ffcdd2',
          borderRadius: 8,
          padding: '12px 18px',
          marginBottom: 18,
          fontWeight: 600
        }}>
          Atenção: Estoque baixo para os papéis:{" "}
          {baixoEstoque.map(b => (b.papeis?.nome + ' ' + (b.papeis?.gramatura || '')).toUpperCase()).join(', ')}
        </div>
      )}

      {/* Cards de Resumo */}
      <div style={{ display: 'flex', gap: 32, margin: '22px 0 28px 0', flexWrap: 'wrap' }}>
        <div style={cardStyle}>
          <div>Total em estoque</div>
          <strong style={valorStyle}>{formatNumber(estoque.reduce((sum, p) => sum + (p.quantidade_atual || 0), 0))}</strong>
        </div>
        <div style={{ ...cardStyle, background: '#fef2f2', color: '#b91c1c' }}>
          <div>Saídas hoje</div>
          <strong style={valorStyle}>
            {formatNumber(
              movimentacoes.filter(mv =>
                mv.tipo === 'saida' && new Date(mv.created_at).toDateString() === new Date().toDateString()
              ).reduce((sum, mv) => sum + Math.abs(mv.quantidade), 0)
            )}
          </strong>
        </div>
        <div style={{ ...cardStyle, background: '#f0fdf4', color: '#15803d' }}>
          <div>Entradas hoje</div>
          <strong style={valorStyle}>
            {formatNumber(
              movimentacoes.filter(mv =>
                mv.tipo === 'entrada' && new Date(mv.created_at).toDateString() === new Date().toDateString()
              ).reduce((sum, mv) => sum + mv.quantidade, 0)
            )}
          </strong>
        </div>
      </div>

      {/* Tabela Estoque de Papel */}
      <div style={{ marginTop: 36 }}>
        {loading && <p>Carregando...</p>}
        {!loading && estoque.length === 0 && (
          <p style={{ color: '#b71c1c', fontWeight: 500 }}>
            Estoque vazio.<br />Cadastre os papéis na tabela "estoque_papel" do Supabase.
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
                  }}>Papel</th>
                  <th style={{
                    textAlign: 'center', padding: 12, fontWeight: 600,
                    fontSize: 16, color: '#1976d2', borderBottom: '2px solid #bbdefb'
                  }}>Gramatura</th>
                  <th style={{
                    textAlign: 'center', padding: 12, fontWeight: 600,
                    fontSize: 16, color: '#1976d2', borderBottom: '2px solid #bbdefb'
                  }}>Quantidade</th>
                  <th style={{ borderBottom: '2px solid #bbdefb' }}></th>
                </tr>
              </thead>
              <tbody>
                {estoque.map((item) => {
                  const nome = (item.papeis?.nome + ' ' + (item.papeis?.gramatura || '')).trim().toUpperCase();
                  const limite = LIMITES_PAPEL[nome];
                  let bg = '#f8fafc';
                  if (limite !== undefined) {
                    if (item.quantidade_atual <= limite) {
                      bg = '#ffebee';
                    } else if (item.quantidade_atual <= (limite * 1.5)) {
                      bg = '#fffde7';
                    }
                  }
                  return (
                    <tr key={item.id} style={{ background: bg, transition: 'background 0.2s' }}>
                      <td style={{ padding: 10, fontWeight: 500 }}>
                        {item.papeis?.nome || '-'}
                      </td>
                      <td style={{ padding: 10, textAlign: 'center' }}>
                        {item.papeis?.gramatura || '-'}
                      </td>
                      <td style={{ padding: 10, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          fontSize: 16,
                          color:
                            limite !== undefined && item.quantidade_atual <= limite
                              ? '#b71c1c'
                              : limite !== undefined && item.quantidade_atual <= (limite * 1.5)
                                ? '#bfa900'
                                : '#2e7d32',
                          borderRadius: 6,
                          padding: '3px 12px',
                          fontWeight: 700
                        }}>
                          {item.quantidade_atual}
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

      {/* Histórico de movimentações */}
      <div style={{ marginTop: 40 }}>
        <h2 style={{ color: "#2563eb", fontWeight: 700, marginBottom: 12 }}>Movimentações Recentes</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: '#fff',
            borderRadius: 10,
            boxShadow: '0 2px 12px #1565c011'
          }}>
            <thead>
              <tr style={{ background: "#e3f2fd" }}>
                <th style={{ padding: 10 }}>Data</th>
                <th style={{ padding: 10 }}>Tipo</th>
                <th style={{ padding: 10 }}>Papel</th>
                <th style={{ padding: 10 }}>Qtd</th>
                <th style={{ padding: 10 }}>Usuário</th>
                <th style={{ padding: 10 }}>Obs.</th>
              </tr>
            </thead>
            <tbody>
              {movimentacoes
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 20)
                .map((mv, i) => (
                  <tr key={i} style={{ background: mv.tipo === 'saida' ? '#fef2f2' : '#f0fdf4', fontSize: 15 }}>
                    <td style={{ padding: 8 }}>{mv.created_at ? new Date(mv.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                    <td style={{ padding: 8 }}>{mv.tipo}</td>
                    <td style={{ padding: 8 }}>
  {mv.papeis
    ? `${mv.papeis.nome} ${mv.papeis.gramatura || ''}`.trim().toUpperCase()
    : mv.papel_id}
</td>
                    <td style={{ padding: 8 }}>{formatNumber(Math.abs(mv.quantidade))}</td>
                    <td style={{ padding: 8 }}>{mv.usuario}</td>
                    <td style={{ padding: 8 }}>{mv.obs}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EstoquePapel;