import React from 'react';
import jsPDF from 'jspdf';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';

const ModalVisualizar = ({ pedido, onClose }) => {
  const criarDataLocal = (dataStr) => {
    if (!dataStr) return null;
    const partes = dataStr.split('-');
    const ano = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    const dia = parseInt(partes[2], 10);
    return new Date(ano, mes, dia);
  };

  const dataEntregaLocal = criarDataLocal(pedido.dataEntrega);
  const dataFormatada = dataEntregaLocal
    ? dataEntregaLocal.toLocaleDateString()
    : '-';

  const imagensExtras = pedido.imagensExtras
    ? JSON.parse(pedido.imagensExtras)
    : [];

  // Função para carregar imagem e retornar base64 para o jsPDF
  const getBase64ImageFromUrl = async (imageUrl) => {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
  };

  const gerarPDF = async () => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    let pageIndex = 1;

    // Cabeçalho da página
    const drawHeader = (pagina = 1) => {
      const startY = 60;

      if (pagina > 1) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(14);
        doc.setTextColor('#999');
        doc.text(`Continuação - Página ${pagina}`, pageWidth / 2, 30, { align: 'center' });
      }

      // Destaque na data de entrega
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.setTextColor('#000');
      doc.text(`Data de Entrega: ${dataFormatada}`, pageWidth / 2, startY, { align: 'center' });

      // Dados do cliente e pedido
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(13);
      doc.setTextColor('#444');
      doc.text(`Cliente: ${pedido.cliente}`, margin, startY + 35);
      doc.text(`Pedido: ${pedido.pedido}`, margin, startY + 55);

      return startY + 90;
    };

    // Imagem + Descrição lado a lado
    const insertMainImageAndDescricao = async (startY) => {
      const contentWidth = pageWidth - margin * 2;
      const halfWidth = contentWidth / 2;

      const maxImageWidth = halfWidth;
      const maxImageHeight = 260;

      const imgBase64 = await getBase64ImageFromUrl(pedido.imagem);
      const img = new window.Image();
      img.src = imgBase64;
      await new Promise((resolve) => { img.onload = resolve; });

      let width = img.width;
      let height = img.height;
      const ratio = Math.min(maxImageWidth / width, maxImageHeight / height);
      width *= ratio;
      height *= ratio;

      const imageX = margin;
      const imageY = startY;
      let descricaoX = imageX + width + 20;
      let descricaoY = imageY;

      const descricaoText = pedido.descricao || '';
      const descricaoMaxWidth = pageWidth - descricaoX - margin;
      const descricaoLines = doc.splitTextToSize(descricaoText, descricaoMaxWidth);

      // Desenha imagem
      const novoStartY = drawHeader(pageIndex); // pega o Y final do cabeçalho
      doc.addImage(imgBase64, 'JPEG', imageX, novoStartY, width, height);

      // Título
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor('#000');
      doc.text('Descrição:', descricaoX, descricaoY);
      descricaoY += 20;

      // Texto
      doc.setFont('helvetica', 'normal');
      const lineHeight = 16;
      let i = 0;
      let maxY = imageY + height;

      while (i < descricaoLines.length) {
        if (descricaoY + lineHeight > pageHeight - margin) {
          doc.addPage();
          const novoStartY = drawHeader(++pageIndex); // redesenha cabeçalho e guarda Y
          doc.addImage(imgBase64, 'JPEG', imageX, novoStartY, width, height);

          descricaoX = imageX + width + 20;
          descricaoY = novoStartY;

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(13);
          doc.text('Descrição (continuação):', descricaoX, descricaoY);
          descricaoY += 20;

          doc.setFont('helvetica', 'normal');
        }

        doc.text(descricaoLines[i], descricaoX, descricaoY);
        descricaoY += lineHeight;
        i++;
        maxY = Math.max(maxY, descricaoY);
      }

      return { endY: imageY + height + 20 };
    };

    // Imagens adicionais em grade abaixo
    const insertExtraImages = async (startY) => {
      const x = margin; // mantém à esquerda
      const maxWidth = 260;
      const maxHeight = 200;
      const spacing = 15;
      let y = startY;

      for (let i = 0; i < imagensExtras.length; i++) {
        try {
          const extraBase64 = await getBase64ImageFromUrl(imagensExtras[i]);
          const img = new window.Image();
          img.src = extraBase64;
          await new Promise((resolve) => { img.onload = resolve; });

          let w = img.width;
          let h = img.height;
          const ratio = Math.min(maxWidth / w, maxHeight / h);
          w *= ratio;
          h *= ratio;

          if (y + h > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }

          doc.addImage(extraBase64, 'JPEG', x, y, w, h);
          y += h + spacing;
        } catch (e) {
          console.warn('Erro ao carregar imagem adicional:', e);
        }
      }

      return { endY: y };
    };

    // Geração do PDF
    try {
      let pageIndex = 1;
      let currentY = drawHeader(pageIndex);

      // Imagem principal + descrição lado a lado
      const { endY: afterMain } = await insertMainImageAndDescricao(currentY);

      // Imagens adicionais abaixo
      await insertExtraImages(afterMain);

      doc.save(`pedido_${pedido.pedido}.pdf`);
    } catch (error) {
      alert('Erro ao gerar PDF: ' + error.message);
    }
  };

  // ---- Render Modal ----
  return (
    <div
      className="modalOverlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: '10px',
      }}
    >
      <div
        className="modalContent"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          padding: '20px 30px 30px 30px',
          borderRadius: '12px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          boxShadow: '0 0 15px rgba(0, 0, 0, 0.3)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'transparent',
            border: 'none',
            fontSize: '22px',
            cursor: 'pointer',
            color: '#333',
            fontWeight: 'bold',
          }}
          aria-label="Fechar modal"
        >
          ×
        </button>

        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Detalhes do Pedido</h2>

        <Zoom
  zoomImg={{
    src: pedido.imagem,
    style: {
      maxWidth: '90vw',
      maxHeight: '90vh',
      width: 'auto',
      height: 'auto',
      objectFit: 'contain',
      background: '#f8f8f8',
      borderRadius: '12px'
    }
  }}
