import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import './CadastroPedido.css';

const CadastroPedido = ({ onCadastrar }) => {
  const [pedido, setPedido] = useState('');
  const [cliente, setCliente] = useState('');
  const [imagemPrincipal, setImagemPrincipal] = useState(null);
  const [imagensExtras, setImagensExtras] = useState([]);
  const [descricao, setDescricao] = useState('');
  const [setorAtual, setSetorAtual] = useState('');
  const [dataEntrega, setDataEntrega] = useState('');

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
      imagem: urlPrincipal, // imagem principal
      imagensExtras: JSON.stringify(urlsExtras), // array das outras imagens
      descricao,
      setorAtual,
      dataEntrega: new Date(dataEntrega).toISOString(),
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

        <button type="submit">Cadastrar Pedido</button>
      </form>
    </div>
  );
};

export default CadastroPedido;
