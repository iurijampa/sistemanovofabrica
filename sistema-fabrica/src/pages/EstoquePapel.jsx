import React, { useEffect, 
  useState } from 'react';
import { supabase } from '../supabaseClient';
import ModalAlertaEstoque from '../components/ModalAlertaEstoque';



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
  const [adicionando, setAdicionando] = useState(false);
  // Estados para adicionar/excluir papel
  const [novoNome, setNovoNome] = useState('');
  const [novaGramatura, setNovaGramatura] = useState('');

  // Handler para aceitar texto livre na gramatura
  function handleGramaturaChange(e) {
    setNovaGramatura(e.target.value);
  }
  // Defina aqui a lógica real de admin. Agora pega do localStorage, salvo no login
  const isAdmin = localStorage.getItem('role') === 'admin';
  const [showAddBar, setShowAddBar] = useState(false);
  const [showDeleteBox, setShowDeleteBox] = useState(false);
  const [papeisParaExcluir, setPapeisParaExcluir] = useState([]);

  // Sempre que não for admin, garanta que os controles estejam desativados
  useEffect(() => {
    if (!isAdmin) {
      if (showAddBar) setShowAddBar(false);
      if (showDeleteBox) setShowDeleteBox(false);
      if (papeisParaExcluir.length > 0) setPapeisParaExcluir([]);
    }
  }, [isAdmin, showAddBar, showDeleteBox, papeisParaExcluir]);

  async function adicionarPapel(e) {
    e.preventDefault();
    if (adicionando) return;
    setAdicionando(true);
    const nome = novoNome.trim();
    const gramatura = novaGramatura.trim();
    if (!nome || !gramatura) {
      alert('Preencha nome e gramatura!');
      return;
    }
    // Não exige mais apenas números na gramatura
    // 1. Verifica se já existe papel com mesmo nome/gramatura
    const { data: papelExistente, error: errorBusca } = await supabase
      .from('papeis')
      .select('id')
      .eq('nome', nome)
      .eq('gramatura', gramatura)
      .maybeSingle();
    let papelId;
    if (errorBusca) {
      alert('Erro ao buscar papel: ' + errorBusca.message);
      return;
    }
    if (papelExistente && papelExistente.id) {
      papelId = papelExistente.id;
    } else {
      // Não existe, então insere
      const { data: novoPapel, error: errorInsert } = await supabase
        .from('papeis')
        .insert({ nome, gramatura })
        .select('id')
        .single();
      if (errorInsert) {
        alert('Erro ao adicionar papel: ' + errorInsert.message);
        return;
      }
      papelId = novoPapel.id;
    }
    // 2. Verifica se já existe estoque_papel para esse papel
    const { data: estoqueExistente, error: errorEstoqueBusca } = await supabase
      .from('estoque_papel')
      .select('id')
      .eq('papel_id', papelId)
      .maybeSingle();
    if (errorEstoqueBusca) {
      alert('Erro ao buscar estoque do papel: ' + errorEstoqueBusca.message);
      return;
    }
    if (!estoqueExistente) {
      const { error: errorEstoqueInsert } = await supabase
        .from('estoque_papel')
        .insert({ papel_id: papelId, quantidade_atual: 0 });
      if (errorEstoqueInsert) {
        // Se for erro 409 (duplicidade), apenas ignore, pois já existe
        if (errorEstoqueInsert.code !== '409') {
          alert('Erro ao criar estoque do papel: ' + errorEstoqueInsert.message);
          return;
        }
      }
    }
    setNovoNome('');
    setNovaGramatura('');
    setShowAddBar(false);
    setAdicionando(false);
    buscarEstoque();
  }
  const [estoque, setEstoque] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [movimentando, setMovimentando] = useState(null);
  const [tipoMov, setTipoMov] = useState('saida');
  const [qtdMov, setQtdMov] = useState(1);
  const [obsMov, setObsMov] = useState('');


// Para edição inline
const [editandoLimite, setEditandoLimite] = useState(null); // id do estoque_papel
const [novoLimite, setNovoLimite] = useState('');

