import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import './CadastroPedido.css';

const LISTA_MALHAS = [
  "dryfit", "dry jersie", "helanquinha", "aerodry", "dry tec",
  "dry solution", "piquet de poliester", "piquet de algodão",
  "dry manchester", "dry nba", "uv ft50", "helanca colegial",
  "poliester", "oxford", "tactel", "ribana"
];

// Função para registrar movimentação de estoque
async function registrarMovimentacaoEstoque({ malha, quantidade, tipo, usuario, obs }) {
  return supabase
    .from('movimentacoes_estoque')
    .insert([{
      malha,
      quantidade: Math.abs(Number(quantidade)),
      tipo, // 'entrada' ou 'saida'
      usuario,
      obs,
      data: new Date().toISOString(),
    }]);
}

// Compacta imagem original para largura máxima de 1000px, qualidade 0.8
async function compactarImagem(file, larguraMax = 1000, qualidade = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new window.Image();
      img.onload = function () {
        let width = img.width;
        let height = img.height;
        if (width > larguraMax) {
          height = Math.round((larguraMax / width) * height);
          width = larguraMax;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', qualidade);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Gera thumb pequena (exibição na tabela)
async function gerarThumbImagem(file, larguraThumb = 80) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new window.Image();
      img.onload = function () {
        const scale = larguraThumb / img.width;
        const canvas = document.createElement('canvas');
        canvas.width = larguraThumb;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.7);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

const CadastroPedido = ({ onCadastrar }) => {
  const [pedido, setPedido] = useState('');
  const [cliente, setCliente] = useState('');
  const [imagemPrincipal, setImagemPrincipal] = useState(null);
  const [imagensExtras, setImagensExtras] = useState([]);
  const [descricao, setDescricao] = useState('');
  const [setorAtual, setSetorAtual] = useState('');
  const [dataEntrega, setDataEntrega] = useState('');
  const [urgente, setUrgente] = useState(false);
  const [malha, setMalha] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [tipoProduto, setTipoProduto] = useState('');

  const handleAdicionarImagemExtra = (e) => {
    const arquivos = Array.from(e.target.files);
    setImagensExtras((prev) => [...prev, ...arquivos]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!tipoProduto) {
      alert('Selecione o tipo do produto.');
      return;
    }
    if (!imagemPrincipal) {
      alert('Selecione a imagem principal');
      return;
    }

    // Atualizar estoque antes de cadastrar pedido
    if (malha && quantidade > 0) {
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
      await supabase
        .from('estoque')
        .update({ quantidade: estoque.quantidade - quantidade })
        .eq('id', estoque.id);

      // REGISTRA a saída do estoque
      await registrarMovimentacaoEstoque({
        malha,
        quantidade,
        tipo: 'saida',
        usuario: cliente || 'sistema',
        obs: `Saída para produção. Pedido: ${pedido} - Cliente: ${cliente}`,
      });
    }

    // Compactar imagem principal antes de subir
    const imagemCompac = await compactarImagem(imagemPrincipal, 1000, 0.8);
    const filePathPrincipal = `${Date.now()}_${imagemPrincipal.name}`;
    const { error: erroPrincipal } = await supabase
      .storage.from('imagens')
      .upload(filePathPrincipal, imagemCompac);

    if (erroPrincipal) {
      alert('Erro ao enviar imagem principal');
      return;
    }

    const { data: dataPrincipal } = supabase.storage
      .from('imagens')
      .getPublicUrl(filePathPrincipal);
    const urlPrincipal = dataPrincipal.publicUrl;

// Gera e envia thumb real
const thumbBlob = await gerarThumbImagem(imagemPrincipal, 80);
const thumbPath = `thumbs/${Date.now()}_${imagemPrincipal.name}`;
const { error: erroThumb } = await supabase
  .storage.from('imagens')
  .upload(thumbPath, thumbBlob);

if (erroThumb) {
  alert('Erro ao enviar thumbnail');
  return;
}

const { data: dataThumb } = supabase.storage.from('imagens').getPublicUrl(thumbPath);
const urlThumb = dataThumb?.publicUrl;


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

const dataEntregaReal = new Date(dataEntrega); // Data que o cliente vê
const dataParaProducao = new Date(dataEntregaReal); // Data para produção
dataParaProducao.setDate(dataParaProducao.getDate() - 5); // Subtrai 5 dias


    const novaAtividade = {
  pedido,
  cliente,
  imagem: urlPrincipal,
  thumb: urlThumb,
  imagensExtras: JSON.stringify(urlsExtras),
  descricao,
  setorAtual,
  dataEntrega: dataParaProducao.toISOString(), // Para produção
  dataEntregaCliente: dataEntregaReal.toISOString(), // Para cliente
  urgente,
  tipo_produto: tipoProduto
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
    setTipoProduto('');
  };
  
  return (
    <div className="form-container">
      <h1>Cadastro de Pedido</h1>
      <form onSubmit={handleSubmit}>
        {/* TIPO DO PRODUTO NO TOPO, COLORIDO */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 'bold', fontSize: 16 }}>Tipo do Produto:</label>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <label style={{
              background: tipoProduto === 'sublimacao' ? '#3182ce' : '#f1f5fa',
              color: tipoProduto === 'sublimacao' ? '#fff' : '#3182ce',
              padding: '8px 20px',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
              border: '2px solid #3182ce',
              boxShadow: tipoProduto === 'sublimacao' ? '0 2px 10px #3182ce40' : undefined
            }}>
              <input
                type="radio"
                value="sublimacao"
                checked={tipoProduto === 'sublimacao'}
                onChange={() => setTipoProduto('sublimacao')}
                style={{ marginRight: 8 }}
              />
              Sublimação
            </label>
            <label style={{
              background: tipoProduto === 'algodao' ? '#22c55e' : '#f1f5fa',
              color: tipoProduto === 'algodao' ? '#fff' : '#178445',
              padding: '8px 20px',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
              border: '2px solid #22c55e',
              boxShadow: tipoProduto === 'algodao' ? '0 2px 10px #22c55e40' : undefined
            }}>
              <input
                type="radio"
                value="algodao"
                checked={tipoProduto === 'algodao'}
                onChange={() => setTipoProduto('algodao')}
                style={{ marginRight: 8 }}
              />
              Algodão
            </label>
          </div>
        </div>
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
                  style={{
                    width: '80px', height: '80px',
                    objectFit: 'cover', border: '1px solid #ccc', borderRadius: '4px'
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const novaLista = imagensExtras.filter((_, i) => i !== index);
                    setImagensExtras(novaLista);
                  }}
                  style={{
                    position: 'absolute',
                    top: '2px', right: '2px',
                    background: 'rgba(255, 0, 0, 0.8)',
                    color: '#fff', border: 'none', borderRadius: '4px',
                    padding: '0 5px', fontSize: '12px', cursor: 'pointer', lineHeight: '16px'
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
            placeholder="Ex: DRYFIT - Camisa preta M (cliente João)..."
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