>
  <div style={{
    width: '100%',
    minHeight: '100px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8f8f8',
    borderRadius: '6px',
    marginBottom: '15px',
  }}>
    <img
      src={`https://images.weserv.nl/?url=${encodeURIComponent(pedido.imagem)}&w=700&fit=contain`}
      alt="Imagem principal"
      style={{
        maxWidth: '100%',
        maxHeight: '350px',
        width: 'auto',
        height: 'auto',
        objectFit: 'contain',
        background: '#f8f8f8',
        borderRadius: '6px',
        cursor: 'zoom-in',
        display: 'block'
      }}
      loading="lazy"
      onError={function handleThumbError(e) {
        if (e.target.dataset.fallback !== "original") {
          e.target.src = pedido.imagem;
          e.target.dataset.fallback = "original";
        } else {
          e.target.src = 'https://via.placeholder.com/150x150?text=Erro';
        }
      }}
    />
  </div>
</Zoom>


        <p><strong>Pedido:</strong> {pedido.pedido}</p>
        <p><strong>Cliente:</strong> {pedido.cliente}</p>

        <p><strong>Descrição:</strong></p>
        <div
          style={{
            whiteSpace: 'pre-line',
            backgroundColor: '#f8f8f8',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '15px',
            maxHeight: '180px',
            overflowY: 'auto',
          }}
        >
          {pedido.descricao}
        </div>

        <p><strong>Setor Atual:</strong> {pedido.setorAtual}</p>
        <p><strong>Data de Entrega:</strong> {dataFormatada}</p>

        {imagensExtras.length > 0 && (
          <>
            <h3>Imagens Adicionais</h3>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '15px',
                marginBottom: '15px',
              }}
            >
              {imagensExtras.map((url, index) => (
                <Zoom
                  key={index}
                  zoomImg={{ src: url }}
                >
                  <img
                    src={`https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=120&h=120&fit=cover`}
                    alt={`Imagem extra ${index + 1}`}
                    style={{
                      width: '120px',
                      height: '120px',
                      objectFit: 'contain',     // <-- Não corta lateral
                      background: '#f8f8f8',    // <-- Fundo neutro
                      borderRadius: '8px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                      cursor: 'zoom-in',
                    }}
                    loading="lazy"
                    onError={function handleThumbError(e) {
                      if (e.target.dataset.fallback !== "original") {
                        e.target.src = url;
                        e.target.dataset.fallback = "original";
                      } else {
                        e.target.src = 'https://via.placeholder.com/120x120?text=Erro';
                      }
                    }}
                  />
                </Zoom>
              ))}
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
          <button
            onClick={gerarPDF}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Gerar PDF
          </button>

          <button
            onClick={onClose}
            style={{
              backgroundColor: '#888',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalVisualizar;