// Função para obter o limite (apenas do banco)
function getLimite(item) {
  return item.limite_alerta !== undefined && item.limite_alerta !== null ? item.limite_alerta : undefined;
}

  const [baixoEstoque, setBaixoEstoque] = useState([]);
  const [showAlerta, setShowAlerta] = useState(false);

  useEffect(() => {
    buscarEstoque();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!loading && estoque.length > 0) {
      const emAlerta = estoque.filter((item) => {
        const limite = getLimite(item);
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
      .select('id, quantidade_atual, papel_id, limite_alerta, papeis:papel_id (nome, gramatura)')
      .order('papel_id', { ascending: true });
    const { data: movData } = await supabase
      .from('movimentacoes_papel')
      .select('*, papeis:papel_id (nome, gramatura), atividades:pedido_id (pedido)')
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
    {/* Barra de ações admin AGORA NA LINHA DO CABEÇALHO DA TABELA */}


    <h1 style={{ fontSize: 32, color: '#1976d2', fontWeight: 800, marginBottom: 20 }}>
      Estoque de Papel <span style={{ color: '#bbb', fontWeight: 400 }}>Stamp BLUE®</span>
    </h1>

    {showAlerta && baixoEstoque.length > 0 && (
      <ModalAlertaEstoque
        baixoEstoque={baixoEstoque}
        onClose={() => setShowAlerta(false)}
      />
    )}


      {/* Cards de Resumo */}
      <div style={{
        display: 'flex',
        gap: 24,
        margin: '22px 0 28px 0',
        flexWrap: 'nowrap',
        alignItems: 'stretch',
        maxWidth: 900,
        minWidth: 0,
        width: '100%',
        overflow: 'hidden',
      }}>
        <div style={{ ...cardStyle, minWidth: 0, flex: 1 }}>
          <div>Total em estoque</div>
          <strong style={valorStyle}>{formatNumber(estoque.reduce((sum, p) => sum + (p.quantidade_atual || 0), 0))}</strong>
        </div>
        <div style={{ ...cardStyle, background: '#fef2f2', color: '#b91c1c', minWidth: 0, flex: 1 }}>
          <div>Saídas hoje</div>
          <strong style={valorStyle}>
            {formatNumber(
              movimentacoes.filter(mv =>
                mv.tipo === 'saida' && new Date(mv.created_at).toDateString() === new Date().toDateString()
              ).reduce((sum, mv) => sum + Math.abs(mv.quantidade), 0)
            )}
          </strong>
        </div>
        <div style={{ ...cardStyle, background: '#f0fdf4', color: '#15803d', minWidth: 0, flex: 1 }}>
          <div>Entradas hoje</div>
          <strong style={valorStyle}>
            {formatNumber(
              movimentacoes.filter(mv =>
                mv.tipo === 'entrada' && new Date(mv.created_at).toDateString() === new Date().toDateString()
              ).reduce((sum, mv) => sum + mv.quantidade, 0)
            )}
          </strong>
        </div>
        <div style={{
          ...cardStyle,
          background: '#ffebee', // vermelho claro de alerta
          color: '#b71c1c', // vermelho escuro para o texto
          border: '2px solid #e53935',
          minWidth: 0,
          maxWidth: 260,
          flex: 1.2,
          whiteSpace: 'normal',
          overflowY: 'auto',
          overflowX: 'hidden',
          textOverflow: 'ellipsis',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          boxShadow: '0 2px 16px #e5393522',
        }}>
          <div>Papéis no limite</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginTop: 8, lineHeight: 1.3, wordBreak: 'break-word' }}>
            {baixoEstoque.length === 0 ? 'Nenhum' : baixoEstoque.map(b => (
              <span key={b.id} style={{ display: 'inline-block', marginRight: 8 }}>
                {(b.papeis?.nome + (b.papeis?.gramatura ? ' ' + b.papeis.gramatura : '')).toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela Estoque de Papel */}
      <div style={{ marginTop: 16 }}>
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
                  {isAdmin && showDeleteBox && <th style={{ width: 40, borderBottom: '2px solid #bbdefb' }}></th>}
                  <th style={{ textAlign: 'left', padding: 12, fontWeight: 600, fontSize: 16, letterSpacing: 0.2, color: '#1976d2', borderBottom: '2px solid #bbdefb' }}>Papel</th>
                  <th style={{ textAlign: 'center', padding: 12, fontWeight: 600, fontSize: 16, color: '#1976d2', borderBottom: '2px solid #bbdefb' }}>Gramatura</th>
                  <th style={{ textAlign: 'center', padding: 12, fontWeight: 600, fontSize: 16, color: '#1976d2', borderBottom: '2px solid #bbdefb' }}>Quantidade</th>
                  <th style={{ borderBottom: '2px solid #bbdefb', minWidth: 220, padding: 0 }}>
                    {/* Botões admin na barra de cabeçalho */}
                    <div style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      width: '100%',
                      height: '100%',
                      paddingRight: 12
                    }}>
                      {isAdmin && (
                        <>
                          <button
                            style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
                            onClick={() => { setShowAddBar(v => !v); setShowDeleteBox(false); }}
                          >Adicionar Papel</button>
                          <button
                            style={{ background: showDeleteBox ? '#b91c1c' : '#e11d48', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
                            onClick={() => { setShowDeleteBox(v => !v); setShowAddBar(false); setPapeisParaExcluir([]); }}
                          >Excluir</button>
                        </>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Linha de adicionar papel no topo da tabela */}
                {isAdmin && showAddBar && (
                  <tr style={{ background: '#e3f2fd' }}>
                    {showDeleteBox && <td></td>}
                    <td style={{ padding: 8 }}>
                      <input
                        type="text"
                        placeholder="Nome do papel"
                        value={novoNome}
                        onChange={e => setNovoNome(e.target.value)}
                        style={{ padding: 6, borderRadius: 4, border: '1px solid #bbb', minWidth: 100, fontSize: 15 }}
                        autoFocus
                      />
                    </td>
                    <td style={{ padding: 8, textAlign: 'center' }}>
                    <input
                      type="text"
                      placeholder="Gramatura (ex: 75G)"
                      value={novaGramatura}
                      onChange={handleGramaturaChange}
                      style={{ padding: 6, borderRadius: 4, border: '1px solid #bbb', minWidth: 60, fontSize: 15 }}
                    />
                    </td>
                    <td style={{ padding: 8, textAlign: 'center', color: '#888' }}>-</td>
                    <td style={{ padding: 8, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                      <button
                        style={{ background: adicionando ? '#90caf9' : '#1976d2', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', fontWeight: 700, fontSize: 15, cursor: adicionando ? 'not-allowed' : 'pointer' }}
                        onClick={adicionarPapel}
                        disabled={adicionando}
                      >{adicionando ? 'Carregando...' : 'Salvar'}</button>
                      <button
                        style={{ background: '#eee', color: '#888', border: 'none', borderRadius: 4, padding: '6px 14px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
                        onClick={() => setShowAddBar(false)}
                      >Cancelar</button>
                    </td>
                  </tr>
                )}
                {estoque.map((item) => {
                  const limite = getLimite(item);
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
                      {isAdmin && showDeleteBox && (
                        <td style={{ padding: 0, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={papeisParaExcluir.includes(item.papel_id)}
                            onChange={e => {
                              if (e.target.checked) setPapeisParaExcluir(prev => [...prev, item.papel_id]);
                              else setPapeisParaExcluir(prev => prev.filter(id => id !== item.papel_id));
                            }}
                            style={{ width: 18, height: 18 }}
                            title={papeisParaExcluir.includes(item.papel_id) ? 'Desmarcar' : 'Selecionar para excluir'}
                          />
                        </td>
                      )}
                      <td style={{ padding: 10, fontWeight: 500 }}>{item.papeis?.nome || '-'}</td>
                      <td style={{ padding: 10, textAlign: 'center' }}>{item.papeis?.gramatura || '-'}</td>
                      <td style={{ padding: 10, textAlign: 'center', fontWeight: 700, color:
                        limite !== undefined && item.quantidade_atual <= limite
                          ? '#b71c1c'
                          : limite !== undefined && item.quantidade_atual <= (limite * 1.5)
                            ? '#bfa900'
                            : '#2e7d32',
                      }}>{item.quantidade_atual}</td>
                      <td style={{ padding: 10, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                        <button
                          style={{ background: '#007FFF', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
                          onClick={() => {
                            setMovimentando(item.id);
                            setTipoMov('saida');
                            setQtdMov(1);
                            setObsMov('');
                          }}
                        >
                          Movimentar
                        </button>
                        {isAdmin && (
                          <button
                            style={{ background: '#f59e42', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
                            onClick={() => {
                              setEditandoLimite(item.id);
                              setNovoLimite(limite !== undefined ? limite : '');
                            }}
                          >Limite</button>
                        )}
                        {editandoLimite === item.id && (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: '#fffbe7', borderRadius: 6, padding: '6px 10px', boxShadow: '0 2px 8px #f59e4211' }}>
                            <input
                              type="number"
                              min={1}
                              value={novoLimite}
                              style={{ width: 70, fontSize: 15, borderRadius: 4, border: '1px solid #bbb', padding: '3px 6px' }}
                              onChange={e => setNovoLimite(e.target.value)}
                            />
                            <button
                              style={{ background: '#43a047', color: '#fff', borderRadius: 6, padding: '4px 10px', fontWeight: 600, border: 'none', fontSize: 14 }}
                              onClick={async () => {
                                const n = Number(novoLimite);
                                if (!n || n < 1) { alert('Informe um valor válido!'); return; }
                                await supabase.from('estoque_papel').update({ limite_alerta: n }).eq('id', item.id);
                                setEditandoLimite(null);
                                buscarEstoque();
                              }}
                            >Salvar</button>
                            <button
                              style={{ background: '#eee', color: '#888', borderRadius: 6, padding: '4px 10px', border: 'none', fontWeight: 600, fontSize: 14 }}
                              onClick={() => setEditandoLimite(null)}
                            >Cancelar</button>
                          </div>
                        )}
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
            {/* Botão de confirmação de exclusão embaixo da tabela, se algum papel estiver selecionado (apenas admin) */}
            {isAdmin && showDeleteBox && papeisParaExcluir.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  style={{ background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 18px', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}
                  onClick={async () => {
                    // Executa todas as deleções no banco antes de atualizar o front
                    await Promise.all(papeisParaExcluir.map(async (papelId) => {
                      await supabase.from('movimentacoes_papel').delete().eq('papel_id', papelId);
                      await supabase.from('estoque_papel').delete().eq('papel_id', papelId);
                      const { error } = await supabase.from('papeis').delete().eq('id', papelId);
                      if (error && error.code !== '406' && error.code !== '204') {
                        alert('Erro ao excluir papel: ' + error.message);
                      }
                    }));
                    setPapeisParaExcluir([]);
                    setShowDeleteBox(false);
                    buscarEstoque();
                  }}
                >Excluir Selecionados</button>
                <button
                  style={{ background: '#eee', color: '#888', border: 'none', borderRadius: 6, padding: '10px 18px', fontWeight: 600, fontSize: 16, cursor: 'pointer', marginLeft: 8 }}
                  onClick={() => { setShowDeleteBox(false); setPapeisParaExcluir([]); }}
                >Cancelar</button>
              </div>
            )}
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
    <th style={{ padding: 10 }}>Máquina</th>
      <th style={{ padding: 10 }}>Pedido</th>
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
        <td style={{ padding: 8 }}>{mv.maquina || '-'}</td>
        <td style={{ padding: 8 }}>
          {/* Exibe o nome do pedido se disponível */}
          {mv.atividades?.pedido || mv.pedido_id || '-'}
        </td>
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