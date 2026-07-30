/* ============================================================
   FILA ÚNICA — três motores, uma ordem.
   O operador não escolhe "vou fazer prospecção agora". Ele abre
   a tela e faz o que está no topo. A ordem é a decisão.
   ============================================================ */

import { prioridade, slaEstourado, motivoPrioridade } from "./motor.js";
import { faseViagem, proximoMarco, motivoViagem, dias } from "./jornada.js";
import { acoesProspeccao } from "./prospeccao.js";

/* Camadas. Nada de uma camada de baixo passa na frente de uma de cima.
   É isso que garante que prospecção nunca fure fila de cliente esperando. */
export const CAMADAS = {
  ENTREGA_CRITICA: 0, // a viagem acontece nos próximos dias ou está acontecendo
  LEAD_NOVO: 1, // velocidade de resposta
  VENDA_ATRASADA: 2, // estourou o prazo da etapa
  ENTREGA: 3, // cuidado da viagem, sem urgência
  VENDA_EM_DIA: 4, // acompanhamento normal
  PROSPECCAO: 5, // só quando o resto está em ordem
};

const LIMITE_PROSPECCAO = 3; // teto diário. Fila infinita de prospecção vira fila ignorada.

export function filaCompleta(estado) {
  const itens = [];

  estado.negocios.forEach((n) => {
    const cliente = estado.clientes.find((c) => c.id === n.cliente_id);
    if (!cliente) return;

    /* ---- entrega (pós-venda) ---- */
    if (n.etapa_funil === "Fechado") {
      const fase = faseViagem(n);
      if (!fase || fase === "Encerrado") return;
      const marco = proximoMarco(n);
      if (!marco) return;
      if (n.adiado_ate && new Date(n.adiado_ate) > new Date()) return;

      const d = dias(n);
      const critico = marco.critico && (fase === "Em viagem" || d.ida <= 7 || fase === "Voltou");

      itens.push({
        tipo: "viagem",
        id: n.id,
        negocio: n,
        cliente,
        marco,
        fase,
        camada: critico ? CAMADAS.ENTREGA_CRITICA : CAMADAS.ENTREGA,
        score: critico ? 1000 - Math.max(0, d.ida) : 100 - Math.max(0, d.ida),
        motivo: motivoViagem(n),
      });
      return;
    }

    /* ---- venda ---- */
    const p = prioridade(n);
    if (p < 0) return;

    const leadNovo = n.etapa_funil === "Novo Lead" && !n.checklist?.contato;
    itens.push({
      tipo: "venda",
      id: n.id,
      negocio: n,
      cliente,
      camada: leadNovo ? CAMADAS.LEAD_NOVO : slaEstourado(n) ? CAMADAS.VENDA_ATRASADA : CAMADAS.VENDA_EM_DIA,
      score: p,
      motivo: motivoPrioridade(n),
    });
  });

  /* ---- prospecção ---- */
  acoesProspeccao(estado)
    .slice(0, LIMITE_PROSPECCAO)
    .forEach((a) => itens.push({ ...a, camada: CAMADAS.PROSPECCAO, score: a.urgencia }));

  return itens.sort((a, b) => (a.camada !== b.camada ? a.camada - b.camada : b.score - a.score));
}

export function resumoFila(estado) {
  const fila = filaCompleta(estado);
  return {
    total: fila.length,
    urgentes: fila.filter((i) => i.camada <= CAMADAS.VENDA_ATRASADA).length,
    viagens: fila.filter((i) => i.tipo === "viagem").length,
    prospeccao: fila.filter((i) => i.tipo === "prospeccao").length,
  };
}
