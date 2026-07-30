/* ============================================================
   Motor do CRM — decide QUEM você atende agora e POR QUÊ.
   ============================================================ */

import { horasDesde, diasAte, uid, agora, hojeISO, primeiroNome, scriptFechamento, proximoPasso } from "./dominio.js";

/* ------------------------------------------------------------
   SLA dinâmico.
   Prazo fixo de 48h trata igual quem viaja em 20 dias e quem
   viaja em 10 meses. O primeiro perde a viagem, o segundo se
   sente perseguido. O prazo nasce da distância até a viagem.
   ------------------------------------------------------------ */

export function slaHoras(negocio) {
  if (negocio.etapa_funil === "Novo Lead") return 1; // velocidade de resposta é o fator número 1

  const dias = diasAte(negocio.data_ida);

  let base;
  if (dias === null) base = 48; // sem data ainda: ritmo padrão
  else if (dias <= 30) base = 12;
  else if (dias <= 90) base = 36;
  else if (dias <= 180) base = 72;
  else base = 168; // viagem longe: 7 dias. Aqui pressa afasta.

  // Etapas quentes pedem ritmo mais curto; nutrição pede paciência.
  const ajuste = {
    Qualificação: 1.2,
    "Montando Proposta": 0.5, // proposta prometida em 24h não pode dormir
    "Proposta Enviada": 0.8,
    Negociação: 0.6,
  };

  return Math.round(base * (ajuste[negocio.etapa_funil] ?? 1));
}

export function slaEstourado(negocio) {
  if (["Fechado", "Perdido"].includes(negocio.etapa_funil)) return false;
  if (negocio.adiado_ate && new Date(negocio.adiado_ate) > new Date()) return false;
  return horasDesde(negocio.ultima_interacao) >= slaHoras(negocio);
}

/* ------------------------------------------------------------
   Prioridade — a fila do dia.
   ------------------------------------------------------------ */

export function prioridade(negocio) {
  if (["Fechado", "Perdido"].includes(negocio.etapa_funil)) return -1;
  if (negocio.adiado_ate && new Date(negocio.adiado_ate) > new Date()) return -1;

  const sla = slaHoras(negocio);
  const parado = horasDesde(negocio.ultima_interacao);
  const atraso = Math.max(0, parado - sla);

  let score = 0;

  // Lead novo sem contato vai para o topo, sempre.
  if (negocio.etapa_funil === "Novo Lead" && !negocio.checklist?.contato) score += 1000;

  // Quem estourou o prazo forma um bloco acima de quem está dentro dele.
  // Sem isso, o bônus de viagem próxima colocava cliente em dia na frente de
  // cliente atrasado — exatamente o erro que este CRM existe para evitar.
  if (atraso > 0) score += 150;

  // Quanto passou do prazo, proporcional ao prazo (2x o SLA pesa igual em qualquer etapa)
  score += (atraso / sla) * 100;

  const pesoEtapa = {
    "Novo Lead": 4,
    Qualificação: 1.5,
    "Montando Proposta": 3,
    "Proposta Enviada": 2.5,
    Negociação: 3.5,
  };
  score *= pesoEtapa[negocio.etapa_funil] ?? 1;

  // Viagem próxima: a janela está fechando de verdade.
  const dias = diasAte(negocio.data_ida);
  if (dias !== null && dias >= 0) {
    if (dias <= 15) score += 120;
    else if (dias <= 30) score += 60;
    else if (dias <= 60) score += 20;
  }

  // Desempate por comissão estimada, nunca como fator principal.
  score += Math.min(30, (Number(negocio.orcamento) || 0) * 0.1 * 0.001);

  return score;
}

export function motivoPrioridade(negocio) {
  const sla = slaHoras(negocio);
  const parado = Math.floor(horasDesde(negocio.ultima_interacao));
  const dias = diasAte(negocio.data_ida);

  if (negocio.etapa_funil === "Novo Lead" && !negocio.checklist?.contato) {
    return parado < 1 ? "Lead novo. Responda agora — os primeiros minutos decidem." : `Lead sem resposta há ${parado}h. Cada hora derruba a chance.`;
  }
  if (dias !== null && dias >= 0 && dias <= 15) {
    return `A viagem é em ${dias} ${dias === 1 ? "dia" : "dias"}. A janela está fechando.`;
  }
  if (parado >= sla) {
    return `Parado há ${parado}h e o ritmo desta etapa pede resposta em ${sla}h.`;
  }
  return `Dentro do prazo. Próximo contato em até ${Math.max(1, sla - parado)}h.`;
}

