import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

// Metas por setor
const METAS_SETOR = {
  Gabarito: 10,
  Impressao: 12,
  Batida: 10,
  Costura: 8,
  Embalagem: 8
};

function getIntervaloHojeBrasil() {
  const hoje = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  const [mes, dia, ano] = hoje.split(",")[0].split("/");
  const inicio = new Date(`${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}T00:00:00-03:00`);
  const fim = new Date(`${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}T23:59:59-03:00`);
  return {
    inicio: inicio.toISOString().slice(0, 19),
    fim: fim.toISOString().slice(0, 19)
  };
}
function formatarMinutos(minutos) {
  if (!minutos || isNaN(minutos) || minutos === Infinity) return "-";
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  return `${h ? `${h}h ` : ""}${m}min`;
}
function capitalizar(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
// Conta dias úteis (segunda-sábado, exclui domingo)
function contarDiasUteis(startDate, endDate) {
  let count = 0;
  let current = new Date(startDate);
  endDate = new Date(endDate);
  while (current <= endDate) {
    const day = current.getDay();
    if (day >= 1 && day <= 6) count++; // 1=seg, ..., 6=sab
    current.setDate(current.getDate() + 1);
  }
  return count || 1;
}
function getSemanaLabels() {
  const hoje = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const diaSemana = hoje.getDay();
  const diasParaSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
  const segunda = new Date(hoje);
  segunda.setDate(hoje.getDate() - diasParaSegunda);

  const dias = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(segunda);
    d.setDate(segunda.getDate() + i);
    dias.push({
      date: d,
      label: d.toLocaleDateString("pt-BR", { weekday: "short" }),
      ymd: d.toISOString().slice(0, 10),
    });
  }
  return dias;
}

