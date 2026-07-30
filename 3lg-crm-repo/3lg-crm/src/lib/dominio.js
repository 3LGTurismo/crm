/* ============================================================
   Domínio do CRM 3LG — o conhecimento de vendas mora aqui.
   Mudou o jeito de vender? Muda este arquivo, e só ele.
   ============================================================ */

export const ETAPAS = [
  "Novo Lead",
  "Qualificação",
  "Montando Proposta",
  "Proposta Enviada",
  "Negociação",
  "Fechado",
  "Perdido",
];

export const ETAPAS_ABERTAS = ETAPAS.filter((e) => !["Fechado", "Perdido"].includes(e));

export const PONTO_ETAPA = {
  "Novo Lead": "bg-slate-400",
  Qualificação: "bg-sky-500",
  "Montando Proposta": "bg-blue-600",
  "Proposta Enviada": "bg-indigo-500",
  Negociação: "bg-amber-500",
  Fechado: "bg-emerald-500",
  Perdido: "bg-rose-400",
};

export const BORDA_ETAPA = {
  "Novo Lead": "border-slate-300",
  Qualificação: "border-sky-400",
  "Montando Proposta": "border-blue-600",
  "Proposta Enviada": "border-indigo-400",
  Negociação: "border-amber-400",
  Fechado: "border-emerald-400",
  Perdido: "border-rose-300",
};

export const TIPOS_VIAGEM = [
  "Cruzeiro",
  "Rodoviário",
  "Aéreo",
  "Pacote nacional",
  "Pacote internacional",
  "Hospedagem",
  "Outro",
];

export const ORIGENS = ["WhatsApp", "Instagram", "Google Ads", "Site 3lg.com.br", "Indicação", "Outro"];

export const MOTIVOS_PERDA = [
  "Preço acima do orçamento",
  "Demorei para responder",
  "Comprou com concorrente",
  "Desistiu da viagem",
  "Parou de responder",
  "Data indisponível",
  "Outro",
];

/* ---------------- utilitários ---------------- */

export const agora = () => new Date().toISOString();
export const uid = () => Math.random().toString(36).slice(2, 10);
export const hojeISO = () => new Date().toISOString().slice(0, 10);

export const horasDesde = (iso) => (iso ? (Date.now() - new Date(iso).getTime()) / 36e5 : 0);
export const horasAtras = (h) => new Date(Date.now() - h * 36e5).toISOString();

export const diasAte = (data) => {
  if (!data) return null;
  return Math.round((new Date(data + "T12:00:00").getTime() - Date.now()) / 864e5);
};

export const fmtMoeda = (v) =>
  typeof v === "number" && v > 0
    ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
    : "—";

export const fmtData = (d) => {
  if (!d) return "—";
  const [a, m, dia] = d.split("-");
  return `${dia}/${m}/${a}`;
};

export const fmtHora = (iso) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export const rotuloTempo = (iso) => {
  const h = horasDesde(iso);
  if (h < 1) return "agora há pouco";
  if (h < 24) return `há ${Math.floor(h)}h`;
  return `há ${Math.floor(h / 24)}d`;
};

export const primeiroNome = (nome = "") => nome.split(" ")[0];

/* ---------------- regra crítica ---------------- */

export const qualificacaoCompleta = (n) =>
  Boolean(n.destino && String(n.destino).trim()) && Boolean(n.data_ida) && Number(n.orcamento) > 0;

export const camposFaltando = (n) => {
  const f = [];
  if (!n.destino || !String(n.destino).trim()) f.push("Destino");
  if (!n.data_ida) f.push("Data de ida");
  if (!Number(n.orcamento)) f.push("Orçamento");
  return f;
};

/* ============================================================
   ROTEIRO GUIADO — o "me pega na mão".
   Cada etapa tem objetivo, prazo e passos.
   Passo com `campo` marca sozinho quando o dado existe.
   ============================================================ */

