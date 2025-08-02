import React, { useState, useEffect } from 'react';
import './ModalConcluirAtividade.css';
import { supabase } from '../supabaseClient';

const ModalConcluirAtividade = ({ atividade, onConfirmar, onCancelar, batedores }) => {
  const [nomeFuncionario, setNomeFuncionario] = useState('');
  const [observacao, setObservacao] = useState('');
  const [costureira, setCostureira] = useState('');
  const [destinoImpressaoAlgodao, setDestinoImpressaoAlgodao] = useState('');
  // Estados para batida:
  const [funcionariosBatida, setFuncionariosBatida] = useState([]);
  const [maquinaBatida, setMaquinaBatida] = useState('');

  // Novos estados para papel e máquina (impressão/sublimação)
  const [papel, setPapel] = useState('');
  const [listaPapeis, setListaPapeis] = useState([]);
  const [maquinaImpressao, setMaquinaImpressao] = useState('');

  const tipoProduto = (atividade.tipo_produto || '').toLowerCase();

  // Buscar papeis do banco apenas para impressão/sublimação
  useEffect(() => {
  if (atividade.setorAtual === 'Impressao') {
    supabase.from('papeis').select('*').then(({ data, error }) => {
      console.log('Papeis do banco:', data, error);
      setListaPapeis(data || []);
    });
  }
}, [atividade]);

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

    // Validação para papel e máquina (apenas impressão/sublimação)
    if (atividade.setorAtual === 'Impressao' && tipoProduto === 'sublimacao') {
      if (!papel) {
        alert('Selecione o tipo de papel.');
        return;
      }
      if (!maquinaImpressao) {
        alert('Selecione a máquina utilizada.');
        return;
      }
    }

    // Passe os novos campos para onConfirmar
    onConfirmar(
      nomeFuncionario.trim(),
      observacao.trim(),
      atividade.setorAtual === 'Batida'
        ? costureira.trim()
        : (atividade.costureira || ''),
      atividade.setorAtual === 'Impressao' && tipoProduto === 'algodao' ? destinoImpressaoAlgodao.trim() : null,
      atividade.setorAtual === 'Batida' ? funcionariosBatida : null,
      atividade.setorAtual === 'Batida' ? maquinaBatida.trim() : null,
      // Novos campos:
      atividade.setorAtual === 'Impressao' && tipoProduto === 'sublimacao' ? papel : null,
      atividade.setorAtual === 'Impressao' && tipoProduto === 'sublimacao' ? maquinaImpressao : null
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
                  {batedores && batedores.map(b => (
                    <label key={b.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      background: funcionariosBatida.includes(b.nome) ? '#e0f7fa' : '#f5f5f5',
                      borderRadius: 16,
                      padding: '4px 12px',
                      cursor: 'pointer',
                      marginBottom: 8
                    }}>
                      <input
                        type="checkbox"
                        checked={funcionariosBatida.includes(b.nome)}
                        onChange={() => handleFuncionarioBatida(b.nome)}
                        style={{ accentColor: '#06b6d4' }}
                      />
                      {b.nome}
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

          {/* Impressão - Sublimação: tipo de papel e máquina */}
          {atividade.setorAtual === 'Impressao' && tipoProduto === 'sublimacao' && (
  <>
    <label>
      Tipo de papel:
      <select
        value={papel}
        onChange={e => setPapel(e.target.value)}
        required
      >
        <option value="">Selecione</option>
        {listaPapeis.map(p => (
  <option key={p.id} value={`${p.nome.trim()}|${(p.gramatura || '').trim()}`}>
  {p.nome.trim()}{p.gramatura ? ` - ${p.gramatura}` : ''}
</option>
))}
      </select>
    </label>
    <br />
    <label>
      Máquina utilizada:
      <select
        value={maquinaImpressao}
        onChange={e => setMaquinaImpressao(e.target.value)}
        required
      >
        <option value="">Selecione</option>
        <option value="Epson">ORIX 01</option>
        <option value="Mimaki">ORIX 02</option>
        {/* Adicione outras máquinas se necessário */}
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