export function filaDoDia(negocios) {
  return negocios
    .map((n) => ({ n, p: prioridade(n) }))
    .filter((x) => x.p >= 0)
    .sort((a, b) => b.p - a.p)
    .map((x) => x.n);
}

/* ------------------------------------------------------------
   Agentes autônomos.
   Recebem o estado e devolvem tarefas e logs. Sem efeito colateral:
   assim dá para mover isso para um cron no servidor sem reescrever.
   ------------------------------------------------------------ */

const jaTemTarefa = (tarefas, negocio_id, gatilho) =>
  tarefas.some((t) => t.negocio_id === negocio_id && t.gatilho === gatilho && t.status === "Pendente");

export function rodarAgentes(estado) {
  const tarefas = [];
  const logs = [];
  const pool = [...estado.tarefas];

  const push = (tarefa, log) => {
    tarefas.push(tarefa);
    pool.push(tarefa);
    logs.push({ id: uid(), timestamp: agora(), ...log });
  };

  estado.negocios.forEach((n) => {
    const c = estado.clientes.find((x) => x.id === n.cliente_id);
    const nome = c?.nome || "cliente";
    const parado = Math.floor(horasDesde(n.ultima_interacao));
    const sla = slaHoras(n);
    const vencido = slaEstourado(n);

    /* --- Agente de Vendas: lead novo esfriando --- */
    if (
      estado.agentes.vendas &&
      n.etapa_funil === "Novo Lead" &&
      !n.checklist?.contato &&
      parado >= 1 &&
      !jaTemTarefa(pool, n.id, "leadfrio")
    ) {
      push(
        {
          id: uid(),
          negocio_id: n.id,
          tipo: "WhatsApp",
          gatilho: "leadfrio",
          agente: "Agente de Vendas",
          status: "Pendente",
          criada_em: agora(),
          data_vencimento: hojeISO(),
          descricao: `Agente de Vendas: lead novo sem contato há ${parado}h. Responda antes que ele fale com outra agência.`,
          sugestao: `Olá ${primeiroNome(nome)}! Aqui é o Leonardo, da 3LG Turismo. Vi seu contato sobre viagem. Me conta o motivo da viagem e para quando você pensa em ir, que já começo a pesquisar para você.`,
        },
        {
          nome_agente: "Agente de Vendas",
          acao_realizada: `Lead novo (${nome}) sem contato há ${parado}h. Alerta de velocidade de resposta criado.`,
        }
      );
    }

    /* --- Agente de Marketing: nutrição sem pressa --- */
    if (estado.agentes.marketing && n.etapa_funil === "Qualificação" && vencido && !jaTemTarefa(pool, n.id, "nurturing")) {
      const destino = n.destino?.trim() || "o destino em estudo";
      push(
        {
          id: uid(),
          negocio_id: n.id,
          tipo: "WhatsApp",
          gatilho: "nurturing",
          agente: "Agente de Marketing",
          status: "Pendente",
          criada_em: agora(),
          data_vencimento: hojeISO(),
          descricao: `Agente de Marketing sugere envio de dica de viagem para ${destino}`,
          sugestao: `Olá ${primeiroNome(nome)}, tudo bem? Separei uma dica sobre ${destino}: a melhor época para ir e o que costuma render mais no roteiro. Quer que eu te envie? Sem compromisso nenhum.`,
        },
        {
          nome_agente: "Agente de Marketing",
          acao_realizada: `${nome} parado em Qualificação há ${parado}h (prazo desta etapa: ${sla}h). Nutrição sobre ${destino} sugerida.`,
        }
      );
    }

    /* --- Agente de Vendas: cadência graduada de follow-up ---
       Dia 2: escassez (preço pode mudar)
       Dia 4: reversão de risco (seguro, garantia)
       Dia 7: concessão (algo extra, última tentativa)
       Cada nível só dispara se o anterior foi concluído ou
       se o tempo já passou do nível. */

    if (estado.agentes.vendas && n.etapa_funil === "Proposta Enviada") {
      const destino = n.destino || "a viagem";
      const diasParado = Math.floor(parado / 24);
      const concluida = (g) => pool.some((t) => t.negocio_id === n.id && t.gatilho === g && t.status === "Concluída");
      const pendente = (g) => jaTemTarefa(pool, n.id, g);

      // Nível 1: escassez (a partir do SLA da etapa, ~2 dias)
      if (vencido && !pendente("followup_1") && !concluida("followup_1")) {
        push(
          {
            id: uid(), negocio_id: n.id, tipo: "WhatsApp", gatilho: "followup_1",
            agente: "Agente de Vendas", status: "Pendente", criada_em: agora(),
            data_vencimento: hojeISO(),
            descricao: `Agente de Vendas: proposta sem resposta há ${diasParado} dias. Gatilho: escassez.`,
            sugestao: `Olá ${primeiroNome(nome)}, a cotação da passagem para ${destino} pode sofrer alteração a qualquer momento. Podemos avançar com a reserva para travar esse valor?`,
          },
          { nome_agente: "Agente de Vendas", acao_realizada: `Proposta de ${nome} sem retorno há ${parado}h. Follow-up nível 1 (escassez) criado.` }
        );
      }

      // Nível 2: reversão de risco (~4 dias)
      if (diasParado >= 4 && concluida("followup_1") && !pendente("followup_2") && !concluida("followup_2")) {
        push(
          {
            id: uid(), negocio_id: n.id, tipo: "WhatsApp", gatilho: "followup_2",
            agente: "Agente de Vendas", status: "Pendente", criada_em: agora(),
            data_vencimento: hojeISO(),
            descricao: `Agente de Vendas: 4 dias sem resposta. Gatilho: reversão de risco.`,
            sugestao: `${primeiroNome(nome)}, lembrei de um detalhe: todos os pacotes da 3LG incluem seguro viagem com cobertura médica e de bagagem. Conseguiu analisar as opções que te enviei? Se precisar ajustar alguma coisa, me avisa.`,
          },
          { nome_agente: "Agente de Vendas", acao_realizada: `${nome} há ${diasParado} dias sem retorno. Follow-up nível 2 (reversão de risco) criado.` }
        );
      }

      // Nível 3: concessão (~7 dias, última tentativa antes de dar espaço)
      if (diasParado >= 7 && concluida("followup_2") && !pendente("followup_3") && !concluida("followup_3")) {
        push(
          {
            id: uid(), negocio_id: n.id, tipo: "WhatsApp", gatilho: "followup_3",
            agente: "Agente de Vendas", status: "Pendente", criada_em: agora(),
            data_vencimento: hojeISO(),
            descricao: `Agente de Vendas: 7 dias sem resposta. Gatilho: concessão (última tentativa).`,
            sugestao: `${primeiroNome(nome)}, consegui uma condição especial para ${destino} que vale até o fim da semana. Me avisa se ainda tem interesse ou se mudou de ideia — sem problema nenhum, fico à disposição para uma próxima.`,
          },
          { nome_agente: "Agente de Vendas", acao_realizada: `${nome} há ${diasParado} dias sem retorno. Follow-up nível 3 (concessão) criado. Última tentativa.` }
        );
      }
    }

    /* --- Agente de Operações: fornecedor e financeiro --- */
    if (n.etapa_funil === "Fechado" && n.data_ida) {
      const diasIda = diasAte(n.data_ida);

      // Fornecedor solicitado mas não confirmado, faltam menos de 20 dias
      if (diasIda !== null && diasIda <= 20 && diasIda >= 0 && n.fornecedores?.length) {
        n.fornecedores.forEach((f) => {
          const chave = `fornecedor_${f.id}`;
          if (f.status === "Solicitado" && !jaTemTarefa(pool, n.id, chave)) {
            push(
              {
                id: uid(), negocio_id: n.id, tipo: "Ligar", gatilho: chave,
                agente: "Agente de Operações", status: "Pendente", criada_em: agora(),
                data_vencimento: hojeISO(),
                descricao: `URGENTE: ${f.nome || "Fornecedor"} não confirmou. Faltam ${diasIda} dias para o embarque de ${nome}. Ligue agora.`,
                sugestao: null,
              },
              { nome_agente: "Agente de Operações", acao_realizada: `Fornecedor "${f.nome}" de ${nome} sem confirmar a ${diasIda} dias do embarque. Alerta criado.` }
            );
          }
        });
      }

      // Pagamento não fechado faltando menos de 15 dias
      if (diasIda !== null && diasIda <= 15 && diasIda >= 0 && n.status_pagamento !== "Pago" && !jaTemTarefa(pool, n.id, "cobranca_urgente")) {
        push(
          {
            id: uid(), negocio_id: n.id, tipo: "WhatsApp", gatilho: "cobranca_urgente",
            agente: "Agente de Operações", status: "Pendente", criada_em: agora(),
            data_vencimento: hojeISO(),
            descricao: `ALERTA FINANCEIRO: embarque de ${nome} em ${diasIda} dias e pagamento ${n.status_pagamento === "Parcial" ? "parcial" : "pendente"}. NÃO emita bilhete.`,
            sugestao: `${primeiroNome(nome)}, preciso confirmar o pagamento da sua viagem para ${n.destino} antes de emitir os bilhetes definitivos. Pode me avisar como ficou?`,
          },
          { nome_agente: "Agente de Operações", acao_realizada: `Pagamento de ${nome} não fechado a ${diasIda} dias do embarque. Alerta financeiro criado.` }
        );
      }
    }


    /* --- Agente de Marketing: pós-venda vira reputação --- */
    if (
      estado.agentes.marketing &&
      n.etapa_funil === "Fechado" &&
      !n.checklist?.avaliacao &&
      horasDesde(n.ultima_interacao) >= 24 &&
      !jaTemTarefa(pool, n.id, "avaliacao")
    ) {
      push(
        {
          id: uid(),
          negocio_id: n.id,
          tipo: "WhatsApp",
          gatilho: "avaliacao",
          agente: "Agente de Marketing",
          status: "Pendente",
          criada_em: agora(),
          data_vencimento: hojeISO(),
          descricao: "Agente de Marketing: venda fechada sem pedido de avaliação no Google.",
          sugestao: `${primeiroNome(nome)}, foi um prazer organizar essa viagem com você! Se puder deixar uma avaliação da 3LG no Google, me ajuda demais — leva menos de um minuto e faz muita diferença para uma agência pequena.`,
        },
        {
          nome_agente: "Agente de Marketing",
          acao_realizada: `Venda de ${nome} fechada e sem avaliação pedida. Tarefa de reputação criada.`,
        }
      );
    }
  });

  return { tarefas, logs };
}

