import { uid, agora, horasAtras } from "./dominio.js";

const emDias = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const diaAtras = (d) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
const isoAtras = (d) => horasAtras(d * 24);
const aniversarioEmDias = (d) => {
  const dt = new Date(Date.now() + d * 864e5);
  return `${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

export function dadosIniciais() {
  const ids = Array.from({ length: 8 }, () => uid());
  const [c1, c2, c3, c4, c5, c6, c7, c8] = ids;

  const negocio = (extra) => ({
    id: uid(),
    destino: "",
    data_ida: "",
    data_volta: "",
    num_pessoas: 2,
    orcamento: 0,
    motivo_viagem: "",
    valor_venda: 0,
    comissao: 0,
    motivo_perda: "",
    notas: "",
    checklist: {},
    checklist_jornada: {},
    adiado_ate: null,
    status_pagamento: "Pendente", // "Pendente", "Parcial", "Pago"
    fornecedores: [],             // [{id, nome, tipo, status: "Solicitado"|"Confirmado"|"Voucher recebido"}]
    ...extra,
  });

  const cliente = (id, nome, whatsapp, origem, extra = {}) => ({
    id,
    nome,
    whatsapp,
    email: "",
    origem,
    aniversario: null,
    criado_em: agora(),
    ultimo_toque: null,
    adiado_ate: null,
    prospeccao_feita: {},
    ...extra,
  });

  return {
    clientes: [
      cliente(c1, "Marina Alves", "11 98877-1122", "Instagram"),
      cliente(c2, "Roberto Nunes", "11 97766-3344", "Google Ads"),
      cliente(c3, "Cristina Tanaka", "11 96655-8899", "Indicação"),
      cliente(c4, "Douglas Ferreira", "11 95544-7788", "Site 3lg.com.br"),
      cliente(c5, "Sueli Monteiro", "11 94433-6677", "WhatsApp"),
      cliente(c6, "Paulo Machado", "11 93322-5566", "Indicação", { aniversario: aniversarioEmDias(1) }),
      cliente(c7, "Helena Barros", "11 92211-4455", "Instagram"),
      cliente(c8, "Márcio Prado", "11 91100-3344", "Google Ads"),
    ],

    negocios: [
      /* ---------- funil de venda ---------- */
      negocio({ cliente_id: c1, etapa_funil: "Novo Lead", tipo: "Aéreo", ultima_interacao: horasAtras(3) }),

      negocio({
        cliente_id: c2,
        destino: "Cruzeiro Costa Brasileira",
        data_ida: emDias(120),
        data_volta: emDias(127),
        num_pessoas: 2,
        orcamento: 9800,
        motivo_viagem: "Aniversário de casamento",
        etapa_funil: "Qualificação",
        tipo: "Cruzeiro",
        ultima_interacao: horasAtras(96),
        checklist: { decisor: true },
      }),

      negocio({
        cliente_id: c4,
        destino: "Foz do Iguaçu",
        data_ida: emDias(45),
        data_volta: emDias(48),
        num_pessoas: 1,
        orcamento: 2600,
        motivo_viagem: "Viagem a lazer sozinho",
        etapa_funil: "Qualificação",
        tipo: "Rodoviário",
        ultima_interacao: horasAtras(6),
      }),

      negocio({
        cliente_id: c3,
        destino: "Porto de Galinhas",
        data_ida: emDias(24),
        data_volta: emDias(31),
        num_pessoas: 4,
        orcamento: 18500,
        motivo_viagem: "Férias com os filhos",
        etapa_funil: "Proposta Enviada",
        tipo: "Pacote nacional",
        ultima_interacao: horasAtras(50),
        checklist: { enviado: true },
      }),

      negocio({
        cliente_id: c5,
        destino: "Lisboa",
        data_ida: emDias(240),
        data_volta: emDias(252),
        num_pessoas: 2,
        orcamento: 32000,
        motivo_viagem: "Lua de mel",
        etapa_funil: "Negociação",
        tipo: "Pacote internacional",
        ultima_interacao: horasAtras(20),
        checklist: { objecao: true },
      }),

      /* ---------- viagens vendidas, em fases diferentes ---------- */
      negocio({
        cliente_id: c6,
        destino: "Buenos Aires",
        data_ida: emDias(5),
        data_volta: emDias(10),
        num_pessoas: 2,
        orcamento: 11000,
        valor_venda: 11400,
        comissao: 1140,
        motivo_viagem: "Bodas de prata",
        etapa_funil: "Fechado",
        tipo: "Pacote internacional",
        ultima_interacao: isoAtras(4),
        status_pagamento: "Parcial",
        fornecedores: [
          { id: uid(), nome: "Hotel Alvear Palace", tipo: "Hospedagem", status: "Confirmado" },
          { id: uid(), nome: "Aerolíneas Argentinas", tipo: "Aéreo", status: "Voucher recebido" },
          { id: uid(), nome: "BA Transfers", tipo: "Traslado", status: "Solicitado" },
        ],
        checklist_jornada: { pagamento: true, documentos: true, seguro: true, fornecedor_solicitar: true },
      }),

      negocio({
        cliente_id: c7,
        destino: "Fernando de Noronha",
        data_ida: diaAtras(2),
        data_volta: emDias(3),
        num_pessoas: 2,
        orcamento: 16000,
        valor_venda: 16400,
        comissao: 1600,
        motivo_viagem: "Férias do casal",
        etapa_funil: "Fechado",
        tipo: "Pacote nacional",
        ultima_interacao: isoAtras(3),
        status_pagamento: "Pago",
        fornecedores: [
          { id: uid(), nome: "Pousada Maravilha", tipo: "Hospedagem", status: "Voucher recebido" },
          { id: uid(), nome: "Azul Linhas Aéreas", tipo: "Aéreo", status: "Voucher recebido" },
        ],
        checklist_jornada: { pagamento: true, documentos: true, roteiro: true, checkin: true, vespera: true, fornecedor_solicitar: true },
      }),

      negocio({
        cliente_id: c8,
        destino: "Caldas Novas",
        data_ida: diaAtras(10),
        data_volta: diaAtras(3),
        num_pessoas: 3,
        orcamento: 7200,
        valor_venda: 7500,
        comissao: 720,
        motivo_viagem: "Descanso em família",
        etapa_funil: "Fechado",
        tipo: "Pacote nacional",
        ultima_interacao: isoAtras(11),
        checklist_jornada: { pagamento: true, documentos: true, roteiro: true, checkin: true, vespera: true, chegada: true, meio: true },
      }),

      /* ---------- base antiga: é daqui que nasce a prospecção ---------- */
      negocio({
        cliente_id: c3,
        destino: "Maceió",
        data_ida: diaAtras(372),
        data_volta: diaAtras(365),
        num_pessoas: 4,
        orcamento: 14000,
        valor_venda: 14200,
        comissao: 1400,
        etapa_funil: "Fechado",
        tipo: "Pacote nacional",
        ultima_interacao: isoAtras(360),
        checklist_jornada: {
          pagamento: true,
          documentos: true,
          roteiro: true,
          checkin: true,
          vespera: true,
          chegada: true,
          meio: true,
          boasvindas: true,
          avaliacao: true,
          depoimento: true,
          indicacao: true,
        },
      }),
    ],

    tarefas: [],
    logs: [{ id: uid(), nome_agente: "Sistema", acao_realizada: "Base iniciada com o ciclo completo de demonstração.", timestamp: agora() }],
    agentes: { marketing: true, vendas: true },
  };
}
