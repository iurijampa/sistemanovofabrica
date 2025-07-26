import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import audioNotificacao from '../assets/metadiaria.mp3';

const METAS_SETOR = {
  Gabarito: 10,
  Impressao: 12,
  Batida: 250,
  Costura: 8,
  Embalagem: 8
};

function capitalizar(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function contarDiasUteis(startDate, endDate) {
  let count = 0;
  let current = new Date(startDate);
  endDate = new Date(endDate);
  while (current <= endDate) {
    const day = current.getDay();
    if (day >= 1 && day <= 6) count++;
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

function getChaveMetaDiaria(setor) {
  const hojeISO = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return `meta_batida__${setor}__${hojeISO}`;
}

function calcularCorBarra(valor, meta) {
  const pct = valor / meta;
  if (valor === 0) return { cor: "#e5e7eb", pct: 0 };
  if (pct >= 1) return { cor: "#22c55e", pct: 1 };
  if (pct >= 0.51) return { cor: "#eab308", pct };
  return { cor: "#ef4444", pct };
}

function verificarMetaEParabenizar(valor, meta, chave, setParabens, audioRef) {
  if (valor >= meta) {
    setParabens(true);
    if (!localStorage.getItem(chave) && audioRef.current) {
      audioRef.current.play();
      localStorage.setItem(chave, "true");
    }
  } else {
    setParabens(false);
    localStorage.removeItem(chave);
  }
}

async function tratarResumoBatida(concluidasFiltradas, metaSetor, setHoje, setMedia, setBarrasSemana, setParabens, audioRef, setorCap, setBarrasCalandra, setBarrasPrensa) {
  const idsPedidos = concluidasFiltradas.map(m => m.pedido_id);
  const { data: atividadesRelacionadas } = await supabase
    .from('atividades')
    .select('id, quantidade_pecas')
    .in('id', idsPedidos);

  const mapaQuantidade = {};
  atividadesRelacionadas?.forEach(a => {
    mapaQuantidade[a.id] = Number(a.quantidade_pecas || 1);
  });

  const contagemPorDia = {};
  concluidasFiltradas.forEach(mov => {
    const data = mov.data.slice(0, 10);
    const qtd = mapaQuantidade[mov.pedido_id] || 1;
    contagemPorDia[data] = (contagemPorDia[data] || 0) + qtd;
  });

  const hojeISO = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const totalHoje = contagemPorDia[hojeISO] || 0;
  setHoje(totalHoje);

  const semana = getSemanaLabels();
  let totalSemana = 0;
  const barras = semana.map(({ ymd, label }) => {
    const total = contagemPorDia[ymd] || 0;
    totalSemana += total;
    const { cor, pct } = calcularCorBarra(total, metaSetor);
    return { data: label, total, cor, pct };
  });
  setBarrasSemana(barras);
  setMedia(Math.round(totalSemana / semana.length));

  // Calandra e Prensa
  const contagemCalandra = {};
  const contagemPrensa = {};
  concluidasFiltradas.forEach(mov => {
    const data = mov.data.slice(0, 10);
    const qtd = mapaQuantidade[mov.pedido_id] || 1;
    const maquina = (mov.maquinabatida || "").toLowerCase();
    if (maquina.includes("calandra")) {
      contagemCalandra[data] = (contagemCalandra[data] || 0) + qtd;
    } else if (maquina.includes("prensa")) {
      contagemPrensa[data] = (contagemPrensa[data] || 0) + qtd;
    }
  });

  const barrasCalandraTemp = semana.map(({ ymd, label }) => {
    const total = contagemCalandra[ymd] || 0;
    const { cor, pct } = calcularCorBarra(total, metaSetor);
    return { data: label, total, cor, pct };
  });

  const barrasPrensaTemp = semana.map(({ ymd, label }) => {
    const total = contagemPrensa[ymd] || 0;
    const { cor, pct } = calcularCorBarra(total, metaSetor);
    return { data: label, total, cor, pct };
  });

  setBarrasCalandra(barrasCalandraTemp);
  setBarrasPrensa(barrasPrensaTemp);

  const chaveAudio = getChaveMetaDiaria(setorCap);
  verificarMetaEParabenizar(totalHoje, metaSetor, chaveAudio, setParabens, audioRef);
}

export default function ResumoSetor({ setor }) {
  const [hoje, setHoje] = useState(0);
  const [media, setMedia] = useState(0);
  const [barrasSemana, setBarrasSemana] = useState([]);
  const [barrasCalandra, setBarrasCalandra] = useState([]);
  const [barrasPrensa, setBarrasPrensa] = useState([]);
  const [parabens, setParabens] = useState(false);
  const audioRef = useRef(null);

  const metaSetor = METAS_SETOR[capitalizar(setor)] || 10;

  async function carregarResumo() {
    const setorCap = capitalizar(setor);

    const [concluidasRes, entradasRes] = await Promise.all([
      supabase
        .from("movimentacoes")
        .select("*")
        .eq("setor_origem", setorCap)
        .eq("tipo", "concluiu")
        .order("data", { ascending: true }),
      supabase
        .from("movimentacoes")
        .select("*")
        .eq("setor_destino", setorCap)
        .order("data", { ascending: true })
    ]);

    const concluidasTodas = concluidasRes.data || [];

    const concluidasFiltradas = [];
    const setChave = new Set();
    concluidasTodas.forEach((mov) => {
      const chave = `${mov.data.slice(0, 10)}-${mov.pedido_id}`;
      if (!setChave.has(chave)) {
        setChave.add(chave);
        concluidasFiltradas.push(mov);
      }
    });

    if (setorCap === "Batida") {
      await tratarResumoBatida(concluidasFiltradas, metaSetor, setHoje, setMedia, setBarrasSemana, setParabens, audioRef, setorCap, setBarrasCalandra, setBarrasPrensa);
      return;
    }

    if (concluidasFiltradas.length > 0) {
      const dataPrimeira = new Date(concluidasFiltradas[0].data);
      const dataUltima = new Date(concluidasFiltradas[concluidasFiltradas.length - 1].data);
      const diasUteis = contarDiasUteis(dataPrimeira, dataUltima);
      setMedia(Math.round(concluidasFiltradas.length / diasUteis));
    } else {
      setMedia(0);
    }

    const semana = getSemanaLabels();
    const barras = semana.map(({ ymd, label }) => {
      const total = concluidasFiltradas.filter(c => c.data.slice(0, 10) === ymd).length;
      const { cor, pct } = calcularCorBarra(total, metaSetor);
      return { data: label, total, cor, pct };
    });
    setBarrasSemana(barras);

    const hojeISO = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const pedidosHoje = new Set();
    concluidasFiltradas.forEach(mov => {
      if (mov.data.slice(0, 10) === hojeISO) pedidosHoje.add(mov.pedido_id);
    });
    setHoje(pedidosHoje.size);

    const chaveAudio = getChaveMetaDiaria(setorCap);
    verificarMetaEParabenizar(pedidosHoje.size, metaSetor, chaveAudio, setParabens, audioRef);
  }

  useEffect(() => { carregarResumo(); }, [setor]);

  useEffect(() => {
    const canal = supabase
      .channel('movimentacoes_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'movimentacoes',
        filter: `setor_origem=eq.${capitalizar(setor)}`
      }, (payload) => {
        if (payload.new.tipo === "concluiu") carregarResumo();
      })
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [setor]);

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
      <audio ref={audioRef} src={audioNotificacao} preload="auto" />

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "nowrap", overflowX: "auto", paddingBottom: 8 }}>
        <div style={cardStyle}>
          <div style={labelStyle}>Hoje</div>
          <div>{hoje}{parabens && <span style={{ fontSize: 28, marginLeft: 7 }}>🎉</span>}</div>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Média Diária</div>
          <div>{media}</div>
        </div>

        <div style={{ ...cardStyle, minWidth: 175, padding: 8, alignItems: "stretch", position: "relative" }}>
          <div style={{ ...labelStyle, marginBottom: 6, textAlign: "center", fontWeight: 700 }}>Resumo semanal</div>
          <div style={barContainer}>
            {barrasSemana.map((d, idx) => (
              <div key={idx} style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                height: "100%",
                minWidth: 18
              }}>
                <div style={{
                  width: 14,
                  height: 45,
                  background: "#eee",
                  borderRadius: 5,
                  position: "relative",
                  overflow: "hidden",
                  marginBottom: 2,
                  display: "flex",
                  alignItems: "flex-end"
                }}>
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
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: d.cor,
                  marginTop: 2,
                  minHeight: 15
                }}>{d.total > 0 ? d.total : ''}</div>
                <div style={{
                  fontSize: 12,
                  color: "#888",
                  marginTop: 1,
                  fontWeight: 500
                }}>{d.data}</div>
              </div>
            ))}
          </div>
        </div>

        {capitalizar(setor) === "Batida" && (
          <>
            

            <div style={{ ...cardStyle, minWidth: 175, padding: 8, alignItems: "stretch" }}>
              <div style={{ ...labelStyle, marginBottom: 6, textAlign: "center", fontWeight: 700 }}>
                Resumo Prensa
              </div>
              <div style={barContainer}>
                {barrasPrensa.map((d, idx) => (
                  <div
                    key={`prensa-${idx}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      height: "100%",
                      minWidth: 18,
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 45,
                        background: "#eee",
                        borderRadius: 5,
                        position: "relative",
                        overflow: "hidden",
                        marginBottom: 2,
                        display: "flex",
                        alignItems: "flex-end",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: `${d.pct * 100}%`,
                          background: d.cor,
                          borderRadius: 5,
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          transition: "height .2s",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: d.cor,
                        marginTop: 2,
                        minHeight: 15,
                      }}
                    >
                      {d.total > 0 ? d.total : ""}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#888",
                        marginTop: 1,
                        fontWeight: 500,
                      }}
                    >
                      {d.data}
                    </div>
                  </div>
                ))}
              </div>
            </div>
<div style={{ ...cardStyle, minWidth: 175, padding: 8, alignItems: "stretch" }}>
              <div style={{ ...labelStyle, marginBottom: 6, textAlign: "center", fontWeight: 700 }}>
                Resumo Calandra
              </div>
              <div style={barContainer}>
                {barrasCalandra.map((d, idx) => (
                  <div
                    key={`calandra-${idx}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      height: "100%",
                      minWidth: 18,
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 45,
                        background: "#eee",
                        borderRadius: 5,
                        position: "relative",
                        overflow: "hidden",
                        marginBottom: 2,
                        display: "flex",
                        alignItems: "flex-end",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: `${d.pct * 100}%`,
                          background: d.cor,
                          borderRadius: 5,
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          transition: "height .2s",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: d.cor,
                        marginTop: 2,
                        minHeight: 15,
                      }}
                    >
                      {d.total > 0 ? d.total : ""}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#888",
                        marginTop: 1,
                        fontWeight: 500,
                      }}
                    >
                      {d.data}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
}
