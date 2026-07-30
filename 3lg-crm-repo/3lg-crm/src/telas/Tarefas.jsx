import React, { useState } from "react";
import { Phone, MessageCircle, Mail, CheckSquare, CheckCircle2, Copy, Trash2, Bot } from "lucide-react";
import { fmtData, hojeISO } from "../lib/dominio.js";

const ICONE = { Ligar: Phone, WhatsApp: MessageCircle, Email: Mail };

export default function Tarefas({ estado, cliente, acoes, toast }) {
  const [filtro, setFiltro] = useState("Pendente");
  const lista = estado.tarefas.filter((t) => t.status === filtro);

  const contexto = (id) => {
    const n = estado.negocios.find((x) => x.id === id);
    return n ? { negocio: n, cliente: cliente(n.cliente_id) } : null;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 pb-24 md:p-8">
      <div className="mb-6 flex gap-2">
        {["Pendente", "Concluída"].map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              filtro === f ? "bg-blue-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {f}s ({estado.tarefas.filter((t) => t.status === f).length})
          </button>
        ))}
      </div>

      {lista.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <CheckCircle2 size={28} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-500">
            {filtro === "Pendente"
              ? "Nenhuma pendência. Os agentes avisam aqui quando um cliente precisar de atenção."
              : "Nada concluído ainda."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {lista.map((t) => {
          const ctx = contexto(t.negocio_id);
          const Icone = ICONE[t.tipo] || CheckSquare;
          const atrasada = t.status === "Pendente" && t.data_vencimento < hojeISO();

          return (
            <div key={t.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                    t.agente ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icone size={15} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {t.agente && (
                      <span className="flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                        <Bot size={11} /> {t.agente}
                      </span>
                    )}
                    {ctx && <span className="text-sm font-semibold text-slate-900">{ctx.cliente?.nome}</span>}
                    {ctx && <span className="text-xs text-slate-400">· {ctx.negocio.etapa_funil}</span>}
                    {atrasada && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">Atrasada</span>}
                  </div>

                  <p className="mt-1 text-sm text-slate-700">{t.descricao}</p>

                  {t.sugestao && (
                    <div className="mt-2 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Mensagem sugerida</p>
                      <p className="text-sm leading-snug text-slate-600">{t.sugestao}</p>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(t.sugestao);
                          toast("Mensagem copiada.", "ok");
                        }}
                        className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        <Copy size={12} /> Copiar mensagem
                      </button>
                    </div>
                  )}

                  <p className="mt-2 text-xs text-slate-400">Vence em {fmtData(t.data_vencimento)}</p>
                </div>

                <div className="flex flex-shrink-0 gap-1">
                  {t.status === "Pendente" ? (
                    <button
                      onClick={() => acoes.concluirTarefa(t.id)}
                      className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                    >
                      Concluir
                    </button>
                  ) : (
                    <button
                      onClick={() => acoes.reabrirTarefa(t.id)}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
                    >
                      Reabrir
                    </button>
                  )}
                  <button
                    onClick={() => acoes.excluirTarefa(t.id)}
                    className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                    aria-label="Excluir tarefa"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
