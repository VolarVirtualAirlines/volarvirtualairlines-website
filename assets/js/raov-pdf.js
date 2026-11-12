/*
 * VOLAR RAOV — gerador dinâmico de PDF institucional — v1.0
 * Instalar no GitHub: assets/js/raov-pdf.js
 * Dependências: imagens em assets/raov/{raov,volar,vax}.png.
 * jsPDF carregado sob demanda via CDN fixado em 2.5.1; nenhuma credencial no navegador.
 * Não chama NewSky ou OpenAI, não altera o botão e não substitui a Cloudflare Function.
 *
 * Uso após carregar este módulo:
 *   await window.VolarRAOVPDF.gerar(jsonOtimizadoV2, respostaAnaliseAPI);
 * A resposta da API deve incluir {status:'analise_concluida', analise:{...}}.
 */
(function (raiz) {
  'use strict';

  const CONFIG = Object.freeze({
    versao: '1.0',
    cdn: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    logos: Object.freeze({
      raov: 'assets/raov/raov.png',
      volar: 'assets/raov/volar.png',
      vax: 'assets/raov/vax.png'
    })
  });

  let carregandoJS = null;

  function exigir(ok, mensagem) {
    if (!ok) throw new Error('VOLAR RAOV PDF — ' + mensagem);
  }

  async function carregarJsPDF() {
    if (raiz.jspdf && raiz.jspdf.jsPDF) return raiz.jspdf.jsPDF;
    if (!carregandoJS) {
      carregandoJS = new Promise((resolve, reject) => {
        const tag = document.createElement('script');
        tag.src = CONFIG.cdn;
        tag.async = true;
        tag.onload = () => {
          if (raiz.jspdf && raiz.jspdf.jsPDF) resolve(raiz.jspdf.jsPDF);
          else reject(new Error('A biblioteca jsPDF não foi inicializada.'));
        };
        tag.onerror = () => reject(new Error('Não foi possível carregar a biblioteca jsPDF.'));
        document.head.appendChild(tag);
      }).catch(erro => { carregandoJS = null; throw erro; });
    }
    return carregandoJS;
  }

  function carregarImagem(caminho) {
    return fetch(caminho, { cache: 'force-cache' }).then(resposta => {
      if (!resposta.ok) throw new Error('Não foi possível obter o logo: ' + caminho);
      return resposta.blob();
    }).then(blob => new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(leitor.result);
      leitor.onerror = () => reject(new Error('Não foi possível ler o logo: ' + caminho));
      leitor.readAsDataURL(blob);
    }));
  }

  function texto(valor, padrao = 'Não informado') {
    if (valor === null || valor === undefined || valor === '') return padrao;
    return String(valor).replace(/\r\n?/g, '\n').trim() || padrao;
  }

  function seguroPDF(valor) {
    // As fontes internas do PDF usam WinAnsi; evita caracteres fora do conjunto.
    return texto(valor, '').replace(/[\u2022\u00b7]/g, ' / ')
      .replace(/[\u2010-\u2015\u2212]/g, '-')
      .replace(/[\u2190-\u21ff]/g, ' > ')
      .replace(/[\u2026]/g, '...')
      .replace(/[\u2264]/g, '<=')
      .replace(/[\u2265]/g, '>=')
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2018\u2019]/g, "'");
  }

  function numero(v, casas = 2) {
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString('pt-BR', {
      minimumFractionDigits: casas, maximumFractionDigits: casas
    }) : '—';
  }

  function numeroInt(v) {
    return Number.isFinite(Number(v)) && v !== null && v !== undefined
      ? Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '—';
  }

  function dataHoraUTC(v, hora = false) {
    if (!v) return '—';
    const d = new Date(v);
    if (!Number.isFinite(d.getTime())) return '—';
    const data = d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    if (!hora) return data;
    const hm = d.toLocaleTimeString('pt-BR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });
    return hm + ' UTC';
  }

  function horaUTC(v) {
    if (!v) return '—';
    const d = new Date(v);
    if (!Number.isFinite(d.getTime())) return '—';
    return d.toLocaleTimeString('pt-BR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' }) + 'Z';
  }

  function gerarTimestamp() {
    return new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  function validar(voo, retorno) {
    exigir(voo && voo.versaoEstrutura === 2, 'Informe o JSON NewSky otimizado v2.');
    exigir(voo.identificacao && voo.avaliacao && Array.isArray(voo.ocorrencias), 'JSON do voo incompleto.');
    const r = voo.avaliacao.rating;
    exigir(typeof r === 'number' && Number.isFinite(r) && r >= 0 && r < 8,
      'O relatório está disponível somente para rating de 0 até 7,99.');
    exigir(retorno && (!retorno.status || retorno.status === 'analise_concluida'),
      'A análise da IA não está concluída.');
    const analise = retorno.analise || retorno;
    exigir(analise && Array.isArray(analise.analiseOcorrencias) &&
      Array.isArray(analise.planoEvolucao) && Array.isArray(analise.observacoesSistema),
      'Resposta estruturada da IA inválida.');
    exigir(analise.analiseOcorrencias.length === voo.ocorrencias.length,
      'Quantidade de análises diferente da quantidade de ocorrências do NewSky.');
    for (let i = 0; i < voo.ocorrencias.length; i++) {
      exigir(analise.analiseOcorrencias[i].ordem === voo.ocorrencias[i].ordem,
        'Ordem das ocorrências diverge da resposta do NewSky.');
    }
    if (retorno.voo && retorno.voo.id && retorno.voo.id !== voo.identificacao.id)
      throw new Error('VOLAR RAOV PDF — A análise pertence a outro voo.');
    return analise;
  }

  function desenharDocumento(pdf, voo, analise, logos, dataGeracao, opcoes) {
    const P = pdf.internal.pageSize;
    const W = P.getWidth(), H = P.getHeight();
    const X = 43, R = W - 43, LARGURA = R - X;
    const MAX_Y = 789;
    const C = {
      navy: '#13294C', teal: '#039EA5', grey: '#607187', sky: '#6B8198',
      pale: '#E8F7F6', soft: '#EFF5F7', line: '#DFE9EF', white: '#FFFFFF',
      amber: '#D18B28', amberBg: '#FFF5E8', whiteish: '#F8FAFB', blue: '#193456'
    };

    let pagina = 1;
    const secoes = ['Visão geral'];
    const titulo = texto(voo.identificacao.callsign, 'Voo');
    const piloto = texto(voo.identificacao.piloto, 'Piloto');
    const ordemOcorrencias = analise.analiseOcorrencias;

    function cor(hex) { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); }
    function fill(hex) { pdf.setFillColor(...cor(hex)); }
    function stroke(hex) { pdf.setDrawColor(...cor(hex)); }
    function ink(hex) { pdf.setTextColor(...cor(hex)); }
    function rounded(x, y, w, h, bg = C.white, borda = null, raio = 10) {
      fill(bg); if (borda) stroke(borda);
      pdf.setLineWidth(0.8);
      pdf.roundedRect(x, y, w, h, raio, raio, borda ? 'FD' : 'F');
    }
    function linha(x1, y1, x2, y2, hex = C.line, peso = 0.8) {
      stroke(hex); pdf.setLineWidth(peso); pdf.line(x1, y1, x2, y2);
    }
    function fonte(size, bold = false, color = C.navy) {
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      pdf.setFontSize(size); ink(color);
    }
    function t(x, y, str, size = 9, color = C.navy, bold = false, alinhamento = 'left') {
      fonte(size, bold, color);
      pdf.text(seguroPDF(str), x, y, { align: alinhamento });
    }
    function quebrar(str, largura, size = 9, bold = false) {
      fonte(size, bold);
      return pdf.splitTextToSize(seguroPDF(str), largura).flatMap(s => String(s).split('\n'));
    }
    function escrito(x, y, str, largura, size = 8.8, entrelinha = 12.2, color = C.navy, bold = false) {
      const linhas = quebrar(str, largura, size, bold);
      fonte(size, bold, color);
      linhas.forEach((s, i) => pdf.text(s || ' ', x, y + i * entrelinha));
      return linhas.length * entrelinha;
    }
    function novaPagina(secao) {
      pdf.addPage(); pagina++;
      secoes.push(secao);
      return 128;
    }
    function garantir(y, altura, secao) {
      return (y + altura > MAX_Y) ? novaPagina(secao) : y;
    }
    function secao(n, rotulo, subtitulo, y) {
      y = garantir(y, 60, rotulo);
      t(X, y + 2, n + ' /', 9, C.teal, true);
      t(X, y + 29, rotulo, 17.2, C.navy, true);
      if (subtitulo) escrito(X, y + 46, subtitulo, LARGURA, 8.15, 11.2, C.grey);
      return y + 66;
    }
    function celula(x, y, label, valor, width = 218) {
      t(x, y, label, 7.4, C.grey, true);
      escrito(x, y + 20, valor, width, 9.9, 11.5, C.navy, true);
    }
    function paragrafoEmFluxo(y, rotulo, str, fundo = C.soft, size = 8.5, margin = 12) {
      const linhas = quebrar(str, LARGURA - 2 * margin, size, false);
      const maxLinhas = Math.floor((MAX_Y - 150 - 37) / 12.2);
      let pos = 0;
      do {
        let livres = Math.floor((MAX_Y - y - 33) / 12.2);
        if (livres < 2) { y = novaPagina(rotulo); livres = Math.floor((MAX_Y - y - 33) / 12.2); }
        const fatia = linhas.slice(pos, pos + Math.min(livres, maxLinhas));
        const h = 32 + fatia.length * 12.2;
        rounded(X, y, LARGURA, h, fundo, null, 11);
        t(X + margin, y + 17, pos ? rotulo + ' (continuação)' : rotulo, 9.2, C.teal, true);
        fonte(size, false, C.navy);
        fatia.forEach((lin, i) => pdf.text(lin, X + margin, y + 33 + i * 12.2));
        y += h + 13;
        pos += fatia.length;
      } while (pos < linhas.length);
      return y;
    }
    function cardEvento(y, item, newsky) {
      const pPos = texto(item.pontosPositivos);
      const pAten = texto(item.pontosAtencao);
      const pRec = texto(item.recomendacao);
      const blocos = [
        { n: 'POSITIVO', txt: pPos, col: C.teal },
        { n: 'ATENÇÃO', txt: pAten, col: C.amber },
        { n: 'MELHORIA', txt: pRec, col: C.teal }
      ];
      const ancho = LARGURA - 113;
      const tamanhos = blocos.map(b => quebrar(b.txt, ancho, 8.0));
      const altura = 59 + tamanhos.reduce((acc, arr) => acc + Math.max(22, arr.length * 10.4 + 6), 0) + 7;
      const textoTitulo = texto(item.titulo, `Ocorrência ${item.ordem}`);
      const meta = `${dataHoraUTC(newsky.momentoUTC, true)}  /  Desconto: ${numero(newsky.descontoRating)} ponto(s)  /  Multa: ${numeroInt(newsky.penalidadeFinanceira)}`;

      // Se a ficha couber em uma página, preserva o cartão único do modelo institucional.
      if (altura <= MAX_Y - 155) {
        y = garantir(y, altura + 10, 'Análise técnica');
        rounded(X, y, LARGURA, altura, C.white, C.line, 12);
        rounded(X, y, 4, altura, C.teal, null, 1.5);
        t(X + 14, y + 24, `${numeroInt(item.ordem).padStart(2, '0')}  ${textoTitulo}`, 11.2, C.navy, true);
        t(X + 14, y + 44, meta, 7.5, C.grey);
        linha(X + 14, y + 54, R - 14, y + 54);
        let z = y + 67;
        blocos.forEach((b, i) => {
          t(X + 15, z, b.n, 7.4, b.col, true);
          fonte(8.0, false, C.navy);
          tamanhos[i].forEach((li, k) => pdf.text(li || ' ', X + 110, z + k * 10.4));
          z += Math.max(22, tamanhos[i].length * 10.4 + 6);
        });
        return y + altura + 13;
      }
      // Textos excepcionalmente longos: cada campo em bloco paginável, sem perder conteúdo.
      y = garantir(y, 61, 'Análise técnica');
      rounded(X, y, LARGURA, 56, C.white, C.line, 9);
      t(X + 12, y + 23, `${numeroInt(item.ordem).padStart(2, '0')}  ${textoTitulo}`, 11.2, C.navy, true);
      t(X + 12, y + 42, meta, 7.5, C.grey);
      y += 69;
      for (const b of blocos) y = paragrafoEmFluxo(y, b.n + ' - ' + textoTitulo, b.txt, C.soft, 8.35);
      return y + 6;
    }

    // PÁGINA 1 — VISÃO GERAL
    t(X, 139, 'RELATÓRIO DE ANÁLISE OPERACIONAL DE VOO', 8.5, C.teal, true);
    t(X, 177, titulo, 28, C.navy, true);
    const linhaAviao = [voo.identificacao.modelo, voo.identificacao.aeronave, voo.identificacao.rede]
      .filter(Boolean).join(' / ');
    escrito(X, 196, linhaAviao, 375, 8.4, 11.2, C.grey);
    rounded(444, 123, 108, 78, C.pale, null, 15);
    t(498, 159, numero(voo.avaliacao.rating), 25, C.teal, true, 'center');
    t(498, 179, 'RATING / 10,00', 7.1, C.grey, true, 'center');

    let y = 217;
    const sumario = texto(analise.sumarioExecutivo);
    y = paragrafoEmFluxo(y, 'LEITURA RÁPIDA PARA O PILOTO', sumario, C.pale, 8.8);

    y = garantir(y + 2, 80, 'Visão geral');
    const passageiros = `${numeroInt(voo.resumoOperacional?.passageiros)} / ${numeroInt(voo.resumoOperacional?.capacidadePassageiros)}`;
    const tempo = Number(voo.resumoOperacional?.duracaoMin);
    const minutos = Number.isFinite(tempo) ? `${Math.floor(tempo / 60).toString().padStart(2,'0')}h${String(tempo % 60).padStart(2,'0')}` : '—';
    const metricas = [
      { valor: (() => {
        const g = voo.ocorrencias.find(o => o.toque)?.toque?.impactoG;
        return typeof g === 'number' && Number.isFinite(g) ? numero(g, 2) + ' G' : '—';
      })(), rotulo: 'TOUCHDOWN' },
      { valor: `${numeroInt(voo.resumoOperacional?.distanciaNM)} NM`, rotulo: 'DISTÂNCIA' },
      { valor: passageiros, rotulo: 'PASSAGEIROS' },
      { valor: minutos, rotulo: 'TEMPO DE VOO' }
    ];
    const mw = 119, mg = (LARGURA - mw * 4) / 3;
    metricas.forEach((m, i) => {
      const px = X + (mw + mg) * i;
      rounded(px, y, mw, 74, C.white, C.line, 10);
      linha(px + 11, y + 11, px + 37, y + 11, i === 0 ? C.amber : C.teal, 2);
      t(px + 12, y + 39, m.valor, 15.2, C.navy, true);
      t(px + 12, y + 61, m.rotulo, 7.1, C.grey, true);
    });
    y += 94;
    y = secao('01', 'Dados do voo', '', y);
    y = garantir(y, 156, 'Visão geral');
    rounded(X, y, LARGURA, 152, C.soft, null, 12);
    const locs = [X + 16, X + 252];
    celula(locs[0], y + 25, 'ORIGEM / DESTINO', `${texto(voo.identificacao.origem)}  >  ${texto(voo.identificacao.destino)}`);
    celula(locs[1], y + 25, 'SAÍDA PREVISTA / REAL', `${horaUTC(voo.horariosUTC?.saidaPrevista)}  /  ${horaUTC(voo.horariosUTC?.saidaReal)}`);
    celula(locs[0], y + 76, 'COMBUSTÍVEL UTILIZADO', `${numeroInt(voo.resumoOperacional?.combustivelKG)} kg`);
    celula(locs[1], y + 76, 'CHEGADA PREVISTA / REAL', `${horaUTC(voo.horariosUTC?.chegadaPrevista)}  /  ${horaUTC(voo.horariosUTC?.chegadaReal)}`);
    celula(locs[0], y + 123, 'CARGA / BAGAGENS', `${numeroInt(voo.resumoOperacional?.pesoCargaKG)} kg / ${numeroInt(voo.resumoOperacional?.bagagensKG)} kg`);
    celula(locs[1], y + 123, 'DURAÇÃO / PERCURSO', `${numeroInt(voo.resumoOperacional?.duracaoMin)} min / ${numeroInt(voo.resumoOperacional?.distanciaNM)} NM`);
    y += 161;
    y = garantir(y, 38, 'Visão geral');
    t(X, y + 11, '02 / PRIORIDADES DO DEBRIEFING', 9.7, C.teal, true);
    y += 25;
    const priors = [...ordemOcorrencias]
      .map(item => ({ ...item, penal: Math.abs(Number(voo.ocorrencias.find(n => n.ordem === item.ordem)?.descontoRating || 0)) }))
      .sort((a, b) => b.penal - a.penal).slice(0, 3);
    for (const [i, p] of priors.entries()) {
      const linhas = quebrar(p.titulo, LARGURA - 73, 8.9, true);
      const h = Math.max(26, linhas.length * 10.2 + 9);
      y = garantir(y, h + 3, 'Visão geral');
      rounded(X, y, 27, 24, C.pale, null, 7);
      t(X + 13.5, y + 16, String(i + 1).padStart(2, '0'), 8.8, C.teal, true, 'center');
      escrito(X + 36, y + 16, p.titulo, LARGURA - 45, 8.9, 10.2, C.navy, true);
      y += h + 3;
    }

    // PÁGINAS DE ANÁLISE — OCORRÊNCIAS DINÂMICAS
    y = novaPagina('Análise técnica');
    y = secao('03', 'Análise evento a evento', 'Análises individuais baseadas nas descrições e critérios NewSky', y);
    for (let i = 0; i < ordemOcorrencias.length; i++) {
      y = cardEvento(y + 4, ordemOcorrencias[i], voo.ocorrencias[i]);
    }

    // PÁGINA DE INDICADORES
    y = novaPagina('Indicadores');
    y = secao('04', 'Onde foram perdidos os pontos', 'Descontos reais de rating por ocorrência', y);
    const itens = ordemOcorrencias.map((o, i) => ({
      titulo: o.titulo,
      desconto: Math.abs(Number(voo.ocorrencias[i].descontoRating || 0))
    })).sort((a, b) => b.desconto - a.desconto);
    const total = itens.reduce((s, a) => s + a.desconto, 0);
    const maior = Math.max(...itens.map(i => i.desconto), 0.01);
    const barraInicio = X + 228, barraW = 172;
    for (const item of itens) {
      y = garantir(y, 49, 'Indicadores');
      escrito(X, y + 10, item.titulo, 215, 8.8, 11.1, C.navy);
      rounded(barraInicio, y + 1, barraW, 14, C.soft, null, 7);
      if (item.desconto > 0) rounded(barraInicio, y + 1, barraW * (item.desconto / maior), 14, C.teal, null, 7);
      t(R, y + 11, `-${numero(item.desconto)} pt`, 8.7, C.navy, true, 'right');
      y += 45;
    }
    y = garantir(y + 5, 60, 'Indicadores');
    rounded(X, y, LARGURA, 60, C.pale, null, 10);
    escrito(X + 13, y + 21,
      `Rating NewSky: ${numero(voo.avaliacao.rating)} / 10,00. Descontos somados: ${numero(total)} ponto(s). ` +
      `Penalidades financeiras: ${numeroInt(voo.financeiro?.penalidadesFinanceiras)}. ` +
      'Descontos de rating não são multas financeiras.', LARGURA - 26, 8.8, 12, C.navy);
    y += 80;
    y = secao('05', 'Indicadores e resultado do voo', '', y);
    const f = voo.financeiro || {}, s = voo.resumoOperacional || {};
    const ocupacao = s.capacidadePassageiros ? numero(100 * s.passageiros / s.capacidadePassageiros, 1) + '%' : '—';
    const dadosTabela = [
      ['Rating / ocorrências', `${numero(voo.avaliacao.rating)} / 10,00   /   ${numeroInt(voo.ocorrencias.length)} ocorrência(s)`],
      ['Passageiros / ocupação', `${numeroInt(s.passageiros)} de ${numeroInt(s.capacidadePassageiros)}   /   ${ocupacao}`],
      ['Carga / bagagens', `${numeroInt(s.pesoCargaKG)} kg / ${numeroInt(s.bagagensKG)} kg`],
      ['Tempo / distância', `${numeroInt(s.duracaoMin)} min / ${numeroInt(s.distanciaNM)} NM`],
      ['Combustível utilizado', `${numeroInt(s.combustivelKG)} kg`],
      ['Receita / despesas', `${numeroInt(f.receita)} / ${numeroInt(f.despesas)}`],
      ['Penalidades financeiras / saldo', `${numeroInt(f.penalidadesFinanceiras)} / ${numeroInt(f.saldo)}`]
    ];
    y = garantir(y, 34, 'Indicadores');
    rounded(X, y, LARGURA, 30, C.navy, null, 7);
    t(X + 12, y + 20, 'INDICADOR', 7.9, C.white, true);
    t(X + 266, y + 20, 'REGISTRO', 7.9, C.white, true);
    y += 30;
    dadosTabela.forEach(([k, v], i) => {
      const linhas = quebrar(v, LARGURA - 284, 8.4);
      const h = Math.max(28, linhas.length * 11.2 + 9);
      y = garantir(y, h, 'Indicadores');
      fill(i % 2 ? C.soft : C.white); pdf.rect(X, y, LARGURA, h, 'F');
      t(X + 12, y + 18, k, 8.3, C.navy);
      escrito(X + 266, y + 18, v, LARGURA - 278, 8.4, 11.2, i === dadosTabela.length - 1 ? C.teal : C.navy,
        i === dadosTabela.length - 1);
      y += h;
    });
    // Os indicadores operacionais e financeiros são apresentados nas seções 01 e 05.
    // As narrativas completas permanecem no JSON da análise para uso em futuras versões.

    // PLANO DE EVOLUÇÃO E OBSERVAÇÕES
    y = novaPagina('Plano de evolução');
    y = secao('06', 'Metas para os próximos voos', 'Orientações derivadas da análise das ocorrências', y);
    analise.planoEvolucao.forEach((p, i) => {
      const htxt = quebrar(p, LARGURA - 65, 8.9).length * 12.5;
      const h = Math.max(56, htxt + 24);
      y = garantir(y, h + 12, 'Plano de evolução');
      rounded(X, y, 32, 29, C.pale, null, 7);
      t(X + 16, y + 20, String(i + 1).padStart(2, '0'), 9.6, C.teal, true, 'center');
      rounded(X + 45, y, LARGURA - 45, h, C.white, C.line, 10);
      escrito(X + 56, y + 19, p, LARGURA - 70, 8.9, 12.5, C.navy);
      y += h + 13;
    });
    y += 5;
    y = secao('07', 'Observações do sistema', 'Limites da interpretação e rastreabilidade', y);
    analise.observacoesSistema.forEach(obs => {
      const linhas = quebrar(obs, LARGURA - 32, 8.1);
      const h = linhas.length * 11.6 + 17;
      y = garantir(y, h, 'Observações do sistema');
      rounded(X, y, LARGURA, h, C.soft, null, 8);
      fill(C.teal); pdf.circle(X + 13, y + 16, 2.0, 'F');
      escrito(X + 24, y + 19, obs, LARGURA - 37, 8.1, 11.6, C.navy);
      y += h + 7;
    });

    // CABEÇALHO E RODAPÉ INSTITUCIONAL EM TODAS AS PÁGINAS
    const paginas = pdf.getNumberOfPages();
    for (let i = 1; i <= paginas; i++) {
      pdf.setPage(i);
      fill(C.navy); pdf.rect(0, 0, W, 5, 'F');
      // Imagens originais nas proporções do modelo aprovado (não distorcer).
      pdf.addImage(logos.raov, 'PNG', 46, 18, 145, 29.5);
      pdf.addImage(logos.volar, 'PNG', 226, 16.5, 143, 34.5);
      pdf.addImage(logos.vax, 'PNG', 410, 14.5, 138, 39.2);
      t(W / 2, 65, 'RELATÓRIO DE ANÁLISE DE OPERAÇÃO DE VOO', 8.4, C.navy, true, 'center');
      t(W / 2, 79,
        'Documento exclusivo da Volar Virtual Airlines e da Volar Virtual Academy Excellence',
        7.1, C.grey, false, 'center');
      t(X, 96, 'PILOTO', 7, C.grey, true);
      t(X + 40, 96, piloto, 9.1, C.navy, true);
      t(R, 96, `${titulo}  /  ${dataHoraUTC(voo.identificacao.dataUTC)}`, 7.5, C.sky, false, 'right');
      linha(X, 107, R, 107);
      linha(X, 107, X + 77, 107, C.teal, 2.3);
      linha(X, 803, R, 803);
      t(X, 816, 'Documento exclusivo da Volar Virtual Airlines e da Volar Virtual Academy Excellence',
        7.0, C.navy, true);
      t(X, 831, `Gerado em ${dataGeracao} (horário de Brasília)  /  Análise IA v3.1`, 7.0, C.grey);
      t(R, 831, `${secoes[i - 1]}  |  ${String(i).padStart(2, '0')} / ${String(paginas).padStart(2, '0')}`,
        7.0, C.grey, false, 'right');
      fill(C.navy); pdf.rect(0, H - 5, W, 5, 'F');
    }
    return paginas;
  }

  async function gerar(voo, retorno, opcoes = {}) {
    const analise = validar(voo, retorno); // Nunca gera PDF parcial/inconsistente.
    const classe = await carregarJsPDF();
    const caminhos = { ...CONFIG.logos, ...(opcoes.logos || {}) };
    const [raov, volar, vax] = await Promise.all([
      carregarImagem(caminhos.raov), carregarImagem(caminhos.volar), carregarImagem(caminhos.vax)
    ]);
    const pdf = new classe({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
    pdf.setProperties({
      title: `VOLAR RAOV | ${voo.identificacao.callsign} | ${texto(voo.identificacao.piloto)}`,
      subject: 'Relatório institucional de análise de operação de voo',
      author: 'Volar Virtual Airlines / Volar Virtual Academy Excellence',
      creator: 'VOLAR RAOV PDF Dinâmico v1.0'
    });
    const paginas = desenharDocumento(pdf, voo, analise, { raov, volar, vax }, gerarTimestamp(), opcoes);
    const nome = `VOLAR_RAOV_${texto(voo.identificacao.callsign, 'VOO')}_${texto(voo.identificacao.piloto, 'PILOTO')}`
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9_ -]/g, '')
      .trim().replace(/ +/g, '_').toUpperCase() + '.pdf';
    const blob = pdf.output('blob');
    if (opcoes.salvar !== false) pdf.save(nome);
    return { nomeArquivo: nome, paginas, tamanhoBytes: blob.size, blob };
  }

  raiz.VolarRAOVPDF = Object.freeze({ versao: CONFIG.versao, gerar });
})(window);
