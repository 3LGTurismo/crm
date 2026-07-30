import React, { useState } from "react";
import { X, Lock, Plus, Trash2, AlertTriangle, Package } from "lucide-react";
import { Campo, Seletor, Secao, AreaTexto } from "./ui.jsx";
import { TIPOS_VIAGEM, ORIGENS, MOTIVOS_PERDA, camposFaltando, uid } from "../lib/dominio.js";
import { STATUS_PAGAMENTO, STATUS_FORNECEDOR, fornecedorAtrasado } from "../lib/jornada.js";

export default function ModalNegocio({ modo, negocio, cliente, onSalvar, onExcluir, onFechar }) {
  const [f, setF] = useState({
    id: negocio?.id || null,
    cliente_id: negocio?.cliente_id || null,
    nome: cliente?.nome || "",
    whatsapp: cliente?.whatsapp || "",
    email: cliente?.email || "",
    origem: cliente?.origem || "WhatsApp",
    destino: negocio?.destino || "",
    data_ida: negocio?.data_ida || "",
    data_volta: negocio?.data_volta || "",
    num_pessoas: negocio?.num_pessoas || 2,
    orcamento: negocio?.orcamento || "",
    tipo: negocio?.tipo || "Pacote nacional",
    motivo_viagem: negocio?.motivo_viagem || "",
    notas: negocio?.notas || "",
    motivo_perda: negocio?.motivo_perda || "",
    valor_venda: negocio?.valor_venda || "",
    comissao: negocio?.comissao || "",
    status_pagamento: negocio?.status_pagamento || "Pendente",
    fornecedores: negocio?.fornecedores || [],
  });

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const faltando = camposFaltando(f);
  const podeSalvar = f.nome.trim().length > 1;
  const eFechado = negocio?.etapa_funil === "Fechado";

  const addFornecedor = () =>
    set("fornecedores", [...f.fornecedores, { id: uid(), nome: "", tipo: "Hospedagem", status: "Solicitado" }]);

  const setFornecedor = (id, campo, valor) =>
    set("fornecedores", f.fornecedores.map((x) => (x.id === id ? { ...x, [campo]: valor } : x)));

  const rmFornecedor = (id) => set("fornecedores", f.fornecedores.filter((x) => x.id !== id));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4" onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{modo === "novo" ? "Novo lead" : "Dados do negócio"}</h2>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600" aria-label="Fechar"><X size={18} /></button>
        </div>

        <div className="space-y-5 p-6">
          <Secao titulo="Cliente">
            <Campo label="Nome" valor={f.nome} onChange={(v) => set("nome", v)} placeholder="Nome do cliente" />
            <div className="grid grid-cols-2 gap-3">
              <Campo label="WhatsApp" valor={f.whatsapp} onChange={(v) => set("whatsapp", v)} placeholder="11 90000-0000" />
              <Seletor label="Origem" valor={f.origem} onChange={(v) => set("origem", v)} opcoes={ORIGENS} />
            </div>
            <Campo label="E-mail" valor={f.email} onChange={(v) => set("email", v)} placeholder="cliente@email.com" tipo="email" />
          </Secao>

          <Secao titulo="Viagem">
            <div className="grid grid-cols-2 gap-3">
              <Seletor label="Tipo" valor={f.tipo} onChange={(v) => set("tipo", v)} opcoes={TIPOS_VIAGEM} />
              <Campo label="Destino" valor={f.destino} onChange={(v) => set("destino", v)} placeholder="Ex.: Porto Seguro" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Data de ida" valor={f.data_ida} onChange={(v) => set("data_ida", v)} tipo="date" />
              <Campo label="Data de volta" valor={f.data_volta} onChange={(v) => set("data_volta", v)} tipo="date" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Pessoas" valor={f.num_pessoas} onChange={(v) => set("num_pessoas", v)} tipo="number" />
              <Campo label="Orçamento (R$)" valor={f.orcamento} onChange={(v) => set("orcamento", v)} tipo="number" placeholder="0" />
            </div>
            <Campo label="Motivo da viagem" valor={f.motivo_viagem} onChange={(v) => set("motivo_viagem", v)}
              placeholder="Lua de mel, férias com os filhos, aniversário..."
              dica="O motivo é o que faz a proposta parecer feita para ele." />
          </Secao>

          {eFechado && (
            <Secao titulo="Venda e financeiro">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Campo label="Valor da venda" valor={f.valor_venda} onChange={(v) => set("valor_venda", v)} tipo="number" />
                <Campo label="Sua comissão" valor={f.comissao} onChange={(v) => set("comissao", v)} tipo="number"
                  dica="Vai para o Google Ads." />
                <Seletor label="Pagamento" valor={f.status_pagamento}
                  onChange={(v) => set("status_pagamento", v)} opcoes={STATUS_PAGAMENTO} />
              </div>
              {f.status_pagamento !== "Pago" && (
                <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 ring-1 ring-rose-200">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                  Não emita bilhete enquanto o pagamento não estiver 100% confirmado.
                </div>
              )}
            </Secao>
          )}

          {eFechado && (
            <Secao titulo="Fornecedores (operação interna)">
              {f.fornecedores.length === 0 && (
                <p className="text-xs text-slate-400">Nenhum fornecedor cadastrado. Adicione hotel, aéreo, traslado, etc.</p>
              )}
              <div className="space-y-2">
                {f.fornecedores.map((fx) => {
                  const atrasado = f.data_ida && fornecedorAtrasado(fx, Math.round((new Date(f.data_ida + "T12:00:00") - Date.now()) / 864e5));
                  return (
                    <div key={fx.id} className={`flex flex-wrap items-center gap-2 rounded-lg p-3 ring-1 ${atrasado ? "bg-amber-50 ring-amber-300" : "bg-slate-50 ring-slate-200"}`}>
                      <input value={fx.nome} placeholder="Nome" onChange={(e) => setFornecedor(fx.id, "nome", e.target.value)}
                        className="flex-1 min-w-[120px] rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500" />
                      <select value={fx.tipo} onChange={(e) => setFornecedor(fx.id, "tipo", e.target.value)}
                        className="rounded border border-slate-300 bg-white px-2 py-1.5 text-xs">
                        {["Hospedagem", "Aéreo", "Traslado", "Passeio", "Seguro", "Outro"].map((t) => <option key={t}>{t}</option>)}
                      </select>
                      <select value={fx.status} onChange={(e) => setFornecedor(fx.id, "status", e.target.value)}
                        className={`rounded border px-2 py-1.5 text-xs font-medium ${
                          fx.status === "Voucher recebido" ? "border-emerald-300 bg-emerald-50 text-emerald-700" :
                          fx.status === "Confirmado" ? "border-blue-300 bg-blue-50 text-blue-700" :
                          "border-amber-300 bg-amber-50 text-amber-700"
                        }`}>
                        {STATUS_FORNECEDOR.map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <button onClick={() => rmFornecedor(fx.id)} className="text-slate-300 hover:text-rose-500" aria-label="Remover"><Trash2 size={14} /></button>
                      {atrasado && <span className="w-full text-xs font-medium text-amber-700">⚠ Atrasado — cobre confirmação agora</span>}
                    </div>
                  );
                })}
              </div>
              <button onClick={addFornecedor}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-blue-600 ring-1 ring-blue-200 hover:bg-blue-50">
                <Plus size={14} /> Adicionar fornecedor
              </button>
            </Secao>
          )}

          {negocio?.etapa_funil === "Perdido" && (
            <Secao titulo="Perda">
              <Seletor label="Motivo da perda" valor={f.motivo_perda} onChange={(v) => set("motivo_perda", v)}
                opcoes={MOTIVOS_PERDA} vazio="Selecione o motivo" />
            </Secao>
          )}

          <Secao titulo="Anotações">
            <AreaTexto valor={f.notas} onChange={(v) => set("notas", v)} placeholder="O que o cliente falou, preferências, restrições..." />
          </Secao>

          {faltando.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-snug text-amber-800 ring-1 ring-amber-200">
              <Lock size={14} className="mt-0.5 flex-shrink-0" />
              <span>Faltam <strong>{faltando.join(", ")}</strong> para liberar a etapa "Montando Proposta".</span>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center gap-3 border-t border-slate-200 bg-white px-6 py-4">
          {modo === "editar" && (
            <button onClick={() => onExcluir(f.id)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">Excluir</button>
          )}
          <button onClick={onFechar} className="ml-auto rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button disabled={!podeSalvar} onClick={() => onSalvar(f)}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">Salvar</button>
        </div>
      </div>
    </div>
  );
}
