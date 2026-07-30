import React, { useState } from "react";
import {
  MapPin, Calendar, Users, Wallet, Copy, MessageCircle, Check,
  ArrowRight, Clock, ThumbsDown, Sun, Circle, CheckCircle2,
  Lightbulb, Pencil, ChevronRight, Flame, Plane, Home, Package,
  AlertTriangle, Heart, Lock,
} from "lucide-react";
import {
  ROTEIRO, OBJECOES, PONTO_ETAPA, fmtMoeda, fmtData, rotuloTempo,
  diasAte, primeiroNome, progressoEtapa, proximoPasso, passoConcluido,
  qualificacaoCompleta, camposFaltando,
} from "../lib/dominio.js";
import { slaEstourado } from "../lib/motor.js";
import { filaCompleta, resumoFila } from "../lib/fila.js";
import { COR_FASE, marcosDaViagem, proximoMarco, progressoJornada, temFornecedorAtrasado } from "../lib/jornada.js";

const linkWhats = (numero, texto) => {
  const d = String(numero || "").replace(/\D/g, "");
  const completo = d.startsWith("55") ? d : `55${d}`;
  return `https://wa.me/${completo}?text=${encodeURIComponent(texto)}`;
};

const saudacao = () => {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
};

const ICONE_TIPO = { venda: Wallet, viagem: Plane, prospeccao: Heart };
const COR_TIPO = { venda: "text-blue-600", viagem: "text-violet-600", prospeccao: "text-rose-500" };
const ROTULO_TIPO = { venda: "Venda", viagem: "Viagem", prospeccao: "Prospecção" };

/* ============================================================ */