/* Disparado na hora em que o card entra em Negociação. */
export function agenteFechamento(estado, negocio) {
  const c = estado.clientes.find((x) => x.id === negocio.cliente_id);
  const nome = c?.nome || "cliente";
  if (jaTemTarefa(estado.tarefas, negocio.id, "closer")) return null;

  return {
    tarefa: {
      id: uid(),
      negocio_id: negocio.id,
      tipo: "Ligar",
      gatilho: "closer",
      agente: "Agente de Vendas",
      status: "Pendente",
      criada_em: agora(),
      data_vencimento: hojeISO(),
      descricao: "Agente de Vendas: script de fechamento preparado para a faixa de orçamento deste cliente.",
      sugestao: scriptFechamento(nome, Number(negocio.orcamento), negocio.destino),
    },
    log: {
      id: uid(),
      timestamp: agora(),
      nome_agente: "Agente de Vendas",
      acao_realizada: `Entrada em Negociação (${nome}). Script gerado conforme o orçamento.`,
    },
  };
}

/* Resumo para o cabeçalho da tela Agora. */
export function resumoDoDia(estado) {
  const abertos = estado.negocios.filter((n) => !["Fechado", "Perdido"].includes(n.etapa_funil));
  const atrasados = abertos.filter(slaEstourado);
  const pendentes = estado.tarefas.filter((t) => t.status === "Pendente");
  const emJogo = abertos.reduce((s, n) => s + (Number(n.orcamento) || 0), 0);
  return { abertos: abertos.length, atrasados: atrasados.length, tarefas: pendentes.length, emJogo };
}
