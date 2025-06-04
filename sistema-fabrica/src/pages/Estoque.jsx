// src/pages/Estoque.jsx

import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const Estoque = () => {
  const [estoque, setEstoque] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [qtdTemp, setQtdTemp] = useState(0);

  // Buscar estoques do banco ao carregar
  useEffect(() => {
    buscarEstoque();
  }, []);

  async function buscarEstoque() {
    setLoading(true);
    const { data, error } = await supabase
      .from('estoque')
      .select('*')
      .order('malha', { ascending: true });

    if (!error) setEstoque(data);
    setLoading(false);
  }

  // Função para começar a editar uma linha
  function editarLinha(id, quantidadeAtual) {
    setEditando(id);
    setQtdTemp(quantidadeAtual);
  }

  // Salvar quantidade editada
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
    <div style={{ maxWidth: 540, margin: '30px auto', background: '#fff', padding: 24, borderRadius: 10 }}>
      <h2>Controle de Estoque</h2>
      {loading && <p>Carregando...</p>}
      {!loading && estoque.length === 0 && (
        <p>Estoque vazio. Cadastre as malhas na tabela "estoque" do Supabase.</p>
      )}
      {!loading && estoque.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Malha</th>
              <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid #eee' }}>Quantidade</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {estoque.map((item) => (
              <tr key={item.id}>
                <td style={{ padding: 8 }}>{item.malha}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>
                  {editando === item.id ? (
                    <input
                      type="number"
                      min={0}
                      value={qtdTemp}
                      onChange={e => setQtdTemp(Number(e.target.value))}
                      style={{ width: 80 }}
                    />
                  ) : (
                    item.quantidade
                  )}
                </td>
                <td style={{ padding: 8, textAlign: 'center' }}>
                  {editando === item.id ? (
                    <>
                      <button onClick={() => salvarQuantidade(item.id)} style={{ marginRight: 6 }}>Salvar</button>
                      <button onClick={() => setEditando(null)}>Cancelar</button>
                    </>
                  ) : (
                    <button onClick={() => editarLinha(item.id, item.quantidade)}>Editar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Estoque;
