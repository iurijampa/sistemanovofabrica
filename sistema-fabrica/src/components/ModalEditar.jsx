import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './ModalEditar.css';

const parseImagensExtras = (imagensExtras) => {
  try {
    return typeof imagensExtras === 'string' ? JSON.parse(imagensExtras) : imagensExtras || [];
  } catch (error) {
    console.error('Erro ao fazer parse das imagensExtras:', error);
    return [];
  }
};

const ModalEditar = ({ pedido, onClose, onSalvar }) => {
  const [formData, setFormData] = useState({
    id: pedido.id,
    pedido: pedido.pedido,
    cliente: pedido.cliente,
    descricao: pedido.descricao,
    setorAtual: pedido.setorAtual,
    dataEntrega: pedido.dataEntrega.split('T')[0],
    imagem: pedido.imagem || '',
    imagensExtras: parseImagensExtras(pedido.imagensExtras),
  });

  const [urgente, setUrgente] = useState(!!pedido.urgente); // NOVO
  const [imagemPrincipalArquivo, setImagemPrincipalArquivo] = useState(null);
  const [novasImagensExtras, setNovasImagensExtras] = useState([]);

  // Sincroniza formData e urgente quando pedido mudar
  useEffect(() => {
    setFormData({
      id: pedido.id,
      pedido: pedido.pedido,
      cliente: pedido.cliente,
      descricao: pedido.descricao,
      setorAtual: pedido.setorAtual,
      dataEntrega: pedido.dataEntrega.split('T')[0],
      imagem: pedido.imagem || '',
      imagensExtras: parseImagensExtras(pedido.imagensExtras),
    });
    setUrgente(!!pedido.urgente); // NOVO
    setNovasImagensExtras([]);
  }, [pedido]);

  // Atualiza campos simples do form
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Seleção nova imagem principal
  const handleImagemPrincipalChange = (e) => {
    const file = e.target.files[0];
    if (file) setImagemPrincipalArquivo(file);
  };

  // Seleção novas imagens extras (múltiplas)
  const handleImagensExtrasChange = (e) => {
    const files = Array.from(e.target.files);
    setNovasImagensExtras((prev) => [...prev, ...files]);
  };

  // Remove imagem extra do formData (remover das imagens já salvas)
  const removerImagemExtra = (url) => {
    setFormData((prev) => ({
      ...prev,
      imagensExtras: prev.imagensExtras.filter((img) => img !== url),
    }));
  };

  // Remove imagem extra das novas imagens ainda não enviadas
  const removerNovaImagemExtra = (fileIndex) => {
    setNovasImagensExtras((prev) => prev.filter((_, i) => i !== fileIndex));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let atualizacoes = { ...formData, urgente }; // <- Inclui urgente

    // Upload imagem principal nova
    if (imagemPrincipalArquivo) {
      const fileName = `pedidos/${Date.now()}_${imagemPrincipalArquivo.name}`;
      const { data, error } = await supabase.storage
        .from('imagens')
        .upload(fileName, imagemPrincipalArquivo);

      if (!error && data?.path) {
        const url = supabase.storage.from('imagens').getPublicUrl(data.path).data.publicUrl;
        atualizacoes.imagem = url;
      }
    }

    // Upload novas imagens extras
    const urlsNovasExtras = [];
    for (const file of novasImagensExtras) {
      const fileName = `pedidos/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('imagens')
        .upload(fileName, file);

      if (!error && data?.path) {
        const url = supabase.storage.from('imagens').getPublicUrl(data.path).data.publicUrl;
        urlsNovasExtras.push(url);
      }
    }

    // Atualiza o array de imagensExtras com as removidas já filtradas e as novas URLs
    atualizacoes.imagensExtras = JSON.stringify([...formData.imagensExtras, ...urlsNovasExtras]);

    // Passa atualização para o componente pai
    onSalvar(atualizacoes);
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>
        <button className="fecharModal" onClick={onClose}>×</button>
        <h2>Editar Pedido</h2>
        <form onSubmit={handleSubmit}>

          <label>
            Pedido:
            <input name="pedido" value={formData.pedido} onChange={handleChange} required />
          </label>
          <br />

          <label>
            Cliente:
            <input name="cliente" value={formData.cliente} onChange={handleChange} required />
          </label>
          <br />

          <label>
            Descrição:
            <textarea name="descricao" value={formData.descricao} onChange={handleChange} required />
          </label>
          <br />

          <label>
            Setor Atual:
            <select name="setorAtual" value={formData.setorAtual} onChange={handleChange} required>
              <option value="Gabarito">Gabarito</option>
              <option value="Impressao">Impressao</option>
              <option value="Batida">Batida</option>
              <option value="Costura">Costura</option>
              <option value="Embalagem">Embalagem</option>
            </select>
          </label>
          <br />

          <label>
            Data de Entrega:
            <input
              name="dataEntrega"
              type="date"
              value={formData.dataEntrega}
              onChange={handleChange}
              required
            />
          </label>
          <br />

          {/* Imagem Principal */}
          <label>
            Imagem Principal:
            {formData.imagem && (
              <div>
                <img src={formData.imagem} alt="Principal" style={{ height: '80px' }} />
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleImagemPrincipalChange} />
          </label>
          <br />

          {/* Imagens Extras já salvas */}
          <label>
            Imagens Extras:
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {Array.isArray(formData.imagensExtras) && formData.imagensExtras.map((img, index) => (
                <div key={index} style={{ position: 'relative' }}>
                  <img src={img} alt={`Extra ${index}`} style={{ height: '60px' }} />
                  <button
                    type="button"
                    onClick={() => removerImagemExtra(img)}
                    style={{ display: 'block' }}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </label>
          <br />

          {/* Novas imagens extras (antes de upload) */}
          <label>
            Novas Imagens Extras:
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {novasImagensExtras.map((file, index) => {
                const url = URL.createObjectURL(file);
                return (
                  <div key={index} style={{ position: 'relative' }}>
                    <img src={url} alt={`Nova Extra ${index}`} style={{ height: '60px' }} />
                    <button
                      type="button"
                      onClick={() => removerNovaImagemExtra(index)}
                      style={{ display: 'block' }}
                    >
                      Remover
                    </button>
                  </div>
                );
              })}
            </div>
            <input type="file" multiple accept="image/*" onChange={handleImagensExtrasChange} />
          </label>
          <br />

          {/* Checkbox URGENTE */}
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
              id="urgente-edit"
              checked={urgente}
              onChange={e => setUrgente(e.target.checked)}
              style={{ width: 22, height: 22, accentColor: 'red', cursor: 'pointer' }}
            />
            <label
              htmlFor="urgente-edit"
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

          <button type="submit">Salvar</button>
          <button type="button" onClick={onClose} style={{ marginLeft: '8px' }}>
            Cancelar
          </button>
        </form>
      </div>
    </div>
  );
};

export default ModalEditar;
