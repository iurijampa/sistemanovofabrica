import React, { useState } from 'react';
import './ModalConcluirAtividade.css'; // Pode usar a mesma estilização

const ModalRetornarAtividade = ({ atividade, onConfirmar, onCancelar }) => {
  const [nomeFuncionario, setNomeFuncionario] = useState('');
  const [observacao, setObservacao] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nomeFuncionario.trim() || !observacao.trim()) {
      alert('Por favor, preencha nome do funcionário e observação.');
      return;
    }
    onConfirmar(nomeFuncionario.trim(), observacao.trim());
  };

  return (
    <div className="modalOverlay" onClick={onCancelar}>
      <div className="modalContent" onClick={e => e.stopPropagation()}>
        <h2>Retornar Atividade</h2>
        <p>
          <strong>Pedido:</strong> {atividade.pedido}
        </p>
        <p style={{ color: '#a66', fontWeight: 'bold', marginTop: 4, marginBottom: 12 }}>
          Ao confirmar, este pedido voltará para o setor anterior.
        </p>
        <form onSubmit={handleSubmit}>
          <label>
            Nome do funcionário:
            <input
              type="text"
              value={nomeFuncionario}
              onChange={(e) => setNomeFuncionario(e.target.value)}
              required
            />
          </label>
          <br />
          <label>
            Motivo do retorno:
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              required
            />
          </label>
          <br />
          <button type="submit" style={{ background: '#d24', color: '#fff' }}>
            Confirmar Retorno
          </button>
          <button type="button" onClick={onCancelar} style={{ marginLeft: '8px' }}>
            Cancelar
          </button>
        </form>
      </div>
    </div>
  );
};

export default ModalRetornarAtividade;
