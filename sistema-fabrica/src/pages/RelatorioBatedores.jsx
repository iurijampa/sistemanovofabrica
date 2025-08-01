import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import ResumoSetor from '../components/ResumoSetor';
import Modal from "react-modal";
import "./RelatorioBatedores.css";

const RelatorioBatedores = () => {
  const [usuario, setUsuario] = useState(() => JSON.parse(localStorage.getItem('usuario')));
  const setorLogado = usuario?.setor;

  useEffect(() => {
    const atualizarUsuario = () => {
      setUsuario(JSON.parse(localStorage.getItem('usuario')));
    };
    window.addEventListener('storage', atualizarUsuario);
    return () => window.removeEventListener('storage', atualizarUsuario);
  }, []);

  const normalizarNome = (nome) =>
    nome
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  // Estados gerais
  const [diaExpandido, setDiaExpandido] = useState(null);
  const [movimentacoesMensal, setMovimentacoesMensal] = useState([]);
  const [mapaQuantidadeMensal, setMapaQuantidadeMensal] = useState({});
  const [mapaNomePedidoMensal, setMapaNomePedidoMensal] = useState({});
  const [dadosMensal, setDadosMensal] = useState([]);
  const [mesMensalSelecionado, setMesMensalSelecionado] = useState(new Date().getMonth() + 1);
  const [anoMensalSelecionado, setAnoMensalSelecionado] = useState(new Date().getFullYear());
  const [batedores, setBatedores] = useState([]);
  const [dados, setDados] = useState({});

  // Estados do modal
  const [modalAberto, setModalAberto] = useState(false);
  const [batedorEditando, setBatedorEditando] = useState(null);
  const [nomeBatedor, setNomeBatedor] = useState('');
  const [imagemBatedor, setImagemBatedor] = useState(null);
  const [previewImagem, setPreviewImagem] = useState('');

  useEffect(() => {
    async function carregarResumoMensal() {
      const inicioMes = `${anoMensalSelecionado}-${String(mesMensalSelecionado).padStart(2, "0")}-01`;
      const fimMes = new Date(anoMensalSelecionado, mesMensalSelecionado, 0).getDate();
      const fimMesStr = `${anoMensalSelecionado}-${String(mesMensalSelecionado).padStart(2, "0")}-${String(fimMes).padStart(2, "0")}`;
      const fimMesStrFull = `${fimMesStr} 23:59:59.999999`;
      const { data: movimentacoes } = await supabase
        .from("movimentacoes")
        .select("data, pedido_id, maquinabatida, funcionariobatida")
        .eq("setor_origem", "Batida")
        .eq("tipo", "concluiu")
        .gte("data", inicioMes)
        .lte("data", fimMesStrFull);

      const idsPedidos = movimentacoes?.map(m => m.pedido_id) || [];
      const { data: atividadesRelacionadas } = await supabase
        .from("atividades")
        .select("id, quantidade_pecas, pedido")
        .in("id", idsPedidos);

      const mapaQuantidade = {};
      const mapaNomePedido = {};
      atividadesRelacionadas?.forEach(a => {
        mapaQuantidade[a.id] = Number(a.quantidade_pecas || 1);
        mapaNomePedido[a.id] = a.pedido || a.id;
      });

      const dias = {};
      for (let i = 1; i <= fimMes; i++) {
        const diaStr = `${anoMensalSelecionado}-${String(mesMensalSelecionado).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
        dias[diaStr] = { total: 0, prensa: 0, calandra: 0 };
      }
      movimentacoes?.forEach(mov => {
        const dia = mov.data.slice(0, 10);
        const qtd = mapaQuantidade[mov.pedido_id] || 1;
        if (dias.hasOwnProperty(dia)) {
          dias[dia].total += qtd;
          if (mov.maquinabatida && mov.maquinabatida.toLowerCase().includes("prensa")) dias[dia].prensa += qtd;
          if (mov.maquinabatida && mov.maquinabatida.toLowerCase().includes("calandra")) dias[dia].calandra += qtd;
        }
      });
      const dados = Object.entries(dias).map(([dia, obj]) => ({ dia, ...obj }));
      setDadosMensal(dados);
      setMovimentacoesMensal(movimentacoes || []);
      setMapaQuantidadeMensal(mapaQuantidade);
      setMapaNomePedidoMensal(mapaNomePedido);
    }
    carregarResumoMensal();
  }, [mesMensalSelecionado, anoMensalSelecionado]);

  useEffect(() => {
    carregarBatedores();
  }, []);

  const carregarBatedores = async () => {
    const { data: batedores, error } = await supabase.from("batedores").select("*");
    if (error) return;
    setBatedores(batedores);
    calcularEstatisticas(batedores);
  };

  const calcularEstatisticas = async (batedores) => {
    const { data: movimentacoes, error } = await supabase
      .from("movimentacoes")
      .select("funcionariobatida, data, pedido_id")
      .neq("funcionariobatida", null);
    if (error) return;

    const idsPedidos = movimentacoes?.map(m => m.pedido_id).filter(Boolean) || [];
    const { data: atividadesRelacionadas } = await supabase
      .from("atividades")
      .select("id, quantidade_pecas")
      .in("id", idsPedidos);

    const mapaQuantidade = {};
    atividadesRelacionadas?.forEach(a => {
      mapaQuantidade[a.id] = Number(a.quantidade_pecas || 1);
    });

    const estatisticas = {};
    batedores.forEach(b => {
      estatisticas[normalizarNome(b.nome)] = { totalGeral: 0, totalHoje: 0, totalSemana: 0 };
    });

    const hoje = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const inicioSemana = new Date(now);
    inicioSemana.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    inicioSemana.setHours(0,0,0,0);

    movimentacoes.forEach(mov => {
      if (!mov.funcionariobatida) return;
      const nomes = mov.funcionariobatida
        .split(",")
        .map(n => normalizarNome(n.trim()))
        .filter(n => n);

      const quantidade = mapaQuantidade[mov.pedido_id] || 1;
      const valorPorBatedor = quantidade / nomes.length;

      Object.entries(estatisticas).forEach(([nomeKey, stats]) => {
        if (nomes.some(n => n === nomeKey)) {
          stats.totalGeral += valorPorBatedor;
          const dataFormatada = mov.data?.slice(0, 10);
          const dataMov = new Date(mov.data);
          if (dataFormatada === hoje) stats.totalHoje += valorPorBatedor;
          if (dataMov >= inicioSemana) stats.totalSemana += valorPorBatedor;
        }
      });
    });

    Object.keys(estatisticas).forEach(nomeKey => {
      estatisticas[nomeKey].media = Math.round(estatisticas[nomeKey].totalSemana / ((now.getDay() || 1)));
    });

    setDados(estatisticas);
  };

  // Função para upload de imagem
  const uploadImagem = async (file) => {
    if (!file) return '';
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('batedores-fotos')
      .upload(fileName, file);
    if (error) {
      alert("Erro ao enviar imagem.");
      return '';
    }
    return supabase.storage.from('batedores-fotos').getPublicUrl(fileName).data.publicUrl;
  };

  // Modal: abrir para adicionar/editar
  const abrirModal = (batedor = null) => {
    setBatedorEditando(batedor);
    setNomeBatedor(batedor?.nome || '');
    setPreviewImagem(batedor?.foto_url || '');
    setImagemBatedor(null);
    setModalAberto(true);
  };

  const fecharModal = () => setModalAberto(false);

  // Salvar batedor (adicionar ou editar)
  const salvarBatedor = async () => {
    let foto_url = previewImagem;
    if (imagemBatedor) {
      const url = await uploadImagem(imagemBatedor);
      if (url) foto_url = url;
    }
    if (batedorEditando) {
      // Editar
      const { error } = await supabase.from('batedores')
        .update({ nome: nomeBatedor, foto_url })
        .eq('id', batedorEditando.id);
      if (!error) {
        alert('Batedor editado!');
        carregarBatedores();
        fecharModal();
      } else {
        alert('Erro ao editar batedor.');
      }
    } else {
      // Adicionar
      const { error } = await supabase.from('batedores')
        .insert([{ nome: nomeBatedor, foto_url }]);
      if (!error) {
        alert('Batedor adicionado!');
        carregarBatedores();
        fecharModal();
      } else {
        alert('Erro ao adicionar batedor.');
      }
    }
  };

  // Remover batedor
  const removerBatedor = async (id) => {
    if (window.confirm("Tem certeza que deseja remover este batedor?")) {
      const { error } = await supabase.from("batedores").delete().eq("id", id);
      if (!error) {
        carregarBatedores();
        alert("Batedor removido!");
      } else {
        alert("Erro ao remover batedor.");
      }
    }
  };

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <section style={{ width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <h2 style={{ textAlign: "center" }}>Relatório dos Batedores</h2>
        {setorLogado === "Admin" && (
          <button onClick={() => abrirModal()} style={{ marginBottom: 16 }}>Adicionar Batedor</button>
        )}
        <div className="relatorio-container" style={{ justifyContent: "center", display: "flex", flexWrap: "wrap", gap: "24px", width: "100%" }}>
          {batedores.map((b) => {
            const nomeKey = normalizarNome(b.nome);
            return (
              <div className="batedor-card" key={b.id} style={{ minWidth: 220, margin: "0", boxSizing: "border-box" }}>
                <img
                  src={b.foto_url || "https://via.placeholder.com/100"}
                  alt={b.nome}
                  className="batedor-foto"
                  style={{ display: "block", margin: "0 auto", width: 100, height: 100, objectFit: "cover", borderRadius: 8 }}
                />
                <h3 style={{ textAlign: "center" }}>{b.nome}</h3>
                <p style={{ textAlign: "center" }}><strong>Hoje:</strong> {dados[nomeKey]?.totalHoje || 0}</p>
                <p style={{ textAlign: "center" }}><strong>Semana:</strong> {dados[nomeKey]?.totalSemana || 0}</p>
                <p style={{ textAlign: "center" }}><strong>Média/Dia:</strong> {dados[nomeKey]?.media || 0}</p>
                <p style={{ textAlign: "center" }}><strong>Total Geral:</strong> {dados[nomeKey]?.totalGeral || 0}</p>
                {/* Botões só para admin */}
                {setorLogado === "Admin" && (
                  <div style={{ textAlign: "center", marginTop: 8 }}>
                    <button onClick={() => abrirModal(b)} style={{ marginRight: 8 }}>Editar</button>
                    <button onClick={() => removerBatedor(b.id)} style={{ color: "red" }}>Remover</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Modal para adicionar/editar batedor */}
      <Modal
        isOpen={modalAberto}
        onRequestClose={fecharModal}
        ariaHideApp={false}
        style={{
          content: {
            maxWidth: 400,
            margin: "auto",
            borderRadius: 10,
            padding: 24,
            boxShadow: "0 1px 7px #0002"
          }
        }}
      >
        <h2 style={{ textAlign: "center" }}>{batedorEditando ? "Editar Batedor" : "Adicionar Batedor"}</h2>
        <div style={{ marginBottom: 16 }}>
          <label>Nome:</label>
          <input
            type="text"
            value={nomeBatedor}
            onChange={e => setNomeBatedor(e.target.value)}
            style={{ width: "100%", marginTop: 4 }}
            placeholder="Nome do batedor"
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Foto:</label>
          <input
            type="file"
            accept="image/*"
            onChange={e => {
              setImagemBatedor(e.target.files[0]);
              setPreviewImagem(URL.createObjectURL(e.target.files[0]));
            }}
            style={{ marginTop: 4 }}
          />
          {previewImagem && (
            <img src={previewImagem} alt="Preview" style={{ width: 100, height: 100, objectFit: "cover", marginTop: 8, borderRadius: 8 }} />
          )}
        </div>
        <div style={{ textAlign: "center" }}>
          <button onClick={salvarBatedor} style={{ marginRight: 8 }}>
            {batedorEditando ? "Salvar Alterações" : "Adicionar"}
          </button>
          <button onClick={fecharModal}>Cancelar</button>
        </div>
      </Modal>

      <section style={{ marginTop: "40px", width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <h2 style={{ textAlign: "center" }}>Resumo Geral do Setor Batida</h2>
        <ResumoSetor setor="Batida" exibirCards={false} />
      </section>

      {/* Resumo geral mensal */}
      <section style={{ marginTop: "32px", width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", alignItems: "center", background: "#fff", borderRadius: 10, boxShadow: "0 1px 7px #0001", padding: 24 }}>
        <h2 style={{ textAlign: "center", marginBottom: 16 }}>Resumo Geral Mensal</h2>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, marginRight: 8 }}>Selecione o mês:</label>
          <select value={mesMensalSelecionado} onChange={e => setMesMensalSelecionado(Number(e.target.value))} style={{ marginRight: 8 }}>
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>{String(i + 1).padStart(2, "0")}</option>
            ))}
          </select>
          <select value={anoMensalSelecionado} onChange={e => setAnoMensalSelecionado(Number(e.target.value))}>
            {[...Array(5)].map((_, i) => {
              const ano = new Date().getFullYear() - i;
              return <option key={ano} value={ano}>{ano}</option>;
            })}
          </select>
        </div>
        <div style={{ width: "100%", maxWidth: 900, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, boxShadow: "0 1px 7px #0001" }}>
            <thead>
              <tr>
                <th style={{ padding: "8px 4px", borderBottom: "1px solid #eee", textAlign: "center" }}>Dia</th>
                <th style={{ padding: "8px 4px", borderBottom: "1px solid #eee", textAlign: "center" }}>Prensa</th>
                <th style={{ padding: "8px 4px", borderBottom: "1px solid #eee", textAlign: "center" }}>Calandra</th>
                <th style={{ padding: "8px 4px", borderBottom: "1px solid #eee", textAlign: "center" }}>Total de Peças</th>
              </tr>
            </thead>
            <tbody>
              {dadosMensal.map((d, idx) => (
                <React.Fragment key={d.dia}>
                  <tr style={{ background: idx % 2 === 0 ? "#f9f9f9" : "#fff" }}>
                    <td style={{ padding: "6px 4px", textAlign: "center" }}>{d.dia.slice(8, 10)}/{d.dia.slice(5, 7)}</td>
                    <td style={{ padding: "6px 4px", textAlign: "center" }}>{d.prensa}</td>
                    <td style={{ padding: "6px 4px", textAlign: "center" }}>{d.calandra}</td>
                    <td style={{ padding: "6px 4px", textAlign: "center" }}>
                      {d.total}
                      <button
                        style={{ marginLeft: 8, fontSize: 12, cursor: "pointer" }}
                        onClick={() => setDiaExpandido(diaExpandido === d.dia ? null : d.dia)}
                        title="Ver pedidos do dia"
                      >
                        {diaExpandido === d.dia ? "▲" : "▼"}
                      </button>
                    </td>
                  </tr>
                  {diaExpandido === d.dia && (
                    <tr>
                      <td colSpan={4} style={{ background: "#f6f6f6", padding: "8px 16px" }}>
                        <strong>Pedidos do dia:</strong>
                        <ul style={{ margin: "8px 0 0 0", padding: 0, listStyle: "none" }}>
                          {movimentacoesMensal
                            .filter(mov => mov.data.slice(0, 10) === d.dia)
                            .map((mov, i) => (
                              <li key={mov.pedido_id + i} style={{ marginBottom: 4 }}>
                                Pedido: <b>{mapaNomePedidoMensal[mov.pedido_id] || mov.pedido_id}</b> | Peças: <b>{mapaQuantidadeMensal[mov.pedido_id] || 1}</b> | Máquina: <b>{mov.maquinabatida}</b> | Funcionário: <b>{mov.funcionariobatida || '-'}</b>
                              </li>
                            ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default RelatorioBatedores;