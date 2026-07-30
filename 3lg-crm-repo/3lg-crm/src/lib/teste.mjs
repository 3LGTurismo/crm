/* ============================================================
   TESTE DO CRM 3LG TURISMO
   Roda com: node src/lib/teste.mjs
   
   Verifica cada regra de negócio sem precisar abrir o navegador.
   Se alguma linha sair ❌, o sistema tem um bug que precisa
   ser corrigido antes de usar com cliente real.
   ============================================================ */

import { uid, agora, horasAtras, hojeISO, diasAte, qualificacaoCompleta, camposFaltando, progressoEtapa, passoConcluido, ROTEIRO, ETAPAS, primeiroNome } from "./dominio.js";
import { slaHoras, slaEstourado, prioridade, filaDoDia, rodarAgentes, agenteFechamento, resumoDoDia } from "./motor.js";
import { faseViagem, proximoMarco, marcosDaViagem, temFornecedorAtrasado, todosVouchersRecebidos, MARCOS } from "./jornada.js";
import { filaCompleta, resumoFila, CAMADAS } from "./fila.js";
import { acoesProspeccao } from "./prospeccao.js";
import { dadosIniciais } from "./dadosIniciais.js";

let total = 0;
let ok = 0;
let falhou = 0;

function teste(nome, condicao) {
  total++;
  if (condicao) {
    ok++;
    console.log(`  ✅ ${nome}`);
  } else {
    falhou++;
    console.log(`  ❌ ${nome}`);
  }
}

const emDias = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const diaAtras = (d) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);

/* ============================================================
   1. REGRA CRÍTICA DE BLOQUEIO
   ============================================================ */
console.log("\n═══ REGRA DE BLOQUEIO DA PROPOSTA ═══");

teste("Sem destino = bloqueado", !qualificacaoCompleta({ destino: "", data_ida: "2026-12-01", orcamento: 5000 }));
teste("Sem data = bloqueado", !qualificacaoCompleta({ destino: "Cancún", data_ida: "", orcamento: 5000 }));
teste("Sem orçamento = bloqueado", !qualificacaoCompleta({ destino: "Cancún", data_ida: "2026-12-01", orcamento: 0 }));
teste("Tudo preenchido = liberado", qualificacaoCompleta({ destino: "Cancún", data_ida: "2026-12-01", orcamento: 5000 }));
teste("Destino só espaços = bloqueado", !qualificacaoCompleta({ destino: "   ", data_ida: "2026-12-01", orcamento: 5000 }));

const faltam = camposFaltando({ destino: "", data_ida: "2026-12-01", orcamento: 0 });
teste("Mostra campos faltando (Destino + Orçamento)", faltam.includes("Destino") && faltam.includes("Orçamento") && !faltam.includes("Data de ida"));

/* ============================================================
   2. SLA DINÂMICO
   ============================================================ */
console.log("\n═══ SLA DINÂMICO ═══");

const leadNovo = { etapa_funil: "Novo Lead", data_ida: emDias(30), ultima_interacao: agora(), checklist: {} };
teste("Lead novo: SLA = 1h", slaHoras(leadNovo) === 1);

const viagemPerto = { etapa_funil: "Proposta Enviada", data_ida: emDias(20), ultima_interacao: horasAtras(1) };
const viagemLonge = { etapa_funil: "Proposta Enviada", data_ida: emDias(200), ultima_interacao: horasAtras(1) };
teste("Viagem perto tem SLA menor que viagem longe", slaHoras(viagemPerto) < slaHoras(viagemLonge));

const propostaRapida = { etapa_funil: "Montando Proposta", data_ida: emDias(15), ultima_interacao: horasAtras(1) };
teste("Montando proposta tem o SLA mais curto (proposta prometida em 24h)", slaHoras(propostaRapida) <= 6);

const leadEstourado = { etapa_funil: "Novo Lead", data_ida: emDias(30), ultima_interacao: horasAtras(2), checklist: {} };
teste("Lead novo de 2h atrás = SLA estourado", slaEstourado(leadEstourado));

const dentroSLA = { etapa_funil: "Qualificação", data_ida: emDias(200), ultima_interacao: horasAtras(1) };
teste("Qualificação com viagem longe e 1h atrás = dentro do SLA", !slaEstourado(dentroSLA));

/* ============================================================
   3. FILA DE PRIORIDADE
   ============================================================ */
console.log("\n═══ FILA DE PRIORIDADE ═══");

const st = dadosIniciais();

const fila = filaDoDia(st.negocios);
const nomes = fila.map((n) => st.clientes.find((c) => c.id === n.cliente_id)?.nome);
teste("Lead novo (Marina) é o primeiro da fila de venda", nomes[0] === "Marina Alves");

const fechados = st.negocios.filter((n) => n.etapa_funil === "Fechado");
const naFila = fila.some((n) => fechados.includes(n));
teste("Negócios fechados não entram na fila de venda", !naFila);

const adiado = { ...st.negocios[0], adiado_ate: new Date(Date.now() + 864e5).toISOString() };
teste("Negócio adiado tem prioridade negativa", prioridade(adiado) === -1);

