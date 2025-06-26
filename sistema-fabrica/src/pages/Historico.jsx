import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { gerarPDFPedido } from '../utils/gerarPDFPedido';
import { FaFilePdf } from 'react-icons/fa';

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

  // Filtros para busca
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
        let resultado = data;
        // Setores só enxergam suas próprias movimentações
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

  // Função para montar o objeto pedido
  const montarPedido = (mov) => ({
    pedido: mov.atividade?.pedido || mov.pedido_id || '',
    cliente: mov.atividade?.cliente || '',
    descricao: mov.atividade?.descricao || '',
    imagem: mov.atividade?.imagem || '',
    imagensExtras: mov.atividade?.imagensExtras || '[]',
    setorAtual: mov.atividade?.setorAtual || mov.setor_destino || '',
    dataEntrega: mov.atividade?.dataEntrega || '',
  });

  // --- FILTRO (ajustado para todos) ---
  const texto = filtroTexto.trim().toLowerCase();
  const filtrados = movimentacoes.filter((mov) => {
    // Setores só veem suas próprias movimentações
    if (setorUsuario && setorUsuario !== 'admin') {
      const setor = setorUsuario.toLowerCase();
      const isDoSetor =
        (mov.setor_origem && mov.setor_origem.toLowerCase() === setor) ||
        (mov.setor_destino && mov.setor_destino.toLowerCase() === setor);
      if (!isDoSetor) return false;
    }

    // Busca textual para todos
    if (texto) {
      const nomeCliente = mov.atividade?.cliente?.toLowerCase() || '';
      const nomePedido = mov.atividade?.pedido?.toLowerCase() || '';
      if (!nomeCliente.includes(texto) && !nomePedido.includes(texto)) return false;
    }

    // Filtro de setor do select só para admin
    if (setorUsuario === 'admin' && filtroSetor) {
      const setores = [mov.setor_origem, mov.setor_destino, mov.atividade?.setorAtual]
        .map(s => s ? s.toLowerCase() : '')
        .filter(Boolean);
      if (!setores.includes(filtroSetor.toLowerCase())) return false;
    }

    return true;
  });

  return (
    <div>
      <h2>Histórico de Movimentações</h2>

      {/* Barra de busca para todos, filtro de setor só admin */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <input
          type="text"
          placeholder="Buscar por pedido ou cliente"
          value={filtroTexto}
          onChange={e => setFiltroTexto(e.target.value)}
          style={{ padding: 8, minWidth: 180 }}
        />

        {setorUsuario === 'admin' && (
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
        )}
      </div>

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