export const ROTEIRO = {
  "Novo Lead": {
    objetivo: "Responder rápido e abrir a conversa.",
    porque: "Responder nos primeiros minutos é o que mais muda o resultado. Depois de uma hora, o cliente já falou com outra agência.",
    proxima: "Qualificação",
    passos: [
      { id: "contato", texto: "Responder o cliente e se apresentar" },
      { id: "motivo", texto: "Perguntar o motivo da viagem", campo: "motivo_viagem" },
    ],
    script: (n) =>
      `Olá ${primeiroNome(n.nome)}! Aqui é o Leonardo, da 3LG Turismo. Vi que você tem interesse em viajar. Para eu te ajudar direito, me conta: qual o motivo da viagem e para quando você está pensando?`,
  },

  Qualificação: {
    objetivo: "Entender a viagem antes de cotar qualquer coisa.",
    porque: "Proposta enviada sem os quatro dados básicos vira retrabalho e passa a impressão de que você não escutou o cliente.",
    proxima: "Montando Proposta",
    passos: [
      { id: "destino", texto: "Confirmar o destino", campo: "destino" },
      { id: "datas", texto: "Confirmar a data de ida", campo: "data_ida" },
      { id: "pessoas", texto: "Confirmar quantas pessoas viajam", campo: "num_pessoas" },
      { id: "orcamento", texto: "Descobrir o orçamento que ele tem em mente", campo: "orcamento" },
      { id: "decisor", texto: "Confirmar se alguém decide junto" },
      { id: "flex", texto: "Perguntar se as datas têm alguma flexibilidade" },
    ],
    script: (n) =>
      `${primeiroNome(n.nome)}, para eu montar algo que faça sentido de verdade, me ajuda com três pontos: as datas já estão fechadas ou têm alguma flexibilidade? Quantas pessoas viajam? E qual valor você tinha em mente para essa viagem? Assim eu pesquiso dentro do que cabe no seu planejamento, sem te fazer perder tempo.`,
    dica: "A pergunta do orçamento assusta menos quando vem depois das outras duas e com a justificativa de não fazer o cliente perder tempo.",
  },

  "Montando Proposta": {
    objetivo: "Montar três opções e enviar em até 24 horas.",
    porque: "Uma opção única vira comparação de preço com o concorrente. Três opções fazem o cliente comparar entre elas.",
    proxima: "Proposta Enviada",
    passos: [
      { id: "cotar", texto: "Cotar 3 opções: uma abaixo, uma no orçamento e uma acima" },
      { id: "politica", texto: "Conferir política de cancelamento e regras de bagagem" },
      { id: "pagamento", texto: "Definir formas de pagamento e parcelamento" },
      { id: "revisar", texto: "Revisar valores e datas antes de enviar" },
    ],
    script: (n) =>
      `${primeiroNome(n.nome)}, já estou montando as opções de ${n.destino || "sua viagem"}. Te envio até amanhã com três alternativas para você comparar com calma.`,
    dica: "A opção acima do orçamento não é para vender: ela faz a opção do meio parecer equilibrada.",
  },

  "Proposta Enviada": {
    objetivo: "Garantir que ele recebeu, entendeu e tem hora para conversar.",
    porque: "A maior parte das propostas não é recusada, é esquecida. Combinar hora para conversar evita o silêncio.",
    proxima: "Negociação",
    passos: [
      { id: "enviado", texto: "Enviar a proposta e avisar por WhatsApp" },
      { id: "leitura", texto: "Confirmar que ele recebeu e entendeu as opções" },
      { id: "hora", texto: "Combinar dia e hora para conversar sobre as opções" },
    ],
    script: (n) =>
      `${primeiroNome(n.nome)}, te enviei as opções de ${n.destino || "viagem"}. Consegue dar uma olhada hoje? Se preferir, te ligo amanhã para explicar as diferenças entre elas — costuma ser mais rápido que ler tudo.`,
  },

  Negociação: {
    objetivo: "Descobrir a objeção real e fazer a pergunta de fechamento.",
    porque: "Desconto dado antes de entender a objeção é dinheiro jogado fora: muitas vezes o problema não era o preço.",
    proxima: "Fechado",
    passos: [
      { id: "objecao", texto: "Identificar a objeção real (não a primeira que ele diz)" },
      { id: "resposta", texto: "Responder a objeção com fato, não com desconto" },
      { id: "fechamento", texto: "Fazer a pergunta de fechamento" },
    ],
    script: (n) => scriptFechamento(n.nome, Number(n.orcamento), n.destino),
    dica: '"Está caro" quase nunca é sobre o valor. É sobre não estar claro o que está incluído.',
  },

  Fechado: {
    objetivo: "Confirmar a venda e transformar o cliente em reputação.",
    porque: "Sua ficha no Google não tem avaliação nenhuma. Cliente satisfeito no dia do fechamento é a melhor hora de pedir.",
    proxima: null,
    passos: [
      { id: "pagamento", texto: "Confirmar pagamento e enviar voucher" },
      { id: "avaliacao", texto: "Pedir avaliação no Google" },
      { id: "indicacao", texto: "Pedir indicação de alguém que também queira viajar" },
    ],
    script: (n) =>
      `${primeiroNome(n.nome)}, reserva confirmada! Foi um prazer organizar essa viagem com você. Se puder deixar uma avaliação da 3LG no Google, me ajuda demais — leva menos de um minuto e faz muita diferença para uma agência pequena.`,
  },

  Perdido: {
    objetivo: "Registrar o motivo real da perda.",
    porque: "Motivo de perda é o dado que mostra se você perde por preço, por demora ou por destino errado. Sem ele, você corrige no escuro.",
    proxima: null,
    passos: [{ id: "motivo_perda", texto: "Registrar o motivo da perda", campo: "motivo_perda" }],
    script: (n) =>
      `${primeiroNome(n.nome)}, tudo certo. Fico à disposição para uma próxima viagem. Se puder me contar rapidinho o que pesou na decisão, me ajuda a melhorar o atendimento.`,
  },
};

