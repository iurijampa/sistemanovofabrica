// src/pages/Estoque.jsx

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import ModalAlertaEstoque from '../components/ModalAlertaEstoque';

// Limites personalizados para cada malha (tudo em maiúsculo)
const LIMITES_ALERTA = {
  'AERODRY': 200,
  'DRYFIT': 500,
  'DRY JERSIE': 500,
  'DRY MANCHESTER': 200,
  'DRY NBA': 100,
  'DRY SOLUTION': 200,
  'DRY TEC': 100,
  'HELANCA COLEGIAL': 50,
  'HELANQUINHA': 600,
  'OXFORD': 100,
  'PIQUET ALGODÃO': 600,
  'PIQUET DE POLIESTER': 100,
  'POLIESTER': 100,
  'RIBANA': 600,
  'TACTEL': 100,
  'UV FT50': 150
};

const Estoque = () => {
  const [estoque, setEstoque] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [qtdTemp, setQtdTemp] = useState(0);
  const [showAlerta, setShowAlerta] = useState(false);
  const [baixoEstoque, setBaixoEstoque] = useState([]);

  // Para evitar alertas repetidos ao editar sem atualizar o estoque
  const alertadosRef = useRef(new Set());

  useEffect(() => {
    buscarEstoque();
    // eslint-disable-next-line
  }, []);

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

  async function buscarEstoque() {
    setLoading(true);
    const { data, error } = await supabase
      .from('estoque')
      .select('*')
      .order('malha', { ascending: true });

    if (!error) setEstoque(data);
    setLoading(false);
    alertadosRef.current.clear();
  }

  function editarLinha(id, quantidadeAtual) {
    setEditando(id);
    setQtdTemp(quantidadeAtual);
  }

  async function salvarQuantidade(id) {
    if (isNaN(qtdTemp) || qtdTemp < 0) {
      alert('Quantidade inválida');
      return;
    }
    await supabase
      .from('estoque')
      .update({ quantidade: qtdTemp })
      .eq('id', id);
    setEditando(null);
    buscarEstoque();
  }

  return (
    <div style={{
      maxWidth: 600,
      margin: '40px auto',
      background: '#f8fafc',
      padding: 32,
      borderRadius: 16,
      boxShadow: '0 8px 32px #1565c022, 0 1.5px 5px #1565c044',
      position: 'relative'
    }}>
      <h2 style={{
        fontWeight: 700,
        fontSize: 24,
        marginBottom: 24,
        color: '#1565c0',
        letterSpacing: 0.5
      }}>Controle de Estoque</h2>
      {loading && <p>Carregando...</p>}
      {!loading && estoque.length === 0 && (
        <p style={{ color: '#b71c1c', fontWeight: 500 }}>Estoque vazio.<br />Cadastre as malhas na tabela "estoque" do Supabase.</p>
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
                      {editando === item.id ? (
                        <input
                          type="number"
                          min={0}
                          value={qtdTemp}
                          onChange={e => setQtdTemp(Number(e.target.value))}
                          style={{
                            width: 70,
                            fontSize: 15,
                            border: '1px solid #90caf9',
                            borderRadius: 5,
                            padding: 4,
                          }}
                          autoFocus
                        />
                      ) : (
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
                      )}
                    </td>
                    <td style={{ padding: 10, textAlign: 'center', minWidth: 90 }}>
                      {editando === item.id ? (
                        <>
                          <button
                            onClick={() => salvarQuantidade(item.id)}
                            style={{
                              marginRight: 7,
                              background: '#43a047',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 6,
                              padding: '6px 12px',
                              fontWeight: 600,
                              fontSize: 15,
                              cursor: 'pointer',
                              transition: 'background .15s'
                            }}>Salvar</button>
                          <button
                            onClick={() => setEditando(null)}
                            style={{
                              background: '#eee',
                              color: '#888',
                              border: 'none',
                              borderRadius: 6,
                              padding: '6px 10px',
                              fontWeight: 500,
                              fontSize: 14,
                              cursor: 'pointer'
                            }}>Cancelar</button>
                        </>
                      ) : (
                        <button
                          onClick={() => editarLinha(item.id, item.quantidade)}
                          style={{
                            background: '#1976d2',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            padding: '6px 16px',
                            fontWeight: 600,
                            fontSize: 15,
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px #1565c013',
                            transition: 'background .15s'
                          }}>Editar</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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
