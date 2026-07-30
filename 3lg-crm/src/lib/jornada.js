/* ============================================================
   JORNADA — o que acontece depois do "Fechado".
   
   Três adições vindas da revisão operacional:
   1. Controle de fornecedor — hotel/operador que não confirma
      é viagem que explode na mão do cliente.
   2. Status financeiro — bilhete emitido sem pagamento é
      prejuízo seu.
   3. Travas operacionais — o marco de voucher exige que o
      fornecedor tenha confirmado e o pagamento esteja em dia.
   ============================================================ */

import { diasAte, primeiroNome, fmtData } from "./dominio.js";

export const FASES = ["Pré-viagem", "Em viagem", "Voltou", "Encerrado"];

export const COR_FASE = {
  "Pré-viagem": "bg-blue-500",
  "Em viagem": "bg-violet-500",
  Voltou: "bg-emerald-500",
  Encerrado: "bg-slate-300",
};

/* A fase é calculada, nunca guardada. */
export function faseViagem(n) {
  if (n.etapa_funil !== "Fechado" || !n.data_ida) return null;
  const ida = diasAte(n.data_ida);
  const volta = diasAte(n.data_volta || n.data_ida);
  if (ida > 0) return "Pré-viagem";
  if (volta >= 0) return "Em viagem";
  if (volta >= -45) return "Voltou";
  return "Encerrado";
}

/* ============================================================
   STATUS FINANCEIRO
   ============================================================ */

export const STATUS_PAGAMENTO = ["Pendente", "Parcial", "Pago"];

export function pagamentoEmDia(n) {
  return n.status_pagamento === "Pago";
}

/* ============================================================
   CONTROLE DE FORNECEDOR
   Cada item é um fornecedor (hotel, aéreo, traslado, etc).
   O operador adiciona quando fecha a venda. O sistema cobra.
   ============================================================ */

export const STATUS_FORNECEDOR = ["Solicitado", "Confirmado", "Voucher recebido"];

export function fornecedorAtrasado(fornecedor, diasParaIda) {
  if (fornecedor.status === "Voucher recebido") return false;
  if (fornecedor.status === "Confirmado" && diasParaIda <= 10) return true;
  if (fornecedor.status === "Solicitado" && diasParaIda <= 20) return true;
  return false;
}

export function temFornecedorAtrasado(n) {
  if (!n.fornecedores?.length) return false;
  const d = diasAte(n.data_ida);
  return n.fornecedores.some((f) => fornecedorAtrasado(f, d));
}

export function todosVouchersRecebidos(n) {
  if (!n.fornecedores?.length) return true; // sem fornecedor = sem trava
  return n.fornecedores.every((f) => f.status === "Voucher recebido");
}

/* ============================================================
   MARCOS — agora com travas operacionais.
   `trava` = condição que impede o marco de ser concluído.
   ============================================================ */

