import { jsPDF } from 'jspdf';
import { fmt } from './fmt';
import imgTopoUrl   from '../assets/parte de cima.jpg.jpeg';
import imgRodapeUrl from '../assets/parte de baixo.jpg.jpeg';

async function toBase64(url) {
  const res  = await fetch(url);
  const blob = await res.blob();
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

export async function gerarPDF({ cliente, numero, data, itens }) {
  const [imgTopo, imgRodape] = await Promise.all([
    toBase64(imgTopoUrl),
    toBase64(imgRodapeUrl),
  ]);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W  = 210;
  const ML = 14;   // margem esquerda
  const MR = 14;   // margem direita
  const CW = W - ML - MR; // largura de conteúdo = 182mm

  const totalGeral = itens.reduce((s, i) => s + i.total, 0);

  const TOPO_H   = W * (436 / 2380); // ≈ 38.5 mm
  const RODAPE_H = W * (300 / 2378); // ≈ 26.5 mm
  const LIMITE_Y = 297 - RODAPE_H - 6;

  const rgb   = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const fill  = c => doc.setFillColor(...rgb(c));
  const color = c => doc.setTextColor(...rgb(c));
  const draw  = c => doc.setDrawColor(...rgb(c));

  // ── Cabeçalho (imagem) ─────────────────────────
  doc.addImage(imgTopo, 'JPEG', 0, 0, W, TOPO_H);

  // ── Nome do cliente (logo após o "Att," da imagem) ─
  let y = TOPO_H + 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  color('#000000');
  const nomeCliente = (cliente || 'Não informado').toUpperCase();
  doc.text(nomeCliente, ML, y + 5);
  // sublinhado manual
  draw('#000000'); doc.setLineWidth(0.5);
  doc.line(ML, y + 6.5, ML + doc.getTextWidth(nomeCliente), y + 6.5);

  // Nº e data — canto direito
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  color('#555555');
  if (numero && numero !== '—') doc.text(`Nº ${numero}`, W - MR, y + 2, { align: 'right' });
  doc.text(`Data: ${data}`, W - MR, y + 7, { align: 'right' });

  y += 14;

  // ── Tabela ──────────────────────────────────────
  // Colunas: x = posição inicial, w = largura
  const C = {
    item:  { x: ML,       w: 15  },
    desc:  { x: ML + 15,  w: 85  },
    unid:  { x: ML + 100, w: 20  },
    vunit: { x: ML + 120, w: 34  },
    vtot:  { x: ML + 154, w: 28  },
    // soma: 15+85+20+34+28 = 182 = CW ✓
  };

  const HDR_H = 12;
  const ROW_H = 11;

  // Cabeçalho da tabela (fundo preto)
  fill('#111111'); draw('#111111');
  doc.setLineWidth(0.5);
  doc.rect(ML, y, CW, HDR_H, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  color('#FFFFFF');

  const cy = y + HDR_H / 2;
  doc.text('ITEM',          C.item.x  + C.item.w  / 2, cy + 1.5, { align: 'center', baseline: 'middle' });
  doc.text('DESCRIÇÃO',     C.desc.x  + 3,              cy + 1.5, { baseline: 'middle' });
  doc.text('UNID.',         C.unid.x  + C.unid.w  / 2, cy + 1.5, { align: 'center', baseline: 'middle' });
  // "VALOR UNITÁRIO" em duas linhas
  doc.text('VALOR',         C.vunit.x + C.vunit.w / 2, cy - 1,   { align: 'center', baseline: 'middle' });
  doc.text('UNITÁRIO',      C.vunit.x + C.vunit.w / 2, cy + 3.5, { align: 'center', baseline: 'middle' });
  doc.text('VALOR TOTAL',   C.vtot.x  + C.vtot.w  / 2, cy + 1.5, { align: 'center', baseline: 'middle' });

  // divisórias verticais no cabeçalho
  draw('#444444'); doc.setLineWidth(0.3);
  [C.desc.x, C.unid.x, C.vunit.x, C.vtot.x].forEach(x => {
    doc.line(x, y, x, y + HDR_H);
  });

  y += HDR_H;

  // Linhas de itens
  itens.forEach((item, idx) => {
    if (y + ROW_H > LIMITE_Y - 36) {
      doc.addPage();
      y = 16;
    }

    // fundo branco + borda
    fill('#FFFFFF');
    doc.rect(ML, y, CW, ROW_H, 'F');
    draw('#111111'); doc.setLineWidth(0.5);
    doc.rect(ML, y, CW, ROW_H, 'S');

    // divisórias verticais
    doc.setLineWidth(0.3);
    [C.desc.x, C.unid.x, C.vunit.x, C.vtot.x].forEach(x => {
      doc.line(x, y, x, y + ROW_H);
    });

    const ty = y + ROW_H * 0.66;

    // ITEM
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); color('#000000');
    doc.text(String(idx + 1).padStart(2, '0'), C.item.x + C.item.w / 2, ty, { align: 'center' });

    // DESCRIÇÃO  (nome + dimensões)
    const largStr = item.largura.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    const altStr  = item.altura.toLocaleString('pt-BR',  { maximumFractionDigits: 2 });
    const desc    = `${item.produto} ${largStr}×${altStr}`;
    const descMax = doc.splitTextToSize(desc, C.desc.w - 5)[0]; // 1ª linha
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); color('#000000');
    doc.text(descMax, C.desc.x + 3, ty);

    // UNID.
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); color('#000000');
    doc.text(String(item.quantidade), C.unid.x + C.unid.w / 2, ty, { align: 'center' });

    // VALOR UNITÁRIO
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); color('#000000');
    doc.text(fmt(item.valorUnit), C.vunit.x + C.vunit.w - 3, ty, { align: 'right' });

    // VALOR TOTAL (vermelho)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); color('#CC0000');
    doc.text(fmt(item.total), C.vtot.x + C.vtot.w - 3, ty, { align: 'right' });

    y += ROW_H;
  });

  // ── Valor total ────────────────────────────────
  y += 8;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); color('#CC0000');
  doc.text('Valor total:', W - MR, y, { align: 'right' });
  y += 9;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); color('#000000');
  doc.text(fmt(totalGeral), W - MR, y, { align: 'right' });
  y += 12;

  // ── Rodapé (imagem) ────────────────────────────
  doc.addImage(imgRodape, 'JPEG', 0, 297 - RODAPE_H, W, RODAPE_H);

  const nomeArq = `orcamento-${numero && numero !== '—' ? numero : 'sem-numero'}-${data.replace(/\//g, '-')}.pdf`;
  doc.save(nomeArq);
}
