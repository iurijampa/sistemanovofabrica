// ...existing code...
// Mova os hooks para dentro do componente RelatorioBatedores
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import ResumoSetor from '../components/ResumoSetor';
import "./RelatorioBatedores.css";

const normalizarNome = (nome) =>
  nome
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const RelatorioBatedores = () => {
  // Estado para resumo geral mensal
  const [dadosMensal, setDadosMensal] = useState([]);
  const [mesMensalSelecionado, setMesMensalSelecionado] = useState(new Date().getMonth() + 1);
  const [anoMensalSelecionado, setAnoMensalSelecionado] = useState(new Date().getFullYear());

  useEffect(() => {
    async function carregarResumoMensal() {
      const inicioMes = `${anoMensalSelecionado}-${String(mesMensalSelecionado).padStart(2, "0")}-01`;
      const fimMes = new Date(anoMensalSelecionado, mesMensalSelecionado, 0).getDate();
      const fimMesStr = `${anoMensalSelecionado}-${String(mesMensalSelecionado).padStart(2, "0")}-${String(fimMes).padStart(2, "0")}`;
      const { data: movimentacoes } = await supabase
        .from("movimentacoes")
        .select("data, pedido_id")
        .eq("setor_origem", "Batida")
        .eq("tipo", "concluiu")
        .gte("data", inicioMes)
        .lte("data", fimMesStr);
      // Buscar atividades relacionadas
      const idsPedidos = movimentacoes?.map(m => m.pedido_id) || [];
      const { data: atividadesRelacionadas } = await supabase
        .from("atividades")
        .select("id, quantidade_pecas")
        .in("id", idsPedidos);
      // Agrupa por dia
      const mapaQuantidade = {};
      atividadesRelacionadas?.forEach(a => {
        mapaQuantidade[a.id] = Number(a.quantidade_pecas || 1);
      });
      const dias = {};
      for (let i = 1; i <= fimMes; i++) {
        const diaStr = `${anoMensalSelecionado}-${String(mesMensalSelecionado).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
        dias[diaStr] = 0;
      }
      movimentacoes?.forEach(mov => {
        const dia = mov.data.slice(0, 10);
        const qtd = mapaQuantidade[mov.pedido_id] || 1;
        if (dias.hasOwnProperty(dia)) dias[dia] += qtd;
      });
      const dados = Object.entries(dias).map(([dia, total]) => ({ dia, total }));
      setDadosMensal(dados);
    }
    carregarResumoMensal();
  }, [mesMensalSelecionado, anoMensalSelecionado]);
  const [batedores, setBatedores] = useState([]);
  const [dados, setDados] = useState({});

  useEffect(() => {
    carregarBatedores();
  }, []);

  const carregarBatedores = async () => {
    const { data: batedores, error } = await supabase.from("batedores").select("*");
    if (error) {
      return;
    }
    setBatedores(batedores);
    calcularEstatisticas(batedores);
  };


  const calcularEstatisticas = async (batedores) => {
    const { data: movimentacoes, error } = await supabase
      .from("movimentacoes")
      .select("funcionariobatida, data")
      .neq("funcionariobatida", null);
    if (error) {
      return;
    }

    // Inicia as estatísticas
    const estatisticas = {};
    batedores.forEach(b => {
      estatisticas[normalizarNome(b.nome)] = { totalGeral: 0, totalHoje: 0, totalSemana: 0 };
    });

    // Cálculo de datas
    const hoje = new Date().toISOString().slice(0, 10);
    const now = new Date();
    // Segunda-feira da semana atual
    const inicioSemana = new Date(now);
    inicioSemana.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    inicioSemana.setHours(0,0,0,0);

  movimentacoes.forEach(mov => {
    if (!mov.funcionariobatida) return;
    const nomes = mov.funcionariobatida
      .split(",")
      .map(n => normalizarNome(n.trim()))
      .filter(n => n);

    // Busca quantidade de peças do pedido
    const quantidade = Number(mov.quantidade_pecas) || 1;
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


  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <section style={{ width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <h2 style={{ textAlign: "center" }}>Relatório dos Batedores</h2>
        <div className="relatorio-container" style={{ justifyContent: "center", display: "flex", flexWrap: "wrap", gap: "24px", width: "100%" }}>
          {batedores.map((b) => {
            const nomeKey = normalizarNome(b.nome);
            return (
              <div className="batedor-card" key={b.id} style={{ minWidth: 220, margin: "0", boxSizing: "border-box" }}>
                <img
                  src={b.foto_url || "https://via.placeholder.com/100"}
                  alt={b.nome}
                  className="batedor-foto"
                  style={{ display: "block", margin: "0 auto" }}
                />
                <h3 style={{ textAlign: "center" }}>{b.nome}</h3>
                <p style={{ textAlign: "center" }}><strong>Hoje:</strong> {dados[nomeKey]?.totalHoje || 0}</p>
                <p style={{ textAlign: "center" }}><strong>Semana:</strong> {dados[nomeKey]?.totalSemana || 0}</p>
                <p style={{ textAlign: "center" }}><strong>Média/Dia:</strong> {dados[nomeKey]?.media || 0}</p>
                <p style={{ textAlign: "center" }}><strong>Total Geral:</strong> {dados[nomeKey]?.totalGeral || 0}</p>
              </div>
            );
          })}
        </div>
      </section>

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
                <th style={{ padding: "8px 4px", borderBottom: "1px solid #eee" }}>Dia</th>
                <th style={{ padding: "8px 4px", borderBottom: "1px solid #eee" }}>Total de Peças</th>
              </tr>
            </thead>
            <tbody>
              {dadosMensal.map((d, idx) => (
                <tr key={d.dia} style={{ background: idx % 2 === 0 ? "#f9f9f9" : "#fff" }}>
                  <td style={{ padding: "6px 4px", textAlign: "center" }}>{d.dia.slice(8, 10)}/{d.dia.slice(5, 7)}</td>
                  <td style={{ padding: "6px 4px", textAlign: "center" }}>{d.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default RelatorioBatedores;
