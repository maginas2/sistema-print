import { jsPDF } from 'jspdf';
import { fmt } from './fmt';
import imgTopoUrl   from '../assets/parte de cima.jpg.jpeg';
import imgRodapeUrl from '../assets/parte de baixo.jpg.jpeg';
import logoUrl      from '../assets/print logo.png';

export async function gerarRelatoriosPDF({ registros, stats, labelPeriodo, filtroStatus, isAdmin }) {
  const imgLogo = await toBase64(logoUrl);

  const doc  = new jsPDF({ unit: 'mm', format: 'a4' });
  const W    = 210;
  const ML   = 14;
  const CW   = W - ML * 2;

  const HEADER_H = 32;
  const LIMITE_Y = 285;

  const rgb   = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const fill  = c => doc.setFillColor(...rgb(c));
  const color = c => doc.setTextColor(...rgb(c));
  const draw  = c => doc.setDrawColor(...rgb(c));

  const statusLabel = filtroStatus === 'concluido' ? 'Concluídos' : filtroStatus === 'pendente' ? 'Pendentes' : 'Todos';
  const hoje        = new Date().toLocaleDateString('pt-BR');

  const drawHeader = () => {
    fill('#111111');
    doc.rect(0, 0, W, HEADER_H, 'F');
    const LOGO_H_MM = 20;
    const LOGO_W_MM = 62;
    doc.addImage(imgLogo, 'PNG', (W - LOGO_W_MM) / 2, (HEADER_H - LOGO_H_MM) / 2, LOGO_W_MM, LOGO_H_MM);
  };

  // ── Topo ──────────────────────────────────────
  drawHeader();

  let y = HEADER_H + 4;

  // Título
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); color('#000000');
  doc.text('RELATÓRIO DE ORÇAMENTOS', ML, y + 5);
  draw('#1A56DB'); doc.setLineWidth(0.6);
  doc.line(ML, y + 7, ML + 92, y + 7);

  // Meta info à direita
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); color('#555555');
  doc.text(`Período: ${labelPeriodo}`, W - ML, y + 2,  { align: 'right' });
  doc.text(`Status: ${statusLabel}`,   W - ML, y + 7,  { align: 'right' });
  doc.text(`Gerado em: ${hoje}`,        W - ML, y + 12, { align: 'right' });

  y += 18;

  // ── Stats ────────────────────────────────────
  const STAT_W = CW / 4;
  const STAT_H = 18;

  const statItems = [
    { label: 'ORÇAMENTOS',      value: String(stats.total_orcamentos), color: '#1A56DB' },
    { label: 'VALOR TOTAL',     value: fmt(stats.valor_total),         color: '#059669' },
    { label: 'TICKET MÉDIO',    value: fmt(stats.ticket_medio),        color: '#7C3AED' },
    { label: 'MAIOR ORÇAMENTO', value: fmt(stats.maior_orcamento),     color: '#B45309' },
  ];

  statItems.forEach((s, i) => {
    const sx = ML + i * STAT_W;
    fill('#F8FAFC'); draw('#E2E8F0'); doc.setLineWidth(0.3);
    doc.roundedRect(sx, y, STAT_W - 2, STAT_H, 2, 2, 'FD');
    fill(s.color);
    doc.roundedRect(sx, y, 3, STAT_H, 1, 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); color('#94A3B8');
    doc.text(s.label, sx + 6, y + 5.5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); color('#1E293B');
    doc.text(s.value, sx + 6, y + 13);
  });

  y += STAT_H + 8;

  // ── Tabela ───────────────────────────────────
  const HDR_H = 10;
  const ROW_H = 9;

  // Colunas dinâmicas
  let C;
  if (isAdmin) {
    C = {
      cliente: { x: ML,       w: 56 },
      num:     { x: ML + 56,  w: 16 },
      usuario: { x: ML + 72,  w: 30 },
      data:    { x: ML + 102, w: 22 },
      status:  { x: ML + 124, w: 26 },
      total:   { x: ML + 150, w: 32 },
    };
  } else {
    C = {
      cliente: { x: ML,       w: 72 },
      num:     { x: ML + 72,  w: 20 },
      data:    { x: ML + 92,  w: 25 },
      status:  { x: ML + 117, w: 28 },
      total:   { x: ML + 145, w: 37 },
    };
  }

  const cols = isAdmin
    ? [['CLIENTE', C.cliente], ['Nº', C.num], ['FEITO POR', C.usuario], ['DATA', C.data], ['STATUS', C.status], ['TOTAL', C.total]]
    : [['CLIENTE', C.cliente], ['Nº', C.num], ['DATA', C.data], ['STATUS', C.status], ['TOTAL', C.total]];

  // Cabeçalho
  fill('#1E293B'); draw('#1E293B'); doc.setLineWidth(0.4);
  doc.rect(ML, y, CW, HDR_H, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); color('#FFFFFF');
  cols.forEach(([label, col]) => {
    doc.text(label, col.x + 3, y + HDR_H * 0.65);
  });
  y += HDR_H;

  // Linhas
  registros.forEach((o, idx) => {
    if (y + ROW_H > LIMITE_Y) {
      doc.addPage();
      drawHeader();
      y = HEADER_H + 8;
      // re-desenha cabeçalho da tabela
      fill('#1E293B'); draw('#1E293B');
      doc.rect(ML, y, CW, HDR_H, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); color('#FFFFFF');
      cols.forEach(([label, col]) => { doc.text(label, col.x + 3, y + HDR_H * 0.65); });
      y += HDR_H;
    }

    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    fill(bg); draw('#E2E8F0'); doc.setLineWidth(0.2);
    doc.rect(ML, y, CW, ROW_H, 'FD');

    const ty = y + ROW_H * 0.68;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); color('#1E293B');
    const clienteTrunc = doc.splitTextToSize(o.cliente || '—', C.cliente.w - 4)[0];
    doc.text(clienteTrunc, C.cliente.x + 3, ty);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); color('#1A56DB');
    doc.text(o.numero || '—', C.num.x + 3, ty);

    if (isAdmin) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); color('#475569');
      const uTrunc = doc.splitTextToSize(o.usuarios?.nome || o.usuario_nome || '—', C.usuario.w - 4)[0];
      doc.text(uTrunc, C.usuario.x + 3, ty);
    }

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); color('#475569');
    const dataStr = o.data || new Date(o.criado_em).toLocaleDateString('pt-BR');
    doc.text(dataStr, C.data.x + 3, ty);

    const sCor = o.status === 'concluido' ? '#059669' : '#B45309';
    const sTxt = o.status === 'concluido' ? 'Concluído' : 'Pendente';
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); color(sCor);
    doc.text(sTxt, C.status.x + 3, ty);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); color('#1A56DB');
    doc.text(fmt(parseFloat(o.total) || 0), C.total.x + C.total.w - 3, ty, { align: 'right' });

    y += ROW_H;
  });

  // Linha total final
  y += 4;
  draw('#1E293B'); doc.setLineWidth(0.4);
  doc.line(ML, y, ML + CW, y);
  y += 6;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); color('#1E293B');
  doc.text(`Total geral: ${fmt(stats.valor_total)}`, W - ML, y, { align: 'right' });

  doc.save(`relatorio-orcamentos-${hoje.replace(/\//g, '-')}.pdf`);
}

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
