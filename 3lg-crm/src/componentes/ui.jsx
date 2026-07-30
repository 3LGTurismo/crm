import React from "react";
import { X, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";

export function Campo({ label, valor, onChange, placeholder, tipo = "text", dica }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input
        type={tipo}
        value={valor ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      {dica && <span className="mt-1 block text-xs text-slate-400">{dica}</span>}
    </label>
  );
}

export function AreaTexto({ label, valor, onChange, placeholder, linhas = 3 }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <textarea
        rows={linhas}
        value={valor ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

export function Seletor({ label, valor, onChange, opcoes, vazio }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <select
        value={valor ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {vazio && <option value="">{vazio}</option>}
        {opcoes.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Secao({ titulo, children }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{titulo}</p>
      {children}
    </div>
  );
}

export function Toasts({ itens, remover }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-96 max-w-full flex-col gap-3">
      {itens.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-xl border-l-4 bg-white p-4 shadow-xl ring-1 ring-slate-900/5 ${
            t.tipo === "erro" ? "border-rose-500" : t.tipo === "ia" ? "border-blue-600" : "border-emerald-500"
          }`}
        >
          <div className="mt-0.5">
            {t.tipo === "erro" ? (
              <AlertTriangle size={18} className="text-rose-500" />
            ) : t.tipo === "ia" ? (
              <Sparkles size={18} className="text-blue-600" />
            ) : (
              <CheckCircle2 size={18} className="text-emerald-500" />
            )}
          </div>
          <p className="flex-1 text-sm leading-snug text-slate-700">{t.msg}</p>
          <button onClick={() => remover(t.id)} className="text-slate-400 hover:text-slate-600" aria-label="Fechar aviso">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
