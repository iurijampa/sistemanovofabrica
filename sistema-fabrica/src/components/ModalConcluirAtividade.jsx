import React, { useState } from 'react';
import './ModalConcluirAtividade.css';

const ModalConcluirAtividade = ({ atividade, onConfirmar, onCancelar }) => {
  const [nomeFuncionario, setNomeFuncionario] = useState('');
  const [observacao, setObservacao] = useState('');
  const [costureira, setCostureira] = useState('');
  const [destinoImpressaoAlgodao, setDestinoImpressaoAlgodao] = useState('');

  const tipoProduto = (atividade.tipo_produto || '').toLowerCase();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!nomeFuncionario.trim() || !observacao.trim()) {
      alert('Por favor, preencha nome do funcionário e observação.');
      return;
    }

    if (atividade.setorAtual === 'Batida' && !costureira.trim()) {
      alert('Por favor, selecione a costureira.');
      return;
    }

    if (atividade.setorAtual === 'Impressao' && tipoProduto === 'algodao' && !destinoImpressaoAlgodao.trim()) {
      alert('Por favor, selecione o setor de destino.');
      return;
    }

    console.log('[MODAL] Vai confirmar:', nomeFuncionario, observacao, costureira, destinoImpressaoAlgodao);

    onConfirmar(
      nomeFuncionario.trim(),
      observacao.trim(),
      atividade.setorAtual === 'Batida' ? costureira.trim() : null,
      atividade.setorAtual === 'Impressao' && tipoProduto === 'algodao' ? destinoImpressaoAlgodao.trim() : null
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
                </select>
              </label>
              <br />
            </>
          )}

          {atividade.setorAtual === 'Impressao' && tipoProduto === 'algodao' && (
            <>
              <label>
                Para qual setor vai:
                <select
                  value={destinoImpressaoAlgodao}
                  onChange={(e) => setDestinoImpressaoAlgodao(e.target.value)}
                  required
                >
                  <option value="">Selecione</option>
                  <option value="Batida">Batida</option>
                  <option value="Costura">Costura</option>
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
