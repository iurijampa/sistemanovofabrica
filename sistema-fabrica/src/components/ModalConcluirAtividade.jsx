import React, { useState } from 'react';
import './ModalConcluirAtividade.css';

const FUNCIONARIOS_BATIDA = ["Sandro", "Daniel", "Fabiano"];

const ModalConcluirAtividade = ({ atividade, onConfirmar, onCancelar }) => {
  const [nomeFuncionario, setNomeFuncionario] = useState('');
  const [observacao, setObservacao] = useState('');
  const [costureira, setCostureira] = useState('');
  const [destinoImpressaoAlgodao, setDestinoImpressaoAlgodao] = useState('');
  // Estados para batida:
  const [funcionariosBatida, setFuncionariosBatida] = useState([]);
  const [maquinaBatida, setMaquinaBatida] = useState('');

  const tipoProduto = (atividade.tipo_produto || '').toLowerCase();

  // Função para marcar/desmarcar funcionário
  const handleFuncionarioBatida = (nome) => {
    setFuncionariosBatida(prev =>
      prev.includes(nome)
        ? prev.filter(f => f !== nome)
        : [...prev, nome]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!nomeFuncionario.trim() || !observacao.trim()) {
      alert('Por favor, preencha nome do funcionário e observação.');
      return;
    }

    if (atividade.setorAtual === 'Batida') {
      if (!costureira.trim()) {
        alert('Por favor, selecione a costureira.');
        return;
      }
      if (funcionariosBatida.length === 0 || !maquinaBatida.trim()) {
        alert('Selecione pelo menos um funcionário e a máquina utilizada.');
        return;
      }
    }

    if (atividade.setorAtual === 'Impressao' && tipoProduto === 'algodao' && !destinoImpressaoAlgodao.trim()) {
      alert('Por favor, selecione o setor de destino.');
      return;
    }

    // Passe os novos campos para onConfirmar
    onConfirmar(
      nomeFuncionario.trim(),
      observacao.trim(),
      atividade.setorAtual === 'Batida' ? costureira.trim() : null,
      atividade.setorAtual === 'Impressao' && tipoProduto === 'algodao' ? destinoImpressaoAlgodao.trim() : null,
      atividade.setorAtual === 'Batida' ? funcionariosBatida : null,
      atividade.setorAtual === 'Batida' ? maquinaBatida.trim() : null
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
              {/* Novos campos para Batida */}
              <label>
                Quem bateu o pedido:
                <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                  {FUNCIONARIOS_BATIDA.map(nome => (
                    <label key={nome} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      background: funcionariosBatida.includes(nome) ? '#e0f7fa' : '#f5f5f5',
                      borderRadius: 16,
                      padding: '4px 12px',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={funcionariosBatida.includes(nome)}
                        onChange={() => handleFuncionarioBatida(nome)}
                        style={{ accentColor: '#06b6d4' }}
                      />
                      {nome}
                    </label>
                  ))}
                </div>
              </label>
              <br />
              <label>
                Máquina utilizada:
                <select
                  value={maquinaBatida}
                  onChange={(e) => setMaquinaBatida(e.target.value)}
                  required
                >
                  <option value="">Selecione</option>
                  <option value="Calandra">Calandra</option>
                  <option value="Prensa">Prensa</option>
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