/* ---------------- scripts de fechamento por faixa ---------------- */

export function scriptFechamento(nome, orcamento, destino) {
  const n = primeiroNome(nome);
  const d = destino || "a viagem";
  if (orcamento > 0 && orcamento < 5000) {
    return `${n}, consegui organizar o parcelamento de ${d} para caber no seu planejamento mensal. Posso reservar e te enviar a confirmação hoje?`;
  }
  if (orcamento >= 5000 && orcamento <= 15000) {
    return `${n}, a disponibilidade de ${d} nessas datas está confirmada. Quer que eu faça a reserva agora enquanto você organiza o pagamento?`;
  }
  if (orcamento > 15000) {
    return `${n}, separei as condições de ${d} com acompanhamento do início ao fim da viagem. Podemos revisar os detalhes por telefone hoje ou amanhã e já deixar reservado?`;
  }
  return `${n}, podemos revisar juntos os valores de ${d} e definir o próximo passo?`;
}

/* ---------------- biblioteca de objeções ---------------- */

export const OBJECOES = [
  {
    id: "preco",
    titulo: "Está caro",
    leitura: "Quase sempre significa: não ficou claro o que está incluído.",
    resposta: (n) =>
      `${primeiroNome(n.nome)}, entendo. Deixa eu abrir o que está dentro desse valor: passagem, hospedagem, traslados e o suporte durante toda a viagem. Se algum item não fizer sentido para você, eu tiro e refaço o cálculo. Prefere que eu ajuste o que está incluído ou que eu procure uma data mais barata?`,
  },
  {
    id: "pensar",
    titulo: "Vou pensar",
    leitura: "Existe uma dúvida específica que ele não falou. Descubra qual.",
    resposta: (n) =>
      `Claro, ${primeiroNome(n.nome)}, viagem se decide com calma. Só para eu te ajudar melhor: o que ainda está te deixando em dúvida — o valor, as datas ou o destino em si?`,
  },
  {
    id: "conjuge",
    titulo: "Preciso falar com meu marido / minha esposa",
    leitura: "Você qualificou sem o decisor. Traga a outra pessoa para a conversa.",
    resposta: (n) =>
      `Perfeito, ${primeiroNome(n.nome)}. Quer que eu te mande um resumo curto para vocês verem juntos? Se preferir, posso participar da conversa e responder as dúvidas dos dois de uma vez.`,
  },
  {
    id: "concorrente",
    titulo: "Achei mais barato em outro lugar",
    leitura: "Compare o que está incluído, não o número final.",
    resposta: (n) =>
      `${primeiroNome(n.nome)}, me manda o que você recebeu que eu comparo item por item com você. Às vezes a diferença está na bagagem, no traslado ou na política de cancelamento — e isso muda o valor real da viagem.`,
  },
  {
    id: "depois",
    titulo: "Deixa para o ano que vem",
    leitura: "Não force. Registre e mantenha aquecido pelo Agente de Marketing.",
    resposta: (n) =>
      `Sem problema, ${primeiroNome(n.nome)}. Vou guardar suas preferências e, quando abrir uma boa condição para ${n.destino || "esse destino"}, te aviso sem compromisso. Combinado?`,
  },
];

/* ---------------- passos: leitura de conclusão ---------------- */

export function passoConcluido(negocio, passo) {
  if (passo.campo) {
    const v = negocio[passo.campo];
    if (passo.campo === "orcamento" || passo.campo === "num_pessoas") return Number(v) > 0;
    return Boolean(v && String(v).trim());
  }
  return Boolean(negocio.checklist?.[passo.id]);
}

export function progressoEtapa(negocio) {
  const r = ROTEIRO[negocio.etapa_funil];
  if (!r) return { feitos: 0, total: 0, pct: 0, pendentes: [] };
  const pendentes = r.passos.filter((p) => !passoConcluido(negocio, p));
  const feitos = r.passos.length - pendentes.length;
  return { feitos, total: r.passos.length, pct: Math.round((feitos / r.passos.length) * 100), pendentes };
}

export function proximoPasso(negocio) {
  const { pendentes } = progressoEtapa(negocio);
  return pendentes[0] || null;
}
