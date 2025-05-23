import React from 'react';
import jsPDF from 'jspdf';

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

  // Inserir imagens
  const insertImages = async (startY) => {
  const colWidth = (pageWidth - margin * 3) / 2;
  const imgMaxWidth = colWidth;
  const imgMaxHeight = 200;

  // Carregar imagem principal e obter proporção original
  const imgPrincipalBase64 = await getBase64ImageFromUrl(pedido.imagem);
  const img = new Image();
  img.src = imgPrincipalBase64;

  await new Promise((resolve) => {
    img.onload = () => resolve();
  });

  const aspectRatio = img.width / img.height;
  let imgWidth = imgMaxWidth;
  let imgHeight = imgWidth / aspectRatio;

  // Se a altura exceder o máximo, redimensiona novamente
  if (imgHeight > imgMaxHeight) {
    imgHeight = imgMaxHeight;
    imgWidth = imgHeight * aspectRatio;
  }

  // Centralizar na coluna esquerda (opcional)
  const imgX = margin + (imgMaxWidth - imgWidth) / 2;

  doc.addImage(imgPrincipalBase64, 'JPEG', imgX, startY, imgWidth, imgHeight);

  // Aumentar tamanho das imagens adicionais
  const extraSize = 180;
  let extrasX = margin;
  let extrasY = startY + imgHeight + 10;

  for (let i = 0; i < imagensExtras.length; i++) {
    try {
      const imgExtraBase64 = await getBase64ImageFromUrl(imagensExtras[i]);
      doc.addImage(imgExtraBase64, 'JPEG', extrasX, extrasY, extraSize, extraSize);
      extrasX += extraSize + 10;

      if (extrasX + extraSize > margin + colWidth) {
        extrasX = margin;
        extrasY += extraSize + 10;
      }
    } catch (e) {
      console.warn('Erro ao carregar imagem adicional:', e);
    }
  }

  return { endY: extrasY + extraSize + 10 };
};

  // Geração do PDF
  try {
    let pageIndex = 1;
    let currentY = drawHeader(pageIndex);
    const { endY } = await insertImages(currentY);

    // Descrição
    const descricaoX = margin * 2 + (pageWidth - margin * 3) / 2;
    let descricaoY = currentY;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor('#000');
    doc.text('Descrição:', descricaoX, descricaoY);
    descricaoY += 20;

    doc.setFont('helvetica', 'normal');
    const descricaoText = pedido.descricao || '';
    const descricaoMaxWidth = (pageWidth - margin * 3) / 2;
    const descricaoLines = doc.splitTextToSize(descricaoText, descricaoMaxWidth);

    const lineHeight = 16;
    let linesPerPage = Math.floor((pageHeight - descricaoY - margin) / lineHeight);

    while (descricaoLines.length > 0) {
      const pageLines = descricaoLines.splice(0, linesPerPage);

      if (pageIndex > 1) {
        doc.addPage();
        currentY = drawHeader(pageIndex);
        await insertImages(currentY);
        descricaoY = currentY + 20;
      }

      doc.text(pageLines, descricaoX, descricaoY);
      pageIndex++;
    }

    doc.save(`pedido_${pedido.pedido}.pdf`);
  } catch (error) {
    alert('Erro ao gerar PDF: ' + error.message);
  }
};

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

        <img
          src={pedido.imagem}
          alt="Imagem principal"
          style={{
            width: '100%',
            maxHeight: '350px',
            objectFit: 'contain',
            marginBottom: '15px',
            borderRadius: '6px',
          }}
        />

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
                <img
                  key={index}
                  src={url}
                  alt={`Imagem extra ${index + 1}`}
                  style={{
                    width: '120px',
                    height: '120px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  }}
                />
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