// Quem estourou SLA vem antes de quem está em dia
const estourado = { etapa_funil: "Qualificação", data_ida: emDias(60), ultima_interacao: horasAtras(200), checklist: {} };
const emDia = { etapa_funil: "Negociação", data_ida: emDias(20), ultima_interacao: horasAtras(1), checklist: {}, orcamento: 50000 };
teste("Atrasado sempre vem antes de quem está em dia (mesmo se o em dia tem mais dinheiro)", prioridade(estourado) > prioridade(emDia));

/* ============================================================
   4. AGENTES AUTÔNOMOS
   ============================================================ */
console.log("\n═══ AGENTES AUTÔNOMOS ═══");

const { tarefas, logs } = rodarAgentes(st);

const temGatilho = (g) => tarefas.some((t) => t.gatilho === g);
teste("Agente de Vendas: alerta de lead novo sem contato", temGatilho("leadfrio"));
teste("Agente de Marketing: nutrição em Qualificação parada", temGatilho("nurturing"));
teste("Agente de Vendas: follow-up nível 1 (escassez)", temGatilho("followup_1"));

// Anti-duplicidade
const st2 = { ...st, tarefas: [...st.tarefas, ...tarefas] };
const { tarefas: t2 } = rodarAgentes(st2);
teste("Anti-duplicidade: segunda rodada com mesmas tarefas = 0 novas", t2.filter((t) => ["leadfrio", "nurturing", "followup_1"].includes(t.gatilho)).length === 0);

// Cadência graduada: nível 2 só dispara se nível 1 foi concluído
const stComF1Concluida = {
  ...st,
  tarefas: tarefas.map((t) => t.gatilho === "followup_1" ? { ...t, status: "Concluída" } : t),
  negocios: st.negocios.map((n) => n.etapa_funil === "Proposta Enviada" ? { ...n, ultima_interacao: horasAtras(100) } : n),
};
const { tarefas: t3 } = rodarAgentes(stComF1Concluida);
teste("Cadência: nível 2 dispara após nível 1 concluído + 4 dias", t3.some((t) => t.gatilho === "followup_2"));

// Agente de fechamento
const negNeg = { id: "x", cliente_id: st.clientes[0].id, etapa_funil: "Negociação", orcamento: 10000, destino: "Salvador" };
const r = agenteFechamento({ ...st, tarefas: [] }, negNeg);
teste("Agente de Vendas: gera script de fechamento ao entrar em Negociação", r !== null && r.tarefa.gatilho === "closer");

// Agente de Operações: fornecedor atrasado
teste("Agente de Operações: alerta de fornecedor sem confirmar", tarefas.some((t) => t.agente === "Agente de Operações" && t.descricao.includes("BA Transfers")));
teste("Agente de Operações: alerta de pagamento não fechado", tarefas.some((t) => t.agente === "Agente de Operações" && t.gatilho === "cobranca_urgente"));

/* ============================================================
   5. JORNADA (PÓS-VENDA)
   ============================================================ */
console.log("\n═══ JORNADA PÓS-VENDA ═══");

// Paulo: embarca em 5 dias, pré-viagem
const paulo = st.negocios.find((n) => n.destino === "Buenos Aires");
teste("Paulo (Buenos Aires, 5 dias): fase = Pré-viagem", faseViagem(paulo) === "Pré-viagem");

// Helena: está viajando agora
const helena = st.negocios.find((n) => n.destino === "Fernando de Noronha");
teste("Helena (Noronha): fase = Em viagem", faseViagem(helena) === "Em viagem");
const marcoHelena = proximoMarco(helena);
teste("Helena: próximo marco = Confirmar que chegou bem", marcoHelena?.id === "chegada");

// Márcio: voltou há 3 dias
const marcio = st.negocios.find((n) => n.destino === "Caldas Novas");
teste("Márcio (Caldas Novas): fase = Voltou", faseViagem(marcio) === "Voltou");
const marcoMarcio = proximoMarco(marcio);
teste("Márcio: próximo marco = Boas-vindas de volta", marcoMarcio?.id === "boasvindas");

// Fornecedor atrasado
teste("Paulo: tem fornecedor atrasado (BA Transfers)", temFornecedorAtrasado(paulo));
teste("Helena: fornecedores OK", !temFornecedorAtrasado(helena));

// Trava de voucher
teste("Paulo: NÃO tem todos os vouchers (traslado pendente)", !todosVouchersRecebidos(paulo));
teste("Helena: tem todos os vouchers", todosVouchersRecebidos(helena));

// Pagamento
teste("Paulo: pagamento parcial", paulo.status_pagamento === "Parcial");
teste("Helena: pagamento pago", helena.status_pagamento === "Pago");

// Trava operacional no marco de roteiro
const marcoRoteiro = MARCOS.find((m) => m.id === "roteiro");
const travaPaulo = marcoRoteiro.trava?.(paulo);
teste("Trava: roteiro do Paulo bloqueado (pagamento + voucher)", travaPaulo !== null && travaPaulo.length === 2);
teste("Trava: roteiro da Helena liberado", marcoRoteiro.trava?.(helena) === null);

