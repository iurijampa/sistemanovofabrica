import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const getHojeISO = () => new Date().toISOString().slice(0, 10);
function formatarMinutos(minutos) {
  if (!minutos || isNaN(minutos) || minutos === Infinity) return "-";
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  return `${h ? `${h}h ` : ""}${m}min`;
}
function capitalizar(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function ResumoSetor({ setor }) {
  const [hoje, setHoje] = useState(0);
  const [media, setMedia] = useState(0);
  const [tempoMedio, setTempoMedio] = useState("-");
  const [melhorTempo, setMelhorTempo] = useState("-");

  useEffect(() => {
    async function carregarResumo() {
      const setorCap = capitalizar(setor);

      const todayISO = getHojeISO();
      const inicioSemana = new Date();
      inicioSemana.setDate(inicioSemana.getDate() - 6);
      const semanaISO = inicioSemana.toISOString().slice(0, 10);

      const { data: concluidasHoje } = await supabase
        .from("movimentacoes")
        .select("*")
        .eq("setor_origem", setorCap)
        .eq("tipo", "concluiu")
        .gte("data", todayISO)
        .lte("data", todayISO + "T23:59:59");

      setHoje(concluidasHoje?.length || 0);

      const { data: concluidas7dias } = await supabase
        .from("movimentacoes")
        .select("*")
        .eq("setor_origem", setorCap)
        .eq("tipo", "concluiu")
        .gte("data", semanaISO)
        .lte("data", todayISO + "T23:59:59");

      setMedia(concluidas7dias ? Math.round(concluidas7dias.length / 6) : 0);

      const { data: entradas7dias } = await supabase
        .from("movimentacoes")
        .select("*")
        .eq("setor_destino", setorCap)
        .gte("data", semanaISO)
        .lte("data", todayISO + "T23:59:59");

      function calcularTempos(pedidosConcluidos, entradasSetor) {
        const tempos = [];
        pedidosConcluidos.forEach((saida) => {
          const entrada = entradasSetor
            .filter(e => e.pedido_id === saida.pedido_id)
            .sort((a, b) => new Date(b.data) - new Date(a.data))[0];

          if (entrada && saida) {
            const tempoMin = (new Date(saida.data) - new Date(entrada.data)) / (1000 * 60);
            if (tempoMin > 0) tempos.push(tempoMin);
          }
        });
        return tempos;
      }

      const { data: entradasHoje } = await supabase
        .from("movimentacoes")
        .select("*")
        .eq("setor_destino", setorCap)
        .gte("data", todayISO)
        .lte("data", todayISO + "T23:59:59");

      const temposHoje = calcularTempos(concluidasHoje || [], entradasHoje || []);
      setTempoMedio(formatarMinutos(
        temposHoje.length ? temposHoje.reduce((a, b) => a + b, 0) / temposHoje.length : 0
      ));

      const tempos7dias = calcularTempos(concluidas7dias || [], entradas7dias || []);
      setMelhorTempo(formatarMinutos(
        tempos7dias.length ? Math.min(...tempos7dias) : 0
      ));
    }
    carregarResumo();
  }, [setor]);

  // Visual: cards compactos
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

  return (
    <>
      <div style={{ display: "flex", gap: 24 }}>
        <div style={cardStyle}>
          <div style={labelStyle}>Hoje</div>
          <div>{hoje}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Média</div>
          <div>{media}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Tempo médio</div>
          <div>{tempoMedio}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Melhor tempo</div>
          <div>{melhorTempo}</div>
        </div>
      </div>
    </>
  );
}