export default function ResumoSetor({ setor }) {
  const [hoje, setHoje] = useState(0);
  const [media, setMedia] = useState(0);
  const [tempoMedio, setTempoMedio] = useState("-");
  const [barrasSemana, setBarrasSemana] = useState([]);
  const [parabens, setParabens] = useState(false);

  // Seleciona meta do setor
  const metaSetor = METAS_SETOR[capitalizar(setor)] || 10;

  useEffect(() => {
    async function carregarResumo() {
      const setorCap = capitalizar(setor);

      // ... mesmas queries de sempre
      const { inicio, fim } = getIntervaloHojeBrasil();

      const { data: concluidasTodas } = await supabase
        .from("movimentacoes")
        .select("*")
        .eq("setor_origem", setorCap)
        .eq("tipo", "concluiu")
        .order("data", { ascending: true });

      const { data: entradasTodas } = await supabase
        .from("movimentacoes")
        .select("*")
        .eq("setor_destino", setorCap)
        .order("data", { ascending: true });

      // Média histórica segunda-sábado
      if (concluidasTodas?.length > 0) {
        const dataPrimeira = new Date(concluidasTodas[0].data);
        const dataUltima = new Date(concluidasTodas[concluidasTodas.length - 1].data);
        const diasUteis = contarDiasUteis(dataPrimeira, dataUltima);
        setMedia(Math.round(concluidasTodas.length / diasUteis));
      } else {
        setMedia(0);
      }

      // Gráfico semanal: barras verticais, lado a lado
      const semana = getSemanaLabels();
      const barras = semana.map(({ ymd, label }) => {
        const total = concluidasTodas?.filter(c => c.data.slice(0, 10) === ymd).length || 0;
        let cor = "#ef4444"; // vermelho
        const pct = total / metaSetor;
        if (pct >= 1) cor = "#22c55e";
        else if (pct >= 0.51) cor = "#eab308";
        else if (total === 0) cor = "#e5e7eb";
        return { data: label, total, cor, pct: Math.min(1, pct) };
      });
      setBarrasSemana(barras);

      // Hoje
      const hojeISO = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
      const concluidasHoje = concluidasTodas?.filter(c => c.data.slice(0, 10) === hojeISO) || [];
      setHoje(concluidasHoje.length);
      setParabens(concluidasHoje.length >= metaSetor);

      // Tempo médio da semana (igual antes)
      const inicioSemana = new Date(semana[0].ymd + "T00:00:00-03:00");
      const fimSemana = new Date(semana[5].ymd + "T23:59:59-03:00");
      const entradasSemana = entradasTodas?.filter(e => {
        const d = new Date(e.data);
        return d >= inicioSemana && d <= fimSemana;
      }) || [];
      const concluidasSemana = concluidasTodas?.filter(c => {
        const d = new Date(c.data);
        return d >= inicioSemana && d <= fimSemana;
      }) || [];

      function calcularTempos(pedidosConcluidos, entradasSetor) {
        const tempos = [];
        pedidosConcluidos.forEach((saida) => {
          const entrada = entradasSetor
            .filter(e => e.pedido_id === saida.pedido_id)
            .sort((a, b) => new Date(b.data) - new Date(a.data))[0];
          if (entrada && saida) {
            const tempoMin = (new Date(saida.data) - new Date(entrada.data)) / (1000 * 60);
            if (tempoMin > 0 && tempoMin < 15 * 24 * 60) tempos.push(tempoMin);
          }
        });
        return tempos;
      }
      const temposSemana = calcularTempos(concluidasSemana, entradasSemana);
      setTempoMedio(formatarMinutos(
        temposSemana.length ? temposSemana.reduce((a, b) => a + b, 0) / temposSemana.length : 0
      ));
    }
    carregarResumo();
  }, [setor]);

  // Visual
  const cardStyle = {
    minWidth: 110,
    minHeight: 70,
    borderRadius: 12,
    background: "#fff",
    boxShadow: "0 1px 7px #0001",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontSize: 18,
    border: "2px solid #eee",
    color: "#333"
  };
  const labelStyle = { fontSize: 14, fontWeight: 400, color: "#666", marginBottom: 3 };

  // Barras verticais (moderno, compacto)
  const barContainer = {
    display: "flex",
    gap: 13,
    alignItems: "flex-end",
    marginTop: 7,
    marginBottom: 5,
    minHeight: 60,
    height: 60
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* HOJE */}
        <div style={cardStyle}>
          <div style={labelStyle}>Hoje</div>
          <div>
            {hoje}
            {parabens && (
              <span style={{ fontSize: 28, marginLeft: 7 }} title="Meta batida!">🎉</span>
            )}
          </div>
        </div>
        {/* MÉDIA */}
        <div style={cardStyle}>
          <div style={labelStyle}>Média</div>
          <div>{media}</div>
        </div>
        {/* TEMPO MÉDIO */}
        <div style={cardStyle}>
          <div style={labelStyle}>Tempo médio</div>
          <div>{tempoMedio}</div>
        </div>
        {/* GRÁFICO SEMANAL */}
        <div style={{ ...cardStyle, minWidth: 175, padding: 8, alignItems: "stretch", position: "relative" }}>
          <div style={{ ...labelStyle, marginBottom: 2, textAlign: "center" }}>Resumo semanal</div>
          <div style={barContainer}>
            {barrasSemana.map((d, idx) => {
              // Barra cheia preenchida em porcentagem
              const alturaMax = 45;
              return (
                <div key={idx} style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  height: "100%",
                  minWidth: 18
                }}>
                  {/* Sombra da barra (base cinza claro) */}
                  <div style={{
                    width: 14,
                    height: alturaMax,
                    background: "#eee",
                    borderRadius: 5,
                    position: "relative",
                    overflow: "hidden",
                    marginBottom: 2,
                    display: "flex",
                    alignItems: "flex-end"
                  }}>
                    {/* Barra preenchida conforme a porcentagem */}
                    <div style={{
                      width: "100%",
                      height: `${d.pct * 100}%`,
                      background: d.cor,
                      borderRadius: 5,
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      transition: "height .2s"
                    }} />
                  </div>
                  {/* Número */}
                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: d.cor,
                    marginTop: 2,
                    minHeight: 15
                  }}>{d.total > 0 ? d.total : ''}</div>
                  {/* Nome do dia */}
                  <div style={{
                    fontSize: 12,
                    color: "#888",
                    marginTop: 1,
                    fontWeight: 500
                  }}>{d.data}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