// Negócio fechado antigo = Encerrado
const cristinaMaceio = st.negocios.find((n) => n.destino === "Maceió");
teste("Cristina (Maceió, 1 ano atrás): fase = Encerrado", faseViagem(cristinaMaceio) === "Encerrado");

/* ============================================================
   6. FILA UNIFICADA (3 motores em 1)
   ============================================================ */
console.log("\n═══ FILA UNIFICADA ═══");

const filaU = filaCompleta(st);
const camadaNome = Object.fromEntries(Object.entries(CAMADAS).map(([k, v]) => [v, k]));

teste("Fila tem itens de venda", filaU.some((i) => i.tipo === "venda"));
teste("Fila tem itens de viagem", filaU.some((i) => i.tipo === "viagem"));
teste("Fila tem itens de prospecção", filaU.some((i) => i.tipo === "prospeccao"));

// Ordem das camadas
const camadas = filaU.map((i) => i.camada);
const crescente = camadas.every((v, i) => i === 0 || v >= camadas[i - 1]);
teste("Camadas estão em ordem crescente (urgente primeiro)", crescente);

// Entrega crítica vem antes de lead novo
const primeiraVenda = filaU.findIndex((i) => i.tipo === "venda");
const primeiraViagem = filaU.findIndex((i) => i.tipo === "viagem");
teste("Entrega crítica vem antes do funil de vendas", primeiraViagem < primeiraVenda);

// Prospecção vem por último
const ultimaProsp = filaU.filter((i) => i.tipo === "prospeccao").length;
teste("Prospecção fica no final da fila", ultimaProsp > 0 && filaU.slice(-ultimaProsp).every((i) => i.tipo === "prospeccao"));

// Limite de prospecção
teste("Máximo 3 itens de prospecção na fila", ultimaProsp <= 3);

// Resumo
const res = resumoFila(st);
teste("Resumo conta todos os itens", res.total === filaU.length);

/* ============================================================
   7. PROSPECÇÃO
   ============================================================ */
console.log("\n═══ PROSPECÇÃO ═══");

const acoes = acoesProspeccao(st);
teste("Cristina Tanaka: SEM prospecção (tem negócio aberto em Porto de Galinhas)", !acoes.some((a) => a.cliente.nome === "Cristina Tanaka"));
teste("Paulo Machado: gatilho de aniversário do cliente", acoes.some((a) => a.cliente.nome === "Paulo Machado" && a.gatilho.id === "aniversario_cliente"));

// Quem está viajando agora NÃO recebe prospecção
teste("Helena (viajando): sem prospecção", !acoes.some((a) => a.cliente.nome === "Helena Barros"));

/* ============================================================
   8. ROTEIRO GUIADO
   ============================================================ */
console.log("\n═══ ROTEIRO GUIADO ═══");

teste("Toda etapa aberta tem roteiro", ETAPAS.filter((e) => e !== "Encerrado").every((e) => ROTEIRO[e]));
teste("Todo roteiro tem objetivo", Object.values(ROTEIRO).every((r) => r.objetivo));
teste("Todo roteiro tem script", Object.values(ROTEIRO).every((r) => typeof r.script === "function"));

const nLead = { etapa_funil: "Novo Lead", nome: "Teste", destino: "", data_ida: "", orcamento: 0, checklist: {} };
const progLead = progressoEtapa(nLead);
teste("Novo Lead sem contato = progresso < 100%", progLead.pct < 100);

const nQual = { etapa_funil: "Qualificação", destino: "Roma", data_ida: "2027-01-01", num_pessoas: 2, orcamento: 15000, checklist: { decisor: true, flex: true } };
const progQual = progressoEtapa(nQual);
teste("Qualificação com dados preenchidos + checklist = progresso alto", progQual.pct > 60);

/* ============================================================
   9. DADOS INICIAIS
   ============================================================ */
console.log("\n═══ INTEGRIDADE DOS DADOS ═══");

teste("Base tem clientes", st.clientes.length >= 5);
teste("Base tem negócios em etapas variadas", new Set(st.negocios.map((n) => n.etapa_funil)).size >= 4);
teste("Base tem negócios fechados com fornecedores", st.negocios.some((n) => n.etapa_funil === "Fechado" && n.fornecedores?.length > 0));
teste("Base tem fornecedor propositalmente atrasado (para teste)", st.negocios.some((n) => n.fornecedores?.some((f) => f.status === "Solicitado")));
teste("Todos os negócios têm checklist_jornada", st.negocios.every((n) => typeof n.checklist_jornada === "object"));
teste("Todos os negócios têm status_pagamento", st.negocios.every((n) => typeof n.status_pagamento === "string"));

/* ============================================================
   RESULTADO
   ============================================================ */
console.log("\n══════════════════════════════════════");
console.log(`   ${total} testes | ✅ ${ok} passaram | ❌ ${falhou} falharam`);
console.log("══════════════════════════════════════\n");

if (falhou > 0) {
  console.log("⚠️  Corrija os testes que falharam antes de usar com cliente real.\n");
  process.exit(1);
} else {
  console.log("✅  Tudo funcionando. O sistema está pronto para rodar.\n");
  process.exit(0);
}
