import React, { useState } from "react";
import { Lock, AlertTriangle, MapPin, Calendar, Users, Wallet, Clock, Bot } from "lucide-react";
import {
  ETAPAS,
  PONTO_ETAPA,
  BORDA_ETAPA,
  fmtMoeda,
  fmtData,
  rotuloTempo,
  qualificacaoCompleta,
  camposFaltando,
  progressoEtapa,
} from "../lib/dominio.js";
import { slaEstourado } from "../lib/motor.js";

export default function Funil({ estado, cliente, moverNegocio, abrirEdicao }) {
  const [arrastando, setArrastando] = useState(null);
  const [colunaSobre, setColunaSobre] = useState(null);

  const arrastado = arrastando ? estado.negocios.find((n) => n.id === arrastando) : null;
  const bloqueia = arrastado && !qualificacaoCompleta(arrastado);

  return (
    <div className="flex h-full gap-3 overflow-x-auto px-4 py-4 pb-24 md:gap-4 md:p-6">
      {ETAPAS.map((etapa) => {
        const cards = estado.negocios.filter((n) => n.etapa_funil === etapa);
        const total = cards.reduce((s, n) => s + (Number(n.orcamento) || 0), 0);
        const travada = etapa === "Montando Proposta" && bloqueia;
        const destacada = colunaSobre === etapa && !travada;

        return (
          <div
            key={etapa}
            onDragOver={(e) => {
              e.preventDefault();
              setColunaSobre(etapa);
            }}
            onDragLeave={() => setColunaSobre((c) => (c === etapa ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              setColunaSobre(null);
              const id = e.dataTransfer.getData("text/plain");
              if (id) moverNegocio(id, etapa);
              setArrastando(null);
            }}
            className={`flex w-64 flex-shrink-0 md:w-72 flex-col rounded-xl border transition ${
              travada
                ? "border-2 border-dashed border-rose-400 bg-rose-50"
                : destacada
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              <span className={`h-2.5 w-2.5 rounded-full ${PONTO_ETAPA[etapa]}`} />
              <h3 className="flex-1 text-sm font-semibold text-slate-700">{etapa}</h3>
              {etapa === "Montando Proposta" && <Lock size={13} className={travada ? "text-rose-500" : "text-slate-400"} />}
              <span className="rounded-md bg-white px-1.5 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">{cards.length}</span>
            </div>

            {total > 0 && <div className="border-b border-slate-100 px-4 py-1.5 text-xs text-slate-500">{fmtMoeda(total)}</div>}

            {travada && (
              <div className="mx-3 mt-3 flex items-start gap-2 rounded-lg bg-rose-100 p-2.5 text-xs leading-snug text-rose-700">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                <span>Etapa travada: faltam {camposFaltando(arrastado).join(", ")}.</span>
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              {cards.length === 0 && !travada && <p className="px-1 py-6 text-center text-xs text-slate-400">Vazio.</p>}
              {cards.map((n) => (
                <Card
                  key={n.id}
                  negocio={n}
                  cliente={cliente(n.cliente_id)}
                  tarefas={estado.tarefas.filter((t) => t.negocio_id === n.id && t.status === "Pendente").length}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", n.id);
                    setArrastando(n.id);
                  }}
                  onDragEnd={() => {
                    setArrastando(null);
                    setColunaSobre(null);
                  }}
                  onClick={() => abrirEdicao(n)}
                  moverNegocio={moverNegocio}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Card({ negocio: n, cliente: c, tarefas, onDragStart, onDragEnd, onClick, moverNegocio }) {
  const atrasado = slaEstourado(n);
  const completo = qualificacaoCompleta(n);
  const { feitos, total } = progressoEtapa(n);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => {
        const i = ETAPAS.indexOf(n.etapa_funil);
        if (e.key === "Enter") onClick();
        if (e.key === "ArrowRight" && i < ETAPAS.length - 1) moverNegocio(n.id, ETAPAS[i + 1]);
        if (e.key === "ArrowLeft" && i > 0) moverNegocio(n.id, ETAPAS[i - 1]);
      }}
      className={`cursor-grab rounded-lg border-l-4 bg-white p-3 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 active:cursor-grabbing ${
        BORDA_ETAPA[n.etapa_funil]
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-tight text-slate-900">{c?.nome || "Cliente"}</p>
        {tarefas > 0 && (
          <span className="flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
            <Bot size={11} /> {tarefas}
          </span>
        )}
      </div>

      <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
        <MapPin size={12} className="text-slate-400" />
        {n.destino?.trim() ? n.destino : <span className="italic text-rose-500">sem destino</span>}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Calendar size={12} /> {n.data_ida ? fmtData(n.data_ida) : "—"}
        </span>
        <span className="flex items-center gap-1">
          <Users size={12} /> {n.num_pessoas || 1}
        </span>
        <span className="flex items-center gap-1 font-medium text-slate-700">
          <Wallet size={12} /> {fmtMoeda(Number(n.orcamento))}
        </span>
      </div>

      {total > 0 && !["Fechado", "Perdido"].includes(n.etapa_funil) && (
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(feitos / total) * 100}%` }} />
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{n.tipo || "Viagem"}</span>
        <span className={`flex items-center gap-1 text-xs ${atrasado ? "font-medium text-amber-600" : "text-slate-400"}`}>
          <Clock size={11} /> {rotuloTempo(n.ultima_interacao)}
        </span>
      </div>

      {!completo && !["Fechado", "Perdido"].includes(n.etapa_funil) && (
        <p className="mt-2 flex items-center gap-1 text-xs text-rose-600">
          <Lock size={11} /> Qualificação incompleta
        </p>
      )}
    </div>
  );
}
