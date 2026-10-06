/* Lançamentos LC — PDF de orçamento e de comprovante de venda, gerado no próprio celular (funciona sem internet).
   Usa jsPDF + AutoTable (pasta lib/, licença MIT). */
const PDF = (() => {
  const NAVY = [27, 58, 92], AZUL = [45, 93, 143], AZUL_CLARO = [232, 239, 247], CINZA = [96, 104, 112], CINZA_CLARO = [244, 245, 246],
        LINHA = [218, 222, 226], VERDE = [38, 125, 74], VERDE_CLARO = [233, 245, 236], TEXTO = [33, 37, 41];
  const M = 14, W = 210, H = 297;
  const brl = v => 'R$ ' + (+v || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const qtd = v => (+v || 0).toLocaleString('pt-BR', {maximumFractionDigits: 3});
  const hoje = d => (d ? new Date(d) : new Date()).toLocaleDateString('pt-BR');
  const limpo = s => String(s ?? '').replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x00-\xFF€•…]/g, '');
  let carregando = null;

  function carregar(src) {
    return new Promise((ok, erro) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => erro(new Error('não carregou ' + src)); document.head.appendChild(s); });
  }
  function preparar() {   // carrega o gerador logo depois de abrir o app, para o botão responder na hora
    if (!carregando) carregando = new Promise(r => setTimeout(r, 800)).then(() => carregar('lib/jspdf.umd.min.js')).then(() => carregar('lib/jspdf.plugin.autotable.min.js')).catch(e => { carregando = null; throw e; });
    return carregando;
  }
  function pronto() {
    if (window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API.autoTable) return true;
    preparar(); throw new Error('o gerador de PDF ainda está carregando. Toque de novo em alguns segundos.');
  }

  function cabecalho(doc, e) {
    doc.setFillColor(...NAVY); doc.rect(M, 12, W - 2 * M, 27, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13.5);
    doc.text(limpo(e.razao || e.apelido).toUpperCase(), M + 6, 21, {maxWidth: 104});
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.3);
    const l2 = [e.cnpj ? 'CNPJ: ' + e.cnpj : ''].filter(Boolean).join('   |   ');
    const l3 = [e.fone ? 'Fone/WhatsApp: ' + e.fone : '', e.email ? e.email : ''].filter(Boolean).join('   |   ');
    if (l2) doc.text(limpo(l2), M + 6, 27.5);
    if (l3) doc.text(limpo(l3), M + 6, 32.5, {maxWidth: 108});
    const x = 128;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.3); doc.text('Endereço comercial', x, 20);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(limpo([e.endereco, e.cidade].filter(Boolean).join('\n')), W - M - x - 4), x, 25);
    doc.setDrawColor(...AZUL); doc.setLineWidth(0.6); doc.line(M, 39.3, W - M, 39.3);
  }

  function titulo(doc, txt, numero, data, sub) {
    doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.text(txt, M, 54);
    doc.setFontSize(9.5); doc.setTextColor(...CINZA);
    doc.setFont('helvetica', 'bold'); doc.text('Nº', 150, 49); doc.setFont('helvetica', 'normal'); doc.text(limpo(numero || '-'), 157, 49);
    doc.setFont('helvetica', 'bold'); doc.text('Data:', 150, 55); doc.setFont('helvetica', 'normal'); doc.text(data, 161, 55);
    let y = 60;
    if (sub) { doc.setFontSize(9.5); const t = doc.splitTextToSize(limpo(sub), W - 2 * M); doc.text(t, M, y); y += t.length * 4.6; }
    return y + 2;
  }

  function cliente(doc, y, c) {
    const linhas = [c.telefone ? 'Telefone: ' + c.telefone : '', c.local ? c.local : ''].filter(Boolean).join('   |   ');
    const h = linhas ? 16 : 11;
    doc.setFillColor(...CINZA_CLARO); doc.setDrawColor(...LINHA); doc.setLineWidth(0.2); doc.rect(M, y, W - 2 * M, h, 'FD');
    doc.setTextColor(...CINZA); doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.text('CLIENTE', M + 4, y + 5);
    doc.setTextColor(...TEXTO); doc.setFontSize(11); doc.text(limpo(c.cliente || '-'), M + 4, y + 10, {maxWidth: W - 2 * M - 8});
    if (linhas) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8.8); doc.setTextColor(...CINZA); doc.text(limpo(linhas), M + 4, y + 14.3); }
    return y + h + 7;
  }

  function secao(doc, y, txt) {
    if (y > H - 50) { doc.addPage(); y = 20; }
    doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text(txt, M, y);
    return y + 3;
  }

  function tabela(doc, y, linhas, rotSubtotal) {
    const sub = linhas.reduce((s, l) => s + (l.qtd || 1) * (l.valor || 0), 0);
    doc.autoTable({
      startY: y, margin: {left: M, right: M},
      head: [['Descrição', 'Qtd.', 'Valor unitário', 'Total']],
      body: linhas.map(l => [limpo(l.desc), qtd(l.qtd || 1) + (l.un && !/^(UN|PC|PEC|PÇ)$/i.test(l.un) ? ' ' + l.un.toLowerCase() : ''), brl(l.valor), brl((l.qtd || 1) * (l.valor || 0))]),
      foot: [['', '', rotSubtotal || 'Subtotal', brl(sub)]],
      theme: 'plain',
      styles: {font: 'helvetica', fontSize: 8.8, textColor: TEXTO, cellPadding: {top: 2.6, bottom: 2.6, left: 3, right: 3}, lineColor: LINHA, lineWidth: {bottom: 0.2}},
      headStyles: {fillColor: AZUL, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5},
      footStyles: {fillColor: AZUL_CLARO, textColor: TEXTO, fontStyle: 'bold'},
      columnStyles: {0: {cellWidth: 'auto'}, 1: {cellWidth: 20}, 2: {cellWidth: 33}, 3: {cellWidth: 33, fontStyle: 'bold'}},
    });
    return doc.lastAutoTable.finalY + 8;
  }

  function resumo(doc, y, linhas, rotTotal, total) {
    y = secao(doc, y, 'Resumo financeiro');
    doc.autoTable({
      startY: y + 1, margin: {left: M, right: M},
      body: [...linhas.map(([a, b]) => [a, brl(b)]), [rotTotal, brl(total)]],
      theme: 'plain',
      styles: {font: 'helvetica', fontSize: 9.5, textColor: TEXTO, fontStyle: 'bold', cellPadding: {top: 3.6, bottom: 3.6, left: 4, right: 4}, fillColor: AZUL_CLARO, lineColor: [255, 255, 255], lineWidth: {bottom: 0.8}},
      columnStyles: {0: {cellWidth: 'auto'}, 1: {cellWidth: 60, halign: 'right'}},
      didParseCell: d => { if (d.row.index === linhas.length) { d.cell.styles.fillColor = VERDE_CLARO; if (d.column.index === 1) { d.cell.styles.fontSize = 15; d.cell.styles.textColor = VERDE; } else d.cell.styles.fontSize = 10; } },
    });
    return doc.lastAutoTable.finalY + 7;
  }

  function caixa(doc, y, rot, texto) {
    doc.setFontSize(8.8); const t = doc.splitTextToSize(limpo(texto), W - 2 * M - 8); const h = 9 + t.length * 4.2;
    if (y + h > H - 20) { doc.addPage(); y = 20; }
    doc.setFillColor(...CINZA_CLARO); doc.setDrawColor(...LINHA); doc.setLineWidth(0.2); doc.rect(M, y, W - 2 * M, h, 'FD');
    doc.setTextColor(...CINZA); doc.setFont('helvetica', 'bold'); doc.text(rot, M + 4, y + 5.5);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...TEXTO); doc.text(t, M + 4, y + 10.5);
    return y + h + 5;
  }

  function linhaInfo(doc, y, pares) {
    doc.setFontSize(9);
    for (const [r, v] of pares) {
      if (!v) continue;
      if (y > H - 22) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...TEXTO); doc.text(r, M, y);
      const wr = doc.getTextWidth(r) + 2.5;
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...CINZA);
      const t = doc.splitTextToSize(limpo(v), W - 2 * M - wr); doc.text(t, M + wr, y);
      y += t.length * 4.4 + 1.8;
    }
    return y + 2;
  }

  function rodape(doc, txt, extra) {
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i); doc.setDrawColor(...LINHA); doc.setLineWidth(0.2); doc.line(M, H - 15, W - M, H - 15);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.6); doc.setTextColor(...CINZA);
      doc.text(limpo(txt), M, H - 10.5, {maxWidth: 150});
      if (extra) doc.text(limpo(extra), M, H - 7);
      doc.text(`Página ${i}${n > 1 ? ' de ' + n : ''}`, W - M, H - 10.5, {align: 'right'});
    }
  }

  async function entregar(doc, nome, titulo) {
    const blob = doc.output('blob');
    const arq = new File([blob], nome, {type: 'application/pdf'});
    if (navigator.canShare && navigator.canShare({files: [arq]})) {
      try { await navigator.share({files: [arq], title: titulo}); return 'compartilhado'; }
      catch (e) { if (e && e.name === 'AbortError') return 'cancelado'; }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return 'baixado';
  }
  const nomeArq = (pref, num, cli) => `${pref}_${String(num || '').replace(/[^\w-]/g, '')}_${String(cli || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').slice(0, 30)}.pdf`.replace(/_+/g, '_');

  function orcamento(o, e) {
    pronto();
    const doc = new window.jspdf.jsPDF({unit: 'mm', format: 'a4'});
    doc.setProperties({title: 'Orçamento ' + (o.numero || ''), author: limpo(e.razao || '')});
    cabecalho(doc, e);
    let y = titulo(doc, 'ORÇAMENTO COMERCIAL', o.numero, hoje(o.salvo_em), o.titulo);
    y = cliente(doc, y, o);
    const m = o.itens.reduce((s, i) => s + i.qtd * i.valor, 0), mo = o.mo.reduce((s, i) => s + i.qtd * i.valor, 0);
    let n = 1;
    if (o.itens.length) { y = secao(doc, y, `${n++}. Materiais`); y = tabela(doc, y, o.itens); }
    if (o.mo.length) { y = secao(doc, y, `${n++}. Mão de obra / instalação`); y = tabela(doc, y, o.mo); }
    const lin = []; if (o.itens.length) lin.push(['Materiais', m]); if (o.mo.length) lin.push(['Mão de obra / instalação', mo]);
    y = resumo(doc, y, lin, 'VALOR TOTAL DO ORÇAMENTO', m + mo);
    if (o.obs) y = caixa(doc, y, 'Escopo considerado / observações', o.obs);
    const val = +o.validade || 0, ate = val ? new Date(new Date(o.salvo_em || Date.now()).getTime() + val * 864e5).toLocaleDateString('pt-BR') : '';
    y = linhaInfo(doc, y + 1, [['Condições de pagamento:', o.condicoes], ['Validade da proposta:', val ? `${val} dias (até ${ate})` : '']]);
    rodape(doc, `Orçamento elaborado por ${e.razao || e.apelido}${e.cnpj ? ' - CNPJ ' + e.cnpj : ''}`, e.rodape);
    return entregar(doc, nomeArq('Orcamento', o.numero, o.cliente), 'Orçamento ' + (o.numero || ''));
  }

  function venda(v, e) {
    pronto();
    const doc = new window.jspdf.jsPDF({unit: 'mm', format: 'a4'});
    const numero = (v.extra && v.extra.numero) || '';
    doc.setProperties({title: 'Comprovante de venda ' + numero, author: limpo(e.razao || '')});
    cabecalho(doc, e);
    let y = titulo(doc, 'COMPROVANTE DE VENDA', numero, hoje(v.criado), v.extra && v.extra.orcamento ? 'Referente ao orçamento ' + v.extra.orcamento : '');
    y = cliente(doc, y, v);
    const itens = v.itens || [], m = itens.reduce((s, i) => s + i.qtd * i.valor, 0), mo = +v.mao_obra || 0;
    let n = 1;
    if (itens.length) { y = secao(doc, y, `${n++}. Produtos`); y = tabela(doc, y, itens); }
    const moL = v.extra && Array.isArray(v.extra.mao_obra) && Math.abs(v.extra.mao_obra.reduce((s, i) => s + (i.qtd || 1) * (i.valor || 0), 0) - mo) < 0.01 ? v.extra.mao_obra : [{desc: v.mao_obra_desc || 'Mão de obra', qtd: 1, valor: mo}];
    if (mo) { y = secao(doc, y, `${n++}. Mão de obra / serviço`); y = tabela(doc, y, moL); }
    const lin = []; if (itens.length) lin.push(['Produtos', m]); if (mo) lin.push(['Mão de obra / serviço', mo]);
    y = resumo(doc, y, lin, 'TOTAL DA VENDA', m + mo);
    y = linhaInfo(doc, y, [['Forma de pagamento:', v.pagamento || 'não informada'], ['Situação:', v.pago ? 'PAGO - recebido em ' + hoje(v.criado) : 'A RECEBER'], ['Observação:', v.obs]]);
    y = caixa(doc, y + 1, 'Importante', 'Este comprovante registra a venda e não substitui a nota fiscal. Obrigado pela preferência!');
    rodape(doc, `Comprovante emitido por ${e.razao || e.apelido}${e.cnpj ? ' - CNPJ ' + e.cnpj : ''}`, e.rodape);
    return entregar(doc, nomeArq('Comprovante', numero, v.cliente), 'Comprovante de venda ' + numero);
  }

  return {preparar, orcamento, venda};
})();