export default function Agora({ estado, cliente, acoes, toast }) {
  const fila = filaCompleta(estado);
  const [selecionado, setSelecionado] = useState(null);
  const resumo = resumoFila(estado);

  const item = fila.find((i) => i.id === selecionado) || fila[0];

  if (!item) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 md:p-8">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Sun size={30} className="mx-auto mb-4 text-amber-400" />
          <h2 className="text-lg font-semibold text-slate-800">Fila limpa.</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
            Todo mundo está dentro do prazo. Quando um cliente esfriar, um fornecedor atrasar ou um prazo vencer, ele aparece aqui.
          </p>
          <button onClick={() => acoes.novoLead()}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700">
            Cadastrar um lead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 pb-24 md:px-6 md:pb-16">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{saudacao()}, Leonardo.</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {resumo.urgentes > 0
              ? `${resumo.urgentes} ${resumo.urgentes === 1 ? "ação urgente" : "ações urgentes"}. Comece por esta.`
              : "Nenhuma urgência. Este é o próximo da fila."}
          </p>
        </div>
        <div className="flex gap-4 text-right">
          <Metrica valor={resumo.total} rotulo="na fila" />
          <Metrica valor={resumo.urgentes} rotulo="urgentes" alerta={resumo.urgentes > 0} />
          <Metrica valor={resumo.viagens} rotulo="viagens" />
        </div>
      </div>

      {/* Card principal — renderiza conforme o tipo */}
      {item.tipo === "venda" && <CardVenda item={item} cliente={cliente} acoes={acoes} toast={toast} />}
      {item.tipo === "viagem" && <CardViagem item={item} cliente={cliente} acoes={acoes} toast={toast} />}
      {item.tipo === "prospeccao" && <CardProspeccao item={item} acoes={acoes} toast={toast} />}

      {/* Fila restante */}
      {fila.length > 1 && (
        <div>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Depois deste</p>
          <div className="space-y-2">
            {fila.slice(1, 8).map((i) => {
              const IcTipo = ICONE_TIPO[i.tipo];
              return (
                <button key={i.id} onClick={() => setSelecionado(i.id)}
                  className="flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-slate-200 transition hover:ring-blue-300">
                  <IcTipo size={15} className={`flex-shrink-0 ${COR_TIPO[i.tipo]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{i.cliente.nome}</p>
                    <p className="truncate text-xs text-slate-500">
                      {ROTULO_TIPO[i.tipo]}
                      {i.negocio?.destino ? ` · ${i.negocio.destino}` : ""}
                      {" · "}{i.motivo}
                    </p>
                  </div>
                  <ChevronRight size={16} className="flex-shrink-0 text-slate-300" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   CARD DE VENDA — o que já existia
   ============================================================ */

function CardVenda({ item, cliente: clienteDe, acoes, toast }) {
  const n = item.negocio;
  const c = item.cliente;
  const r = ROTEIRO[n.etapa_funil];
  const { feitos, total, pendentes } = progressoEtapa(n);
  const passo = proximoPasso(n);
  const script = r.script({ ...n, nome: c?.nome });
  const dias = diasAte(n.data_ida);
  const atrasado = slaEstourado(n);
  const podeAvancar = pendentes.length === 0 && r.proxima;
  const travado = r.proxima === "Montando Proposta" && !qualificacaoCompleta(n);

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <Faixa motivo={item.motivo} urgente={atrasado} icone={Flame} iconeNormal={Clock} />

      <div className="p-6">
        <CabecalhoCliente c={c} n={n} acoes={acoes} etiqueta={n.etapa_funil} cor={PONTO_ETAPA[n.etapa_funil]} />

        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 grid-cols-2 sm:grid-cols-4">
          <Dado icone={MapPin} rotulo="Destino" valor={n.destino || "—"} faltando={!n.destino} />
          <Dado icone={Calendar} rotulo="Ida" valor={n.data_ida ? fmtData(n.data_ida) : "—"}
            extra={dias !== null && dias >= 0 ? `em ${dias}d` : null} faltando={!n.data_ida} />
          <Dado icone={Users} rotulo="Pessoas" valor={n.num_pessoas || "—"} />
          <Dado icone={Wallet} rotulo="Orçamento" valor={fmtMoeda(Number(n.orcamento))} faltando={!Number(n.orcamento)} />
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold text-slate-900">{r.objetivo}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{r.porque}</p>
        </div>

        <Passos passos={r.passos} negocio={n} proximoPasso={passo} acoes={acoes} feitos={feitos} total={total} />

        {r.dica && <Dica texto={r.dica} />}

        <BlocoScript script={script} whatsapp={c?.whatsapp} onEnviar={() => acoes.registrarContato(n.id)} toast={toast} />

        {n.etapa_funil === "Negociação" && <Objecoes negocio={{ ...n, nome: c?.nome }} toast={toast} />}
      </div>

      <BarraAcaoVenda n={n} c={c} r={r} acoes={acoes} toast={toast}
        podeAvancar={podeAvancar} pendentes={pendentes} travado={travado} />
    </div>
  );
}

/* ============================================================
   CARD DE VIAGEM — pós-venda: marcos, fornecedores, pagamento
   ============================================================ */

function CardViagem({ item, cliente: clienteDe, acoes, toast }) {
  const n = item.negocio;
  const c = item.cliente;
  const marco = item.marco;
  const fase = item.fase;
  const { feitos, total } = progressoJornada(n);
  const marcos = marcosDaViagem(n);
  const feitsObj = n.checklist_jornada || {};
  const dias = diasAte(n.data_ida);
  const fornAtrasado = temFornecedorAtrasado(n);
  const pagPendente = n.status_pagamento !== "Pago";
  const urgente = item.camada === 0;

  const msgDoMarco = marco.mensagem && !marco.interno ? marco.mensagem(n, c) : null;

  // Verifica trava
  const trava = marco.trava?.(n) || null;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <Faixa motivo={item.motivo} urgente={urgente} icone={Plane} iconeNormal={Plane} />

      <div className="p-6">
        <CabecalhoCliente c={c} n={n} acoes={acoes} etiqueta={fase} cor={COR_FASE[fase]} />

        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 grid-cols-2 sm:grid-cols-4">
          <Dado icone={MapPin} rotulo="Destino" valor={n.destino} />
          <Dado icone={Calendar} rotulo="Ida" valor={fmtData(n.data_ida)} extra={dias > 0 ? `em ${dias}d` : dias === 0 ? "hoje" : null} />
          <Dado icone={Calendar} rotulo="Volta" valor={fmtData(n.data_volta)} />
          <Dado icone={Wallet} rotulo="Venda" valor={fmtMoeda(Number(n.valor_venda))} />
        </div>

        {/* Alertas operacionais */}
        {(fornAtrasado || pagPendente) && (
          <div className="mt-4 space-y-2">
            {fornAtrasado && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                <span><strong>Fornecedor atrasado.</strong> {n.fornecedores.filter((f) => f.status === "Solicitado").map((f) => f.nome).join(", ")} sem confirmar.</span>
              </div>
            )}
            {pagPendente && (
              <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 ring-1 ring-rose-200">
                <Lock size={14} className="mt-0.5 flex-shrink-0" />
                <span><strong>Pagamento {n.status_pagamento.toLowerCase()}.</strong> Não emita bilhete enquanto não estiver 100% pago.</span>
              </div>
            )}
          </div>
        )}

        {/* Marco atual */}
        <div className="mt-6">
          <p className="text-sm font-semibold text-slate-900">{marco.titulo}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{marco.porque}</p>
        </div>

        {trava && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 ring-1 ring-rose-200">
            <Lock size={14} className="mt-0.5 flex-shrink-0" />
            <div>
              <strong>Este passo está travado:</strong>
              <ul className="mt-1 list-disc pl-4">{trava.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          </div>
        )}

        {/* Lista de marcos da fase */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Marcos desta fase</p>
            <span className="text-xs text-slate-400">{feitos} de {total}</span>
          </div>
          <div className="space-y-1">
            {marcos.map((m) => {
              const ok = feitsObj[m.id];
              const atual = marco && m.id === marco.id;
              return (
                <button key={m.id}
                  onClick={() => acoes.marcarMarco(n.id, m.id, !ok)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${atual ? "bg-violet-50 ring-1 ring-violet-200" : "hover:bg-slate-50"}`}>
                  {ok
                    ? <CheckCircle2 size={17} className="flex-shrink-0 text-emerald-500" />
                    : <Circle size={17} className={`flex-shrink-0 ${atual ? "text-violet-600" : "text-slate-300"}`} />}
                  <span className={`flex-1 text-sm ${ok ? "text-slate-400 line-through" : atual ? "font-medium text-slate-900" : "text-slate-600"}`}>
                    {m.titulo}
                  </span>
                  {m.interno && <span className="text-xs text-slate-400">interno</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Script para o cliente (se não for passo interno) */}
        {msgDoMarco && !trava && <BlocoScript script={msgDoMarco} whatsapp={c?.whatsapp} onEnviar={() => acoes.registrarContato(n.id)} toast={toast} />}
      </div>

      {/* Barra de ação */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
        <button onClick={() => { acoes.registrarContato(n.id); toast(`Contato registrado.`, "ok"); }}
          className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">
          <Check size={14} /> Falei com ele
        </button>
        <Adiar onAdiar={(d) => acoes.adiar(n.id, d)} />
        <button onClick={() => acoes.abrirEdicao(n)}
          className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50">
          <Pencil size={13} /> Editar / Fornecedores
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   CARD DE PROSPECÇÃO — base antiga, reativação, aniversário
   ============================================================ */

function CardProspeccao({ item, acoes, toast }) {
  const c = item.cliente;
  const g = item.gatilho;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-2 bg-rose-50 px-6 py-3 text-sm text-rose-800">
        <Heart size={15} />
        <span className="font-medium">{item.motivo}</span>
      </div>

      <div className="p-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{c.nome}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {c.whatsapp} · veio do {c.origem}
          </p>
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold text-slate-900">{g.titulo}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{g.porque}</p>
        </div>

        <BlocoScript script={item.mensagem} whatsapp={c.whatsapp}
          onEnviar={() => acoes.marcarProspeccao(c.id, g.id)} toast={toast} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
        <button onClick={() => { acoes.marcarProspeccao(c.id, g.id); toast(`${primeiroNome(c.nome)} marcado como contatado.`, "ok"); }}
          className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">
          <Check size={14} /> Feito, mandei
        </button>
        <button onClick={() => { acoes.adiarCliente(c.id, 30); toast("Guardado para o mês que vem.", "ok"); }}
          className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">
          <Clock size={14} /> Não agora
        </button>
        <button onClick={() => { acoes.marcarProspeccao(c.id, g.id); toast("Descartado.", "ok"); }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-600">
          <ThumbsDown size={14} /> Ignorar este gatilho
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   COMPONENTES COMPARTILHADOS
   ============================================================ */

function Faixa({ motivo, urgente, icone: IcUrgente, iconeNormal: IcNormal }) {
  return (
    <div className={`flex items-center gap-2 px-6 py-3 text-sm ${urgente ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-800"}`}>
      {urgente ? <IcUrgente size={15} /> : <IcNormal size={15} />}
      <span className="font-medium">{motivo}</span>
    </div>
  );
}

function CabecalhoCliente({ c, n, acoes, etiqueta, cor }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${cor}`} />
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{etiqueta}</span>
          <span className="text-xs text-slate-400">· falou {rotuloTempo(n.ultima_interacao)}</span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{c?.nome}</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {c?.whatsapp} · veio do {c?.origem}
          {n.motivo_viagem ? ` · ${n.motivo_viagem}` : ""}
        </p>
      </div>
      <button onClick={() => acoes.abrirEdicao(n)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50">
        <Pencil size={13} /> Editar dados
      </button>
    </div>
  );
}

function BlocoScript({ script, whatsapp, onEnviar, toast }) {
  return (
    <div className="mt-5 rounded-xl border border-slate-200 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">O que dizer agora</p>
      <p className="text-sm leading-relaxed text-slate-700">{script}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={linkWhats(whatsapp, script)} target="_blank" rel="noreferrer"
          onClick={onEnviar}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700">
          <MessageCircle size={14} /> Abrir no WhatsApp
        </a>
        <button onClick={() => { navigator.clipboard?.writeText(script); toast("Mensagem copiada.", "ok"); }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
          <Copy size={14} /> Copiar
        </button>
      </div>
    </div>
  );
}

function Passos({ passos, negocio, proximoPasso: passo, acoes, feitos, total }) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Faça nesta ordem</p>
        <span className="text-xs text-slate-400">{feitos} de {total}</span>
      </div>
      <div className="space-y-1">
        {passos.map((p) => {
          const ok = passoConcluido(negocio, p);
          const atual = passo && p.id === passo.id;
          return (
            <button key={p.id}
              onClick={() => { if (p.campo && !ok) { acoes.abrirEdicao(negocio); return; } acoes.marcarPasso(negocio.id, p.id, !ok); }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${atual ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"}`}>
              {ok ? <CheckCircle2 size={17} className="flex-shrink-0 text-emerald-500" />
                : <Circle size={17} className={`flex-shrink-0 ${atual ? "text-blue-600" : "text-slate-300"}`} />}
              <span className={`flex-1 text-sm ${ok ? "text-slate-400 line-through" : atual ? "font-medium text-slate-900" : "text-slate-600"}`}>{p.texto}</span>
              {p.campo && !ok && <span className="text-xs text-blue-600">preencher</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Dica({ texto }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
      <Lightbulb size={14} className="mt-0.5 flex-shrink-0" /><span>{texto}</span>
    </div>
  );
}

function BarraAcaoVenda({ n, c, r, acoes, toast, podeAvancar, pendentes, travado }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
      <button onClick={() => { acoes.registrarContato(n.id); toast(`Contato com ${primeiroNome(c?.nome || "")} registrado.`, "ok"); }}
        className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">
        <Check size={14} /> Falei com ele
      </button>
      <Adiar onAdiar={(d) => acoes.adiar(n.id, d)} />
      <button onClick={() => acoes.marcarPerdido(n)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-600">
        <ThumbsDown size={14} /> Perdi este
      </button>
      <div className="ml-auto flex items-center gap-3">
        {!podeAvancar && r.proxima && (
          <span className="text-xs text-slate-400">
            {travado ? `Faltam: ${camposFaltando(n).join(", ")}` : `Faltam ${pendentes.length} ${pendentes.length === 1 ? "passo" : "passos"}`}
          </span>
        )}
        {r.proxima && (
          <button disabled={!podeAvancar} onClick={() => acoes.concluirEtapa(n)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">
            Avançar para {r.proxima} <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

function Metrica({ valor, rotulo, alerta }) {
  return (
    <div>
      <p className={`text-lg font-semibold ${alerta ? "text-amber-600" : "text-slate-800"}`}>{valor}</p>
      <p className="text-xs text-slate-400">{rotulo}</p>
    </div>
  );
}

function Dado({ icone: Icone, rotulo, valor, extra, faltando }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs text-slate-400"><Icone size={12} /> {rotulo}</p>
      <p className={`mt-0.5 truncate text-sm font-medium ${faltando ? "text-rose-500" : "text-slate-800"}`}>
        {faltando ? "falta" : valor}
        {extra && <span className="ml-1 text-xs font-normal text-slate-400">{extra}</span>}
      </p>
    </div>
  );
}

function Adiar({ onAdiar }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setAberto((a) => !a)}
        className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">
        <Clock size={14} /> Adiar
      </button>
      {aberto && (
        <div className="absolute bottom-full left-0 z-10 mb-2 w-40 overflow-hidden rounded-lg bg-white py-1 shadow-lg ring-1 ring-slate-200">
          {[{ d: 1, t: "Amanhã" }, { d: 3, t: "Em 3 dias" }, { d: 7, t: "Na semana que vem" }, { d: 30, t: "Em 1 mês" }].map((o) => (
            <button key={o.d} onClick={() => { onAdiar(o.d); setAberto(false); }}
              className="block w-full px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50">{o.t}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function Objecoes({ negocio, toast }) {
  const [aberta, setAberta] = useState(null);
  return (
    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-700">O que ele te disse?</p>
      <p className="mb-3 text-xs text-amber-800">Clique na objeção para ver a leitura e a resposta.</p>
      <div className="flex flex-wrap gap-2">
        {OBJECOES.map((o) => (
          <button key={o.id} onClick={() => setAberta(aberta === o.id ? null : o.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${aberta === o.id ? "bg-amber-600 text-white" : "bg-white text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100"}`}>
            {o.titulo}
          </button>
        ))}
      </div>
      {aberta && (() => {
        const o = OBJECOES.find((x) => x.id === aberta);
        const texto = o.resposta(negocio);
        return (
          <div className="mt-3 rounded-lg bg-white p-3 ring-1 ring-amber-200">
            <p className="text-xs font-medium text-amber-700">{o.leitura}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{texto}</p>
            <button onClick={() => { navigator.clipboard?.writeText(texto); toast("Resposta copiada.", "ok"); }}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
              <Copy size={12} /> Copiar resposta
            </button>
          </div>
        );
      })()}
    </div>
  );
}
