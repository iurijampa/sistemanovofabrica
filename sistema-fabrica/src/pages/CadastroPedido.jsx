import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import './CadastroPedido.css';

// Lista de malhas
const LISTA_MALHAS = [
  "dryfit",
  "dry jersie",
  "helanquinha",
  "aerodry",
  "dry tec",
  "dry solution",
  "piquet de poliester",
  "piquet de algodão",
  "dry manchester",
  "dry nba",
  "uv ft50",
  "helanca colegial",
  "poliester",
  "oxford",
  "tactel",
  "ribana"
];

const CadastroPedido = ({ onCadastrar }) => {
  const [pedido, setPedido] = useState('');
  const [cliente, setCliente] = useState('');
  const [imagemPrincipal, setImagemPrincipal] = useState(null);
  const [imagensExtras, setImagensExtras] = useState([]);
  const [descricao, setDescricao] = useState('');
  const [setorAtual, setSetorAtual] = useState('');
  const [dataEntrega, setDataEntrega] = useState('');
  const [urgente, setUrgente] = useState(false);

  // Novos estados internos para estoque
  const [malha, setMalha] = useState('');
  const [quantidade, setQuantidade] = useState(1);

  const handleAdicionarImagemExtra = (e) => {
    const arquivos = Array.from(e.target.files);
    setImagensExtras((prev) => [...prev, ...arquivos]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imagemPrincipal) {
      alert('Selecione a imagem principal');
      return;
    }

    // Atualizar estoque antes de cadastrar pedido
    if (malha && quantidade > 0) {
      // Procura a malha no estoque
      const { data: estoque, error: erroEstoque } = await supabase
        .from('estoque')
        .select('id, quantidade')
        .eq('malha', malha)
        .single();

      if (erroEstoque || !estoque) {
        alert('Erro: malha não encontrada no estoque.');
        return;
      }
      if (estoque.quantidade < quantidade) {
        alert('Estoque insuficiente para essa malha!');
        return;
      }
      // Atualiza a quantidade subtraindo
      await supabase
        .from('estoque')
        .update({ quantidade: estoque.quantidade - quantidade })
        .eq('id', estoque.id);
    }

    // Upload da imagem principal
    const filePathPrincipal = `${Date.now()}_${imagemPrincipal.name}`;
    const { error: erroPrincipal } = await supabase
      .storage.from('imagens')
      .upload(filePathPrincipal, imagemPrincipal);

    if (erroPrincipal) {
      alert('Erro ao enviar imagem principal');
      return;
    }

    const { data: dataPrincipal } = supabase.storage
      .from('imagens')
      .getPublicUrl(filePathPrincipal);
    const urlPrincipal = dataPrincipal.publicUrl;

    // Upload das imagens extras
    const urlsExtras = [];

    for (const imagem of imagensExtras) {
      const filePath = `${Date.now()}_${imagem.name}`;
      const { error } = await supabase.storage
        .from('imagens')
        .upload(filePath, imagem);
      if (!error) {
        const { data } = supabase.storage.from('imagens').getPublicUrl(filePath);
        if (data?.publicUrl) urlsExtras.push(data.publicUrl);
      }
    }

    const novaAtividade = {
      pedido,
      cliente,
      imagem: urlPrincipal,
      imagensExtras: JSON.stringify(urlsExtras),
      descricao,
      setorAtual,
      dataEntrega: new Date(dataEntrega).toISOString(),
      urgente,
      // Se quiser salvar essa info no registro da atividade, pode incluir:
      // malha,
      // quantidade,
    };

    await onCadastrar(novaAtividade);
    alert('Pedido cadastrado com sucesso!');

    // Resetar campos
    setPedido('');
    setCliente('');
    setImagemPrincipal(null);
    setImagensExtras([]);
    setDescricao('');
    setSetorAtual('');
    setDataEntrega('');
    setUrgente(false);
    setMalha('');
    setQuantidade(1);
  };

  return (
    <div className="form-container">
      <h1>Cadastro de Pedido</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Nome do Pedido:
          <input type="text" value={pedido} onChange={(e) => setPedido(e.target.value)} required />
        </label>

        <label>
          Nome do Cliente:
          <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} required />
        </label>

        <label>
          Imagem Principal:
          <input type="file" accept="image/*" onChange={(e) => setImagemPrincipal(e.target.files[0])} required />
        </label>

        {imagemPrincipal && (
          <div style={{ marginBottom: '10px' }}>
            <img
              src={URL.createObjectURL(imagemPrincipal)}
              alt="Prévia principal"
              style={{ width: '100px', marginRight: '10px' }}
            />
            <button type="button" onClick={() => setImagemPrincipal(null)}>
              ❌ Remover
            </button>
          </div>
        )}

        <label>
          Imagens Adicionais:
          <input type="file" accept="image/*" multiple onChange={handleAdicionarImagemExtra} />
        </label>

        {imagensExtras.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
            {imagensExtras.map((img, index) => (
              <div key={index} style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src={URL.createObjectURL(img)}
                  alt={`Extra ${index}`}
                  style={{ width: '80px', height: '80px', objectFit: 'cover', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const novaLista = imagensExtras.filter((_, i) => i !== index);
                    setImagensExtras(novaLista);
                  }}
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    background: 'rgba(255, 0, 0, 0.8)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0 5px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    lineHeight: '16px'
                  }}
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}

        <label>
          Descrição do Pedido:
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={6}
            placeholder="Ex: 
    DRYFIT
- Camisa preta M (cliente João)
- Camisa branca G (cliente Maria)
- 1 X G - 10 - FULANO"
            style={{
              width: '100%',
              minHeight: '120px',
              resize: 'vertical',
              padding: '10px',
              fontSize: '14px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              boxSizing: 'border-box'
            }}
            required
          />
        </label>

        <label>
          Data de Entrega:
          <input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} required />
        </label>

        <label>
          Setor Inicial:
          <select value={setorAtual} onChange={(e) => setSetorAtual(e.target.value)} required>
            <option value="">Selecione o setor</option>
            <option value="Gabarito">Gabarito</option>
            <option value="Impressao">Impressao</option>
            <option value="Batida">Batida</option>
            <option value="Costura">Costura</option>
            <option value="Embalagem">Embalagem</option>
          </select>
        </label>

        {/* --- CAMPO INTERNO DE ESTOQUE (agora como dropdown, nomes maiúsculo) --- */}
        <div style={{ margin: '18px 0', padding: '12px', background: '#f7f7f7', borderRadius: 8 }}>
          <label>
            Malha (uso interno):
            <select
              value={malha}
              onChange={e => setMalha(e.target.value)}
              required
              style={{ marginLeft: 8, minWidth: 180 }}
            >
              <option value="">Selecione a malha</option>
              {LISTA_MALHAS.map((malhaOp) => (
                <option key={malhaOp} value={malhaOp}>{malhaOp.toUpperCase()}</option>
              ))}
            </select>
          </label>
          <label style={{ marginLeft: 16 }}>
            Quantidade (uso interno):
            <input
              type="number"
              min={1}
              value={quantidade}
              onChange={e => setQuantidade(Number(e.target.value))}
              style={{ marginLeft: 8, width: 60 }}
            />
          </label>
        </div>

        {/* CAMPO URGENTE MELHORADO */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            margin: '18px 0 18px 0',
          }}
        >
          <input
            type="checkbox"
            id="urgente"
            checked={urgente}
            onChange={e => setUrgente(e.target.checked)}
            style={{ width: 22, height: 22, accentColor: 'red', cursor: 'pointer' }}
          />
          <label
            htmlFor="urgente"
            style={{
              color: 'red',
              fontWeight: 'bold',
              fontSize: '1.1em',
              cursor: 'pointer',
              letterSpacing: 1,
              userSelect: 'none',
              margin: 0,
            }}
          >
            Marcar como URGENTE
          </label>
        </div>

        <button type="submit">Cadastrar Pedido</button>
      </form>
    </div>
  );
};

export default CadastroPedido;
