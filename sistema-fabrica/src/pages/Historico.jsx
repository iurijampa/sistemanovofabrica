import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { gerarPDFPedido } from '../utils/gerarPDFPedido';
import { FaFilePdf } from 'react-icons/fa';

// Setores para filtro (adicione mais se precisar)
const listaSetores = [
  '',
  'Gabarito',
  'Impressao',
  'Batida',
  'Costura',
  'Embalagem',
  'Finalizado',
];

const Historico = ({ setorUsuario }) => {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Novos estados para filtro
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroSetor, setFiltroSetor] = useState('');

  useEffect(() => {
    const carregarMovimentacoes = async () => {
      const { data, error } = await supabase
        .from('movimentacoes')
        .select(`
          *,
          atividade:pedido_id (
            pedido,
            cliente,
            descricao,
            imagem,
            imagensExtras,
            setorAtual,
            dataEntrega
          )
        `)
        .order('data', { ascending: false });

      if (error) {
        console.error('Erro ao carregar movimentações:', error.message);
      } else {
        // Filtro por setor (se não for admin, só mostra mov do setor)
        let resultado = data;
        if (setorUsuario && setorUsuario !== 'admin') {
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

  // Função para montar o objeto pedido (usa fallback se faltar campo)
  const montarPedido = (mov) => {
    return {
      pedido: mov.atividade?.pedido || mov.pedido_id || '',
      cliente: mov.atividade?.cliente || '',
      descricao: mov.atividade?.descricao || '',
      imagem: mov.atividade?.imagem || '',
      imagensExtras: mov.atividade?.imagensExtras || '[]',
      setorAtual: mov.atividade?.setorAtual || mov.setor_destino || '',
      dataEntrega: mov.atividade?.dataEntrega || '',
    };
  };

  // FILTRO: só admins veem os filtros
  const filtrados = movimentacoes.filter((mov) => {
    if (setorUsuario !== 'admin') return true;
    const texto = filtroTexto.trim().toLowerCase();

    // Verifica os campos relevantes para filtro de texto
    const nomeCliente = mov.atividade?.cliente?.toLowerCase() || '';
    const nomePedido = mov.atividade?.pedido?.toLowerCase() || '';
    const setores = [mov.setor_origem, mov.setor_destino, mov.atividade?.setorAtual]
      .map(s => s ? s.toLowerCase() : '')
      .filter(Boolean);

    const filtroSetorOk = !filtroSetor || setores.includes(filtroSetor.toLowerCase());

    return (
      filtroSetorOk &&
      (
        !texto ||
        nomeCliente.includes(texto) ||
        nomePedido.includes(texto)
      )
    );
  });

  return (
    <div>
      <h2>Histórico de Movimentações</h2>

      {/* Filtros só para admin */}
      {setorUsuario === 'admin' && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
          <input
            type="text"
            placeholder="Buscar por pedido"
            value={filtroTexto}
            onChange={e => setFiltroTexto(e.target.value)}
            style={{ padding: 8, minWidth: 180 }}
          />
          <select
            value={filtroSetor}
            onChange={e => setFiltroSetor(e.target.value)}
            style={{ padding: 8 }}
          >
            <option value="">Todos os setores</option>
            {listaSetores.filter(s => s).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {carregando ? (
        <p>Carregando...</p>
      ) : filtrados.length === 0 ? (
        <p>Nenhuma movimentação registrada ainda.</p>
      ) : (
        <ul style={{ padding: 0, listStyle: 'none' }}>
          {filtrados.map((mov) => (
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
              {/* Nome do pedido + botão PDF */}
              {mov.atividade?.pedido ? (
                <>
                  {` o pedido `}
                  <strong>{mov.atividade.pedido}</strong>
                  {" "}
                  <button
                    onClick={() => gerarPDFPedido(montarPedido(mov))}
                    style={{
                      backgroundColor: '#e63946',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      padding: '5px 14px 5px 10px',
                      marginLeft: 8,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 500,
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                    title="Gerar PDF do Pedido"
                  >
                    <FaFilePdf size={16} />
                    Gerar PDF
                  </button>
                </>
              ) : mov.pedido_id ? (
                ` o pedido ${mov.pedido_id.slice(0, 8)}`
              ) : ''}
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
