import jsPDF from 'jspdf';

// Função utilitária para carregar imagem e retornar base64
export const getBase64ImageFromUrl = async (imageUrl) => {
  if (!imageUrl) return '';
  const res = await fetch(imageUrl);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

// Função principal para gerar PDF
export const gerarPDFPedido = async (pedido) => {
  // Formatação da data de entrega
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
    ? Array.isArray(pedido.imagensExtras)
      ? pedido.imagensExtras
      : JSON.parse(pedido.imagensExtras)
    : [];

  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  let pageIndex = 1;

  // Cabeçalho
  const drawHeader = (pagina = 1) => {
    const startY = 60;
    if (pagina > 1) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(14);
      doc.setTextColor('#999');
      doc.text(`Continuação - Página ${pagina}`, pageWidth / 2, 30, { align: 'center' });
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor('#000');
    doc.text(`Data de Entrega: ${dataFormatada}`, pageWidth / 2, startY, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.setTextColor('#444');
    doc.text(`Cliente: ${pedido.cliente || '-'}`, margin, startY + 35);
    doc.text(`Pedido: ${pedido.pedido || '-'}`, margin, startY + 55);
    return startY + 90;
  };

  // Imagem principal + descrição
  const insertMainImageAndDescricao = async (startY) => {
    const contentWidth = pageWidth - margin * 2;
    const halfWidth = contentWidth / 2;
    const maxImageWidth = halfWidth;
    const maxImageHeight = 260;
    let descricaoY, descricaoX, novoStartY;

    const imgBase64 = pedido.imagem ? await getBase64ImageFromUrl(pedido.imagem) : null;
    let width = maxImageWidth, height = maxImageHeight;

    if (imgBase64) {
      const img = new window.Image();
      img.src = imgBase64;
      await new Promise((resolve) => { img.onload = resolve; });
      width = img.width;
      height = img.height;
      const ratio = Math.min(maxImageWidth / width, maxImageHeight / height);
      width *= ratio;
      height *= ratio;
    }

    const imageX = margin;
    const imageY = startY;
    descricaoX = imageX + width + 20;
    descricaoY = imageY;

    const descricaoText = pedido.descricao || '';
    const descricaoMaxWidth = pageWidth - descricaoX - margin;
    const descricaoLines = doc.splitTextToSize(descricaoText, descricaoMaxWidth);

    // Header novamente só para garantir alinhamento
    novoStartY = drawHeader(pageIndex);
    if (imgBase64) doc.addImage(imgBase64, 'JPEG', imageX, novoStartY, width, height);

    // Título Descrição
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor('#000');
    doc.text('Descrição:', descricaoX, descricaoY);
    descricaoY += 20;

    // Corpo da descrição
    doc.setFont('helvetica', 'normal');
    const lineHeight = 16;
    let i = 0;
    let maxY = imageY + height;

    while (i < descricaoLines.length) {
      if (descricaoY + lineHeight > pageHeight - margin) {
        doc.addPage();
        const novoStartY = drawHeader(++pageIndex);
        if (imgBase64) doc.addImage(imgBase64, 'JPEG', imageX, novoStartY, width, height);

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

  // Imagens adicionais (embaixo)
  const insertExtraImages = async (startY) => {
    const x = margin;
    const maxWidth = 260;
    const maxHeight = 200;
    const spacing = 15;
    let y = startY;

    for (let i = 0; i < imagensExtras.length; i++) {
      try {
        const extraBase64 = await getBase64ImageFromUrl(imagensExtras[i]);
        if (!extraBase64) continue;
        const img = new window.Image();
        img.src = extraBase64;
        await new Promise((resolve) => { img.onload = resolve; });
        let w = img.width, h = img.height;
        const ratio = Math.min(maxWidth / w, maxHeight / h);
        w *= ratio; h *= ratio;
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

    // Imagem principal + descrição
    const { endY: afterMain } = await insertMainImageAndDescricao(currentY);

    // Imagens extras
    await insertExtraImages(afterMain);

    doc.save(`pedido_${pedido.pedido || 'pedido'}.pdf`);
  } catch (error) {
    alert('Erro ao gerar PDF: ' + error.message);
  }
};
