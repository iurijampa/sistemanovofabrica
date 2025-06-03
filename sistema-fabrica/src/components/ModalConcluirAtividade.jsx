import React, { useState } from 'react';
import './ModalConcluirAtividade.css'; // depois você estiliza

const ModalConcluirAtividade = ({ atividade, onConfirmar, onCancelar }) => {
  const [nomeFuncionario, setNomeFuncionario] = useState('');
  const [observacao, setObservacao] = useState('');

  
 const handleSubmit = (e) => {
  e.preventDefault();
  if (!nomeFuncionario.trim() || !observacao.trim()) {
    alert('Por favor, preencha nome do funcionário e observação.');
    return;
  }
  console.log('[MODAL] Vai confirmar:', nomeFuncionario, observacao);
  onConfirmar(nomeFuncionario.trim(), observacao.trim());
};


  return (
    <div className="modalOverlay" onClick={onCancelar}>
      <div className="modalContent" onClick={e => e.stopPropagation()}>
        <h2>Concluir Atividade</h2>
        <p><strong>Pedido:</strong> {atividade.pedido}</p>
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
            Observação:
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              required
            />
          </label>
          <br />
          <button type="submit">Confirmar</button>
          <button type="button" onClick={onCancelar} style={{ marginLeft: '8px' }}>
            Cancelar
          </button>
        </form>
      </div>
    </div>
  );
};

export default ModalConcluirAtividade;