export const MARCOS = [
  {
    id: "pagamento",
    fase: "Pré-viagem",
    titulo: "Confirmar o pagamento e enviar o comprovante da reserva",
    porque: "Reserva sem pagamento confirmado cai sozinha. É o erro mais caro que existe.",
    janela: (d) => d.ida <= 400,
    critico: true,
    mensagem: (n, c) =>
      `${primeiroNome(c.nome)}, tudo certo com o pagamento da sua viagem para ${n.destino}. Estou te enviando o comprovante da reserva. Guarde este arquivo com você.`,
  },
  {
    id: "fornecedor_solicitar",
    fase: "Pré-viagem",
    titulo: "Solicitar serviços aos fornecedores (hotel, aéreo, traslado)",
    porque: "Fornecedor solicitado tarde vira disponibilidade perdida. Solicite na semana do fechamento.",
    janela: (d) => d.ida <= 400,
    critico: true,
    interno: true, // não gera mensagem para o cliente, é back-office
    mensagem: () => null,
  },
  {
    id: "documentos",
    fase: "Pré-viagem",
    titulo: "Conferir documentos: validade do passaporte, visto e vacina",
    porque:
      "Passaporte precisa de 6 meses de validade além da volta. Descobrir na fila do embarque é a viagem perdida — e o cliente vai lembrar de quem vendeu.",
    janela: (d) => d.ida <= 60,
    critico: true,
    mensagem: (n, c) =>
      `${primeiroNome(c.nome)}, vamos conferir a documentação de ${n.destino} com antecedência para não ter susto. Me manda uma foto do documento de quem vai viajar? Preciso checar a validade e, se for o caso, exigência de visto e vacina.`,
  },
  {
    id: "seguro",
    fase: "Pré-viagem",
    titulo: "Oferecer o seguro viagem",
    porque: "É proteção real para o cliente e receita adicional para você. Oferecer cedo é serviço; oferecer na véspera parece empurrar.",
    janela: (d) => d.ida <= 60 && d.ida >= 7,
    mensagem: (n, c) =>
      `${primeiroNome(c.nome)}, quer que eu inclua o seguro viagem para ${n.destino}? Cobre atendimento médico, bagagem e cancelamento. Te mando os valores sem compromisso.`,
  },
  {
    id: "fornecedor_confirmar",
    fase: "Pré-viagem",
    titulo: "Cobrar confirmação dos fornecedores que ainda não responderam",
    porque: "Faltam menos de 20 dias e o fornecedor não confirmou. Se ele não confirma, você não tem o que entregar.",
    janela: (d) => d.ida <= 20,
    critico: true,
    interno: true,
    // Só aparece se tem fornecedor pendente
    condicao: (n) => n.fornecedores?.some((f) => f.status === "Solicitado"),
    mensagem: () => null,
  },
  {
    id: "cobranca",
    fase: "Pré-viagem",
    titulo: "Verificar saldo financeiro — não emitir bilhete sem pagamento total",
    porque: "Bilhete emitido sem pagamento é prejuízo seu. Nenhuma exceção.",
    janela: (d) => d.ida <= 15,
    critico: true,
    interno: true,
    condicao: (n) => n.status_pagamento !== "Pago",
    mensagem: () => null,
  },
  {
    id: "roteiro",
    fase: "Pré-viagem",
    titulo: "Enviar o roteiro final com vouchers e horários",
    porque: "É o momento em que a viagem vira real para o cliente. Também é quando ele mostra para os amigos — e assim nasce indicação.",
    janela: (d) => d.ida <= 10,
    critico: true,
    // TRAVA: não mande roteiro se o fornecedor não confirmou ou o pagamento não fechou.
    trava: (n) => {
      const problemas = [];
      if (n.status_pagamento !== "Pago") problemas.push("Pagamento não está 100% confirmado");
      if (!todosVouchersRecebidos(n)) problemas.push("Nem todos os vouchers foram recebidos dos fornecedores");
      return problemas.length ? problemas : null;
    },
    mensagem: (n, c) =>
      `${primeiroNome(c.nome)}, seu roteiro de ${n.destino} está pronto! Estou enviando os vouchers, horários e endereços tudo junto. Dá uma olhada com calma e me diz se ficou alguma dúvida.`,
  },
  {
    id: "checkin",
    fase: "Pré-viagem",
    titulo: "Lembrar do check-in e da bagagem",
    porque: "Check-in aberto e não feito vira assento ruim, multa ou embarque negado. Um lembrete evita a ligação de emergência.",
    janela: (d) => d.ida <= 2 && d.ida >= 0,
    critico: true,
    mensagem: (n, c) =>
      `${primeiroNome(c.nome)}, o check-in da sua viagem já está liberado. Quer que eu faça para você? Aproveito para conferir a franquia de bagagem antes do embarque.`,
  },
  {
    id: "vespera",
    fase: "Pré-viagem",
    titulo: "Mensagem de véspera de embarque",
    porque: "Custa um minuto e é o que o cliente lembra. Agência que some depois do pagamento não recebe indicação.",
    janela: (d) => d.ida <= 1 && d.ida >= 0,
    mensagem: (n, c) =>
      `${primeiroNome(c.nome)}, amanhã é o grande dia! Boa viagem para ${n.destino}. Qualquer coisa durante a viagem, é só me chamar aqui — estou à disposição.`,
  },
  {
    id: "chegada",
    fase: "Em viagem",
    titulo: "Confirmar que chegou bem",
    porque: "Suporte durante a viagem é o que o cliente compra de uma agência em vez de comprar sozinho na internet. Use.",
    janela: () => true,
    critico: true,
    mensagem: (n, c) => `${primeiroNome(c.nome)}, chegou tudo bem? O traslado e a hospedagem estavam conforme o combinado?`,
  },
  {
    id: "meio",
    fase: "Em viagem",
    titulo: "Um contato leve no meio da viagem",
    porque: "Problema pequeno resolvido na hora não vira reclamação depois. E não atrapalhe: uma mensagem basta.",
    janela: () => true,
    mensagem: (n, c) => `${primeiroNome(c.nome)}, tudo correndo bem por aí? Se precisar de qualquer ajuste, me avisa que eu resolvo daqui.`,
  },
  {
    id: "boasvindas",
    fase: "Voltou",
    titulo: "Dar as boas-vindas de volta",
    porque: "O cliente chegou em casa. Este é o ponto mais alto da relação — e a maioria das agências não faz nada aqui.",
    janela: (d) => d.desdeVolta >= 0,
    critico: true,
    mensagem: (n, c) =>
      `${primeiroNome(c.nome)}, bem-vindo de volta! Como foi ${n.destino}? Me conta o que você mais gostou — adoro saber como foi na prática.`,
  },
  {
    id: "avaliacao",
    fase: "Voltou",
    titulo: "Pedir a avaliação no Google",
    porque:
      "Sua ficha no Google tem zero avaliações. Peça quando ele acabou de voltar e está satisfeito — em uma semana a empolgação passa e ele não faz mais.",
    janela: (d) => d.desdeVolta >= 2,
    mensagem: (n, c) =>
      `${primeiroNome(c.nome)}, fico feliz que a viagem tenha sido boa! Posso te pedir um favor? Se puder deixar uma avaliação da 3LG no Google, me ajuda demais. Leva menos de um minuto e faz muita diferença para uma agência pequena. Te mando o link.`,
  },
  {
    id: "depoimento",
    fase: "Voltou",
    titulo: "Pedir foto e depoimento para o Instagram",
    porque: "Foto de cliente real vale mais que qualquer anúncio. E ele gosta de aparecer.",
    janela: (d) => d.desdeVolta >= 7,
    mensagem: (n, c) =>
      `${primeiroNome(c.nome)}, posso publicar uma foto da sua viagem para ${n.destino} no Instagram da 3LG? Se você topar mandar uma que goste, junto com uma frase sobre a experiência, eu publico marcando você.`,
  },
  {
    id: "indicacao",
    fase: "Voltou",
    titulo: "Pedir indicação",
    porque: "Cliente satisfeito indica se for pedido. Quase ninguém pede — por isso quase ninguém recebe.",
    janela: (d) => d.desdeVolta >= 20,
    mensagem: (n, c) =>
      `${primeiroNome(c.nome)}, foi um prazer organizar sua viagem. Conhece alguém que esteja pensando em viajar? Pode passar meu contato — cuido da pessoa com o mesmo carinho que cuidei de você.`,
  },
];

