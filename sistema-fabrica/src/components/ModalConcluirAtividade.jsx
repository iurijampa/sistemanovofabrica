import React, { useState } from 'react';
import './ModalConcluirAtividade.css';

const ModalConcluirAtividade = ({ atividade, onConfirmar, onCancelar }) => {
  const [nomeFuncionario, setNomeFuncionario] = useState('');
  const [observacao, setObservacao] = useState('');
  const [costureira, setCostureira] = useState(''); // Novo estado

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!nomeFuncionario.trim() || !observacao.trim()) {
      alert('Por favor, preencha nome do funcionário e observação.');
      return;
    }

    // Se for setor Batida, a costureira deve ser selecionada
    if (atividade.setorAtual === 'Batida' && !costureira.trim()) {
      alert('Por favor, selecione a costureira.');
      return;
    }

    console.log('[MODAL] Vai confirmar:', nomeFuncionario, observacao, costureira);

    // Enviar costureira somente se for Batida
    onConfirmar(
      nomeFuncionario.trim(),
      observacao.trim(),
      atividade.setorAtual === 'Batida' ? costureira.trim() : null
    );
  };

  return (
    <div className="modalOverlay" onClick={onCancelar}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>
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

          {/* Campo visível somente para setor Batida */}
          {atividade.setorAtual === 'Batida' && (
            <>
              <label>
                Para qual costureira vai:
                <select
                  value={costureira}
                  onChange={(e) => setCostureira(e.target.value)}
                  required
                >
                  <option value="">Selecione</option>
                  <option value="Josy">Josy</option>
                  <option value="Nice">Nice</option>
                  <option value="Val">Val</option>
                  <option value="Geane">Geane</option>
                  <option value="Nilda">Nilda</option>
                  <option value="Jordania">Jordania</option>
                  <option value="Zal">Zal</option>
                  {/* Adicione outras conforme necessário */}
                </select>
              </label>
              <br />
            </>
          )}

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
