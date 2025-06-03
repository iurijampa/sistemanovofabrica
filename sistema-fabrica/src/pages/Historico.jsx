import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

// Recebe a prop setorUsuario (ex: 'gabarito', 'impressao', 'admin'...)
const Historico = ({ setorUsuario }) => {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregarMovimentacoes = async () => {
      const { data, error } = await supabase
        .from('movimentacoes')
        .select(`
          *,
          atividade:pedido_id (
            pedido
          )
        `)
        .order('data', { ascending: false });

      if (error) {
        console.error('Erro ao carregar movimentações:', error.message);
      } else {
        // Filtro por setor (se não for admin, só mostra mov do setor)
        let resultado = data;
        if (
          setorUsuario &&
          setorUsuario !== 'admin'
        ) {
          const setor = setorUsuario.toLowerCase();
          resultado = data.filter(
            (mov) =>
              (mov.setor_origem && mov.setor_origem.toLowerCase() === setor) ||
              (mov.setor_destino && mov.setor_destino.toLowerCase() === setor)
          );
        }
        setMovimentacoes(resultado);
      }
      setCarregando(false);
    };

    carregarMovimentacoes();
  }, [setorUsuario]);

  return (
    <div>
      <h2>Histórico de Movimentações</h2>
      {carregando ? (
        <p>Carregando...</p>
      ) : movimentacoes.length === 0 ? (
        <p>Nenhuma movimentação registrada ainda.</p>
      ) : (
        <ul style={{ padding: 0, listStyle: 'none' }}>
          {movimentacoes.map((mov) => (
            <li
              key={mov.id}
              style={{
                borderBottom: '1px solid #ccc',
                marginBottom: '10px',
                paddingBottom: '8px',
              }}
            >
              <strong>
                {mov.funcionarioEnvio && mov.funcionarioEnvio.trim() !== ''
                  ? mov.funcionarioEnvio
                  : '—'}
              </strong>{" "}
              {mov.tipo}
              {/* Exibe o nome do pedido ao invés do id */}
              {mov.atividade?.pedido
                ? ` o pedido ${mov.atividade.pedido}`
                : mov.pedido_id
                ? ` o pedido ${mov.pedido_id.slice(0, 8)}`
                : ''}
              .<br />
              {mov.setor_origem && <span>Origem: {mov.setor_origem} </span>}
              {mov.setor_destino && <span>→ Destino: {mov.setor_destino}</span>}
              <br />
              <small>
                {mov.data
                  ? new Date(mov.data + 'Z').toLocaleString()
                  : ''}
              </small>
              {mov.observacaoEnvio && mov.observacaoEnvio.trim() !== '' && (
                <div>
                  <em>Obs: {mov.observacaoEnvio}</em>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Historico;