/* ============================================================
   CÁLCULOS
   ============================================================ */

export function dias(n) {
  return {
    ida: diasAte(n.data_ida),
    volta: diasAte(n.data_volta || n.data_ida),
    desdeVolta: -diasAte(n.data_volta || n.data_ida),
  };
}

export function marcosDaViagem(n) {
  const fase = faseViagem(n);
  if (!fase || fase === "Encerrado") return [];
  const d = dias(n);
  return MARCOS.filter((m) => {
    if (m.fase !== fase) return false;
    if (!m.janela(d)) return false;
    if (m.condicao && !m.condicao(n)) return false;
    return true;
  });
}

export function proximoMarco(n) {
  const feitos = n.checklist_jornada || {};
  return marcosDaViagem(n).find((m) => !feitos[m.id]) || null;
}

export function progressoJornada(n) {
  const feitos = n.checklist_jornada || {};
  const todos = marcosDaViagem(n);
  const ok = todos.filter((m) => feitos[m.id]).length;
  return { feitos: ok, total: todos.length };
}

export function motivoViagem(n) {
  const d = dias(n);
  const fase = faseViagem(n);

  // Alertas operacionais têm prioridade no motivo
  if (fase === "Pré-viagem") {
    if (temFornecedorAtrasado(n)) {
      return `Fornecedor sem confirmar a ${d.ida} dias do embarque. Cobre agora.`;
    }
    if (d.ida <= 15 && n.status_pagamento !== "Pago") {
      return `Embarque em ${d.ida} dias e o pagamento não está fechado. Não emita bilhete.`;
    }
    if (d.ida === 0) return "Embarca hoje.";
    if (d.ida === 1) return "Embarca amanhã.";
    if (d.ida <= 7) return `Embarca em ${d.ida} dias. Roteiro e vouchers precisam estar na mão dele.`;
    return `Viaja em ${d.ida} dias (${fmtData(n.data_ida)}).`;
  }
  if (fase === "Em viagem") return `Está viajando agora. Volta em ${Math.max(0, d.volta)} ${d.volta === 1 ? "dia" : "dias"}.`;
  if (fase === "Voltou") return `Chegou em casa há ${d.desdeVolta} ${d.desdeVolta === 1 ? "dia" : "dias"}. É agora que nasce a próxima venda.`;
  return "";
}
