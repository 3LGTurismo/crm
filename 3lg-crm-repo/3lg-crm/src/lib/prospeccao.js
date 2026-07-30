/* ============================================================
   PROSPECÇÃO — antes de existir lead.
   Aqui não há relógio de cliente esfriando. Há datas: aniversário
   da viagem, base parada, lead perdido que amadureceu.

   Decisão de produto: a fila só carrega ação COM NOME E SOBRENOME.
   "Poste no Instagram hoje" não entra — vira ruído, você ignora, e
   quando você ignora um item da fila, começa a ignorar todos.
   ============================================================ */

import { diasAte, primeiroNome, horasDesde } from "./dominio.js";

const diasDesde = (iso) => (iso ? Math.floor(horasDesde(iso) / 24) : 9999);

const mesDia = (iso) => (iso ? iso.slice(5, 10) : null);

/* ------------------------------------------------------------
   Gatilhos. Cada um recebe o contato já com o histórico anexado.
   ------------------------------------------------------------ */

export const GATILHOS = [
  {
    id: "aniversario_viagem",
    peso: 60,
    titulo: "Faz um ano da viagem dele",
    quando: (ctx) => {
      if (!ctx.ultimaViagem?.data_volta) return false;
      const d = diasDesde(new Date(ctx.ultimaViagem.data_volta + "T12:00:00").toISOString());
      return d >= 358 && d <= 372 && ctx.diasSemContato > 60 && !ctx.temNegocioAberto;
    },
    porque: "Aniversário de viagem é o melhor gancho que existe: você não está vendendo, está lembrando de algo bom.",
    mensagem: (ctx) =>
      `${primeiroNome(ctx.cliente.nome)}, faz um ano que você foi para ${ctx.ultimaViagem.destino}! Lembrei de você hoje. Já está pensando na próxima? Se quiser, te mando algumas ideias sem compromisso.`,
  },
  {
    id: "aniversario_cliente",
    peso: 55,
    mesmoEmJornada: true,
    titulo: "Aniversário dele é hoje ou amanhã",
    quando: (ctx) => {
      if (!ctx.cliente.aniversario) return false;
      const hoje = new Date();
      const amanha = new Date(Date.now() + 864e5);
      const fmt = (d) => `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return [fmt(hoje), fmt(amanha)].includes(ctx.cliente.aniversario);
    },
    porque: "Mensagem de aniversário sem oferta nenhuma. É relacionamento, não venda. A venda vem depois, sozinha.",
    mensagem: (ctx) => `${primeiroNome(ctx.cliente.nome)}, parabéns! Muitas felicidades e muitas viagens boas neste novo ano.`,
  },
  {
    id: "reativacao",
    peso: 35,
    titulo: "Cliente da base parado há meses",
    quando: (ctx) => ctx.jaComprou && ctx.diasSemContato >= 180 && !ctx.temNegocioAberto,
    porque: "Vender de novo para quem já confia em você custa muito menos que conquistar um estranho pelo Google Ads.",
    mensagem: (ctx) =>
      `${primeiroNome(ctx.cliente.nome)}, tudo bem? Passando para saber se você já tem alguma viagem no radar para os próximos meses. Se quiser, começo a pesquisar com antecedência — costuma render condições melhores.`,
  },
  {
    id: "lead_maduro",
    peso: 30,
    titulo: "Lead perdido que já pode voltar",
    quando: (ctx) =>
      !ctx.jaComprou &&
      ctx.perdido &&
      ctx.diasSemContato >= 120 &&
      !ctx.temNegocioAberto &&
      ctx.perdido.motivo_perda !== "Comprou com concorrente",
    porque: "Ele não disse não para sempre, disse não naquele momento. Quatro meses depois o momento é outro.",
    mensagem: (ctx) =>
      `${primeiroNome(ctx.cliente.nome)}, tudo bem? Você tinha me procurado sobre ${
        ctx.perdido.destino || "uma viagem"
      } e acabou não sendo a hora. Fiquei com você em mente. Se ainda tiver vontade, me avisa que eu pesquiso as condições de agora.`,
  },
];

/* ------------------------------------------------------------
   Monta o contexto de cada contato e devolve as ações possíveis.
   ------------------------------------------------------------ */

function contexto(estado, cliente) {
  const meus = estado.negocios.filter((n) => n.cliente_id === cliente.id);
  const fechados = meus.filter((n) => n.etapa_funil === "Fechado" && n.data_volta);
  const ultimaViagem = fechados.sort((a, b) => (a.data_volta < b.data_volta ? 1 : -1))[0] || null;
  const perdido = meus.filter((n) => n.etapa_funil === "Perdido").sort((a, b) => (a.ultima_interacao < b.ultima_interacao ? 1 : -1))[0] || null;

  // Bug corrigido: um valor nulo virava 9999 e contaminava a conta, fazendo
  // o CRM achar que um cliente com quem você falou ontem estava sumido há anos.
  const toques = [...meus.map((n) => n.ultima_interacao), cliente.ultimo_toque].filter(Boolean).map(diasDesde);

  return {
    cliente,
    ultimaViagem,
    perdido,
    jaComprou: fechados.length > 0,
    temNegocioAberto: meus.some((n) => !["Fechado", "Perdido"].includes(n.etapa_funil)),
    diasSemContato: toques.length ? Math.min(...toques) : 9999,
    // Viagem contratada que ainda não terminou: o motor da jornada já cuida dele.
    emJornada: meus.some((n) => n.etapa_funil === "Fechado" && n.data_volta && diasAte(n.data_volta) >= 0),
    viajandoAgora: meus.some(
      (n) => n.etapa_funil === "Fechado" && n.data_ida && diasAte(n.data_ida) <= 0 && diasAte(n.data_volta || n.data_ida) >= 0
    ),
  };
}

export function acoesProspeccao(estado) {
  const itens = [];

  estado.clientes.forEach((cliente) => {
    const ctx = contexto(estado, cliente);

    // Quem está viajando agora não recebe prospecção. Ele está de férias.
    if (ctx.viajandoAgora) return;
    if (cliente.adiado_ate && new Date(cliente.adiado_ate) > new Date()) return;

    GATILHOS.forEach((g) => {
      if (cliente.prospeccao_feita?.[g.id]) return;
      // Cliente com viagem contratada ou venda em andamento só recebe gatilho de relacionamento.
      if ((ctx.emJornada || ctx.temNegocioAberto) && !g.mesmoEmJornada) return;
      if (!g.quando(ctx)) return;
      itens.push({
        tipo: "prospeccao",
        id: `${cliente.id}:${g.id}`,
        cliente,
        gatilho: g,
        contexto: ctx,
        urgencia: g.peso,
        motivo: g.titulo,
        mensagem: g.mensagem(ctx),
      });
    });
  });

  return itens.sort((a, b) => b.urgencia - a.urgencia);
}
