import React, { useState, useEffect, useRef, useCallback } from "react";
import { Zap, LayoutGrid, CheckSquare, Bot, Plus, RefreshCw } from "lucide-react";

import { ETAPAS, ROTEIRO, agora, uid, horasAtras, horasDesde, qualificacaoCompleta } from "./lib/dominio.js";
import { rodarAgentes, agenteFechamento, resumoDoDia } from "./lib/motor.js";
import { carregarEstado, salvarEstado, exportarBackup, importarBackup } from "./lib/persistencia.js";
import { dadosIniciais } from "./lib/dadosIniciais.js";

import Agora from "./telas/Agora.jsx";
import Funil from "./telas/Funil.jsx";
import Tarefas from "./telas/Tarefas.jsx";
import ComandoIA from "./telas/ComandoIA.jsx";
import ModalNegocio from "./componentes/ModalNegocio.jsx";
import { Toasts } from "./componentes/ui.jsx";

export default function App() {
  const [estado, setEstado] = useState(null);
  const [tela, setTela] = useState("agora");
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);
  const ref = useRef(null);
  ref.current = estado;

  useEffect(() => {
    let vivo = true;
    carregarEstado().then((s) => vivo && setEstado(s || dadosIniciais()));
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (estado) salvarEstado(estado);
  }, [estado]);

  const toast = useCallback((msg, tipo = "ok") => {
    const id = uid();
    setToasts((t) => [...t, { id, msg, tipo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  const clienteDe = (id) => estado?.clientes.find((c) => c.id === id);

  const log = (st, nome_agente, acao_realizada) => ({
    ...st,
    logs: [{ id: uid(), nome_agente, acao_realizada, timestamp: agora() }, ...st.logs].slice(0, 300),
  });

  const patch = (st, id, mudanca) => ({
    ...st,
    negocios: st.negocios.map((n) => (n.id === id ? { ...n, ...mudanca } : n)),
  });

  /* ---------------- agentes ---------------- */

  const verificar = useCallback(
    (silencioso = true) => {
      setEstado((st) => {
        if (!st) return st;
        const { tarefas, logs } = rodarAgentes(st);
        if (tarefas.length === 0) {
          if (!silencioso) setTimeout(() => toast("Tudo dentro do prazo. Nenhum alerta novo.", "ok"), 0);
          return st;
        }
        if (!silencioso || tarefas.length > 0) {
          setTimeout(
            () => toast(`Os agentes criaram ${tarefas.length} ${tarefas.length === 1 ? "alerta" : "alertas"}.`, "ia"),
            0
          );
        }
        return { ...st, tarefas: [...tarefas, ...st.tarefas], logs: [...logs.reverse(), ...st.logs].slice(0, 300) };
      });
    },
    [toast]
  );

  useEffect(() => {
    if (!estado) return;
    const t = setInterval(() => verificar(true), 20000);
    return () => clearInterval(t);
  }, [estado, verificar]);

  useEffect(() => {
    if (!estado) return;
    const t = setTimeout(() => verificar(true), 800);
    return () => clearTimeout(t);
  }, [estado === null]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------------- ações ---------------- */

  const moverNegocio = (id, etapa) => {
    const st = ref.current;
    const n = st.negocios.find((x) => x.id === id);
    if (!n || n.etapa_funil === etapa) return;

    if (etapa === "Montando Proposta" && !qualificacaoCompleta(n)) {
      toast("Atenção: Faça a qualificação completa (Destino, Datas e Orçamento) antes de montar/enviar a proposta.", "erro");
      return;
    }

    setEstado((s) => {
      let novo = patch(s, id, { etapa_funil: etapa, ultima_interacao: agora(), adiado_ate: null });
      const c = s.clientes.find((x) => x.id === n.cliente_id);
      novo = log(novo, "Sistema", `${c?.nome || "Cliente"} entrou em "${etapa}".`);

      if (etapa === "Negociação" && s.agentes.vendas) {
        const r = agenteFechamento(novo, { ...n, etapa_funil: etapa });
        if (r) {
          novo = { ...novo, tarefas: [r.tarefa, ...novo.tarefas], logs: [r.log, ...novo.logs] };
          setTimeout(() => toast("Script de fechamento pronto em Tarefas do dia.", "ia"), 0);
        }
      }
      return novo;
    });

    if (etapa === "Perdido" || etapa === "Fechado") {
      const atual = ref.current.negocios.find((x) => x.id === id);
      setTimeout(() => setModal({ modo: "editar", negocio: { ...atual, etapa_funil: etapa } }), 100);
    }
  };

  const acoes = {
    novoLead: () => setModal({ modo: "novo" }),
    abrirEdicao: (n) => setModal({ modo: "editar", negocio: n }),

    marcarPasso: (id, passoId, valor) =>
      setEstado((s) => {
        const n = s.negocios.find((x) => x.id === id);
        return patch(s, id, {
          checklist: { ...(n.checklist || {}), [passoId]: valor },
          ultima_interacao: agora(),
          adiado_ate: null,
        });
      }),

    registrarContato: (id) =>
      setEstado((s) => {
        const n = s.negocios.find((x) => x.id === id);
        return patch(s, id, {
          ultima_interacao: agora(),
          adiado_ate: null,
          checklist: { ...(n.checklist || {}), contato: true },
        });
      }),

    concluirEtapa: (n) => {
      const proxima = ROTEIRO[n.etapa_funil]?.proxima;
      if (proxima) moverNegocio(n.id, proxima);
    },

    adiar: (id, dias) => {
      setEstado((s) => patch(s, id, { adiado_ate: new Date(Date.now() + dias * 864e5).toISOString() }));
      toast(dias === 1 ? "Guardado para amanhã." : `Guardado para daqui a ${dias} dias.`, "ok");
    },

    marcarPerdido: (n) => moverNegocio(n.id, "Perdido"),

    // Jornada pós-venda: marcar marco como feito
    marcarMarco: (negocioId, marcoId, valor) =>
      setEstado((s) => {
        const n = s.negocios.find((x) => x.id === negocioId);
        return patch(s, negocioId, {
          checklist_jornada: { ...(n.checklist_jornada || {}), [marcoId]: valor },
          ultima_interacao: agora(),
          adiado_ate: null,
        });
      }),

    // Prospecção: marcar gatilho como feito para este cliente
    marcarProspeccao: (clienteId, gatilhoId) =>
      setEstado((s) => ({
        ...s,
        clientes: s.clientes.map((c) =>
          c.id === clienteId
            ? { ...c, prospeccao_feita: { ...(c.prospeccao_feita || {}), [gatilhoId]: true }, ultimo_toque: agora() }
            : c
        ),
      })),

    // Adiar um cliente inteiro (prospecção)
    adiarCliente: (clienteId, dias) =>
      setEstado((s) => ({
        ...s,
        clientes: s.clientes.map((c) =>
          c.id === clienteId
            ? { ...c, adiado_ate: new Date(Date.now() + dias * 864e5).toISOString() }
            : c
        ),
      })),

    concluirTarefa: (id) =>
      setEstado((s) => ({
        ...s,
        tarefas: s.tarefas.map((t) => (t.id === id ? { ...t, status: "Concluída", concluida_em: agora() } : t)),
      })),

    reabrirTarefa: (id) =>
      setEstado((s) => ({ ...s, tarefas: s.tarefas.map((t) => (t.id === id ? { ...t, status: "Pendente" } : t)) })),

    excluirTarefa: (id) => setEstado((s) => ({ ...s, tarefas: s.tarefas.filter((t) => t.id !== id) })),

    alternarAgente: (chave) =>
      setEstado((s) => {
        const ligado = !s.agentes[chave];
        const nome = chave === "marketing" ? "Agente de Marketing" : "Agente de Vendas";
        return log({ ...s, agentes: { ...s.agentes, [chave]: ligado } }, "Sistema", `${nome} ${ligado ? "ligado" : "desligado"}.`);
      }),

    verificarAgora: () => verificar(false),

    envelhecer: () => {
      setEstado((s) => ({
        ...s,
        negocios: s.negocios.map((n) => ({
          ...n,
          ultima_interacao: horasAtras(horasDesde(n.ultima_interacao) + 48),
          adiado_ate: null,
        })),
      }));
      toast("Simulação: todos os clientes ficaram 48h mais antigos.", "ia");
      setTimeout(() => verificar(true), 400);
    },

    exportar: () => {
      exportarBackup(ref.current);
      toast("Backup baixado. Guarde fora do computador.", "ok");
    },

    importar: async (arquivo) => {
      try {
        const dados = await importarBackup(arquivo);
        if (!dados.negocios || !dados.clientes) throw new Error("Backup sem os dados esperados.");
        setEstado(dados);
        toast("Backup restaurado.", "ok");
      } catch (e) {
        toast(e.message, "erro");
      }
    },

    restaurarDemo: () => {
      setEstado(dadosIniciais());
      toast("Base restaurada para a demonstração.", "ok");
    },
  };

  const salvarNegocio = (f) => {
    setEstado((s) => {
      if (f.id) {
        return {
          ...s,
          clientes: s.clientes.map((c) =>
            c.id === f.cliente_id ? { ...c, nome: f.nome, whatsapp: f.whatsapp, email: f.email, origem: f.origem } : c
          ),
          negocios: s.negocios.map((n) =>
            n.id === f.id
              ? {
                  ...n,
                  destino: f.destino,
                  data_ida: f.data_ida,
                  data_volta: f.data_volta,
                  num_pessoas: Number(f.num_pessoas) || 1,
                  orcamento: Number(f.orcamento) || 0,
                  tipo: f.tipo,
                  motivo_viagem: f.motivo_viagem,
                  notas: f.notas,
                  motivo_perda: f.motivo_perda,
                  valor_venda: Number(f.valor_venda) || 0,
                  comissao: Number(f.comissao) || 0,
                  status_pagamento: f.status_pagamento || "Pendente",
                  fornecedores: f.fornecedores || [],
                  ultima_interacao: agora(),
                }
              : n
          ),
        };
      }
      const cid = uid();
      const novo = {
        ...s,
        clientes: [...s.clientes, { id: cid, nome: f.nome, whatsapp: f.whatsapp, email: f.email, origem: f.origem }],
        negocios: [
          {
            id: uid(),
            cliente_id: cid,
            destino: f.destino,
            data_ida: f.data_ida,
            data_volta: f.data_volta,
            num_pessoas: Number(f.num_pessoas) || 1,
            orcamento: Number(f.orcamento) || 0,
            tipo: f.tipo,
            motivo_viagem: f.motivo_viagem,
            notas: f.notas,
            valor_venda: 0,
            comissao: 0,
            motivo_perda: "",
            etapa_funil: "Novo Lead",
            ultima_interacao: agora(),
            checklist: {},
            checklist_jornada: {},
            adiado_ate: null,
            status_pagamento: "Pendente",
            fornecedores: [],
          },
          ...s.negocios,
        ],
      };
      return log(novo, "Sistema", `Novo lead: ${f.nome} (${f.origem}).`);
    });
    setModal(null);
    toast(f.id ? "Dados atualizados." : "Lead na fila. Responda nos próximos minutos.", "ok");
  };

  const excluirNegocio = (id) => {
    setEstado((s) => ({
      ...s,
      negocios: s.negocios.filter((n) => n.id !== id),
      tarefas: s.tarefas.filter((t) => t.negocio_id !== id),
    }));
    setModal(null);
    toast("Negócio removido.", "ok");
  };

  if (!estado) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">
        <RefreshCw className="mr-2 animate-spin" size={18} /> Abrindo seu CRM...
      </div>
    );
  }

  const resumo = resumoDoDia(estado);
  const [menuAberto, setMenuAberto] = useState(false);

  const irPara = (t) => { setTela(t); setMenuAberto(false); };

  return (
    <div className="flex h-screen w-full flex-col bg-slate-100 font-sans text-slate-800 md:flex-row">
      {/* Sidebar — desktop */}
      <aside className="hidden w-60 flex-shrink-0 flex-col bg-slate-900 text-slate-300 md:flex">
        <div className="border-b border-slate-800 px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">3</div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-white">3LG TURISMO</p>
              <p className="text-xs text-slate-400">CRM do Leonardo</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          <Item ativo={tela === "agora"} onClick={() => irPara("agora")} icone={Zap} texto="Agora" badge={resumo.atrasados} destaque />
          <Item ativo={tela === "funil"} onClick={() => irPara("funil")} icone={LayoutGrid} texto="Funil" />
          <Item ativo={tela === "tarefas"} onClick={() => irPara("tarefas")} icone={CheckSquare} texto="Tarefas do dia" badge={resumo.tarefas} />
          <Item ativo={tela === "ia"} onClick={() => irPara("ia")} icone={Bot} texto="Centro de Comando IA" />
        </nav>

        <div className="border-t border-slate-800 p-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Agentes</p>
          <Status nome="Marketing" ligado={estado.agentes.marketing} />
          <Status nome="Vendas" ligado={estado.agentes.vendas} />
        </div>
      </aside>

      {/* Header mobile */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">3</div>
          <span className="text-sm font-semibold text-slate-900">3LG</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setModal({ modo: "novo" })}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Plus size={16} />
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header desktop */}
        <header className="hidden items-center justify-between border-b border-slate-200 bg-white px-8 py-4 md:flex">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {tela === "agora" && "Agora"}
              {tela === "funil" && "Funil"}
              {tela === "tarefas" && "Tarefas do dia"}
              {tela === "ia" && "Centro de Comando IA"}
            </h1>
            <p className="text-sm text-slate-500">
              {tela === "agora" && "Um cliente por vez, na ordem que dá mais resultado."}
              {tela === "funil" && "Visão geral. A etapa de proposta exige qualificação completa."}
              {tela === "tarefas" && "Pendências criadas pelos agentes."}
              {tela === "ia" && "O que os agentes fizeram em segundo plano."}
            </p>
          </div>
          <button
            onClick={() => setModal({ modo: "novo" })}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <Plus size={16} /> Novo lead
          </button>
        </header>

        <div className="flex-1 overflow-auto pb-20 md:pb-0">
          {tela === "agora" && <Agora estado={estado} cliente={clienteDe} acoes={acoes} toast={toast} />}
          {tela === "funil" && <Funil estado={estado} cliente={clienteDe} moverNegocio={moverNegocio} abrirEdicao={acoes.abrirEdicao} />}
          {tela === "tarefas" && <Tarefas estado={estado} cliente={clienteDe} acoes={acoes} toast={toast} />}
          {tela === "ia" && <ComandoIA estado={estado} acoes={acoes} />}
        </div>
      </main>

      {/* Bottom nav — mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white py-2 md:hidden">
        <NavMobile ativo={tela === "agora"} onClick={() => irPara("agora")} icone={Zap} texto="Agora" badge={resumo.atrasados} />
        <NavMobile ativo={tela === "funil"} onClick={() => irPara("funil")} icone={LayoutGrid} texto="Funil" />
        <NavMobile ativo={tela === "tarefas"} onClick={() => irPara("tarefas")} icone={CheckSquare} texto="Tarefas" badge={resumo.tarefas} />
        <NavMobile ativo={tela === "ia"} onClick={() => irPara("ia")} icone={Bot} texto="IA" />
      </nav>

      {modal && (
        <ModalNegocio
          modo={modal.modo}
          negocio={modal.negocio}
          cliente={modal.negocio ? clienteDe(modal.negocio.cliente_id) : null}
          onSalvar={salvarNegocio}
          onExcluir={excluirNegocio}
          onFechar={() => setModal(null)}
        />
      )}

      <Toasts itens={toasts} remover={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}

function Item({ ativo, onClick, icone: Icone, texto, badge, destaque }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
        ativo ? "bg-blue-600 font-medium text-white" : "text-slate-300 hover:bg-slate-800"
      }`}
    >
      <Icone size={18} className={!ativo && destaque ? "text-amber-400" : ""} />
      <span className="flex-1 text-left">{texto}</span>
      {badge > 0 && (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ativo ? "bg-white text-blue-700" : "bg-amber-500 text-white"}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function Status({ nome, ligado }) {
  return (
    <div className="flex items-center gap-2 py-1 text-xs">
      <span className={`h-2 w-2 rounded-full ${ligado ? "animate-pulse bg-emerald-400" : "bg-slate-600"}`} />
      <span className={ligado ? "text-slate-300" : "text-slate-500"}>{nome}</span>
      <span className="ml-auto text-slate-500">{ligado ? "ativo" : "parado"}</span>
    </div>
  );
}

function NavMobile({ ativo, onClick, icone: Icone, texto, badge }) {
  return (
    <button onClick={onClick} className="relative flex flex-col items-center gap-0.5 px-3 py-1">
      <Icone size={20} className={ativo ? "text-blue-600" : "text-slate-400"} />
      <span className={`text-[10px] ${ativo ? "font-semibold text-blue-600" : "text-slate-400"}`}>{texto}</span>
      {badge > 0 && (
        <span className="absolute -right-0.5 top-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}
