import React, { useRef } from "react";
import { Sparkles, TrendingUp, Power, Activity, RefreshCw, Clock, Trash2, Download, Upload } from "lucide-react";
import { fmtHora } from "../lib/dominio.js";

export default function ComandoIA({ estado, acoes }) {
  const inputArquivo = useRef(null);
  const conta = (nome) => estado.logs.filter((l) => l.nome_agente === nome).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-5 pb-24 md:p-8">
      <div className="grid gap-4 md:grid-cols-2">
        <CartaoAgente
          nome="Agente de Marketing"
          papel="Nutrição e reputação"
          ligado={estado.agentes.marketing}
          onToggle={() => acoes.alternarAgente("marketing")}
          acoes={conta("Agente de Marketing")}
          icone={Sparkles}
          regras={[
            "Vigia clientes parados em Qualificação além do prazo da etapa.",
            "Sugere dica de viagem sobre o destino, sem falar de preço.",
            "Cobra o pedido de avaliação no Google depois da venda.",
          ]}
        />
        <CartaoAgente
          nome="Agente de Vendas"
          papel="Velocidade, follow-up e fechamento"
          ligado={estado.agentes.vendas}
          onToggle={() => acoes.alternarAgente("vendas")}
          acoes={conta("Agente de Vendas")}
          icone={TrendingUp}
          regras={[
            "Alerta quando um lead novo passa de 1h sem resposta.",
            "Cobra follow-up de proposta no silêncio.",
            "Gera o script de fechamento quando entra em Negociação.",
          ]}
        />
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={acoes.verificarAgora}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <RefreshCw size={15} /> Verificar prazos agora
          </button>
          <button
            onClick={acoes.envelhecer}
            className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          >
            <Clock size={15} /> Simular 48h para testar
          </button>
          <button
            onClick={acoes.exportar}
            className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          >
            <Download size={15} /> Baixar backup
          </button>
          <button
            onClick={() => inputArquivo.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          >
            <Upload size={15} /> Restaurar backup
          </button>
          <input
            ref={inputArquivo}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const arq = e.target.files?.[0];
              if (arq) acoes.importar(arq);
              e.target.value = "";
            }}
          />
          <button
            onClick={acoes.restaurarDemo}
            className="ml-auto flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 size={15} /> Apagar tudo e voltar à demonstração
          </button>
        </div>
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-400">
          Os dados ficam neste navegador. Baixe o backup toda semana — se você limpar o navegador ou trocar de computador, o histórico vai
          junto. Isso deixa de ser necessário quando o banco sair para o servidor.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl bg-slate-900 shadow-lg">
        <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3">
          <Activity size={15} className="text-emerald-400" />
          <p className="text-sm font-medium text-slate-200">O que os agentes fizeram</p>
          <span className="ml-auto font-mono text-xs text-slate-500">{estado.logs.length} eventos</span>
        </div>
        <div className="max-h-96 overflow-y-auto p-5 font-mono text-xs leading-relaxed">
          {estado.logs.map((l) => (
            <div key={l.id} className="flex gap-3 border-b border-slate-800/60 py-2 last:border-0">
              <span className="flex-shrink-0 text-slate-600">{fmtHora(l.timestamp)}</span>
              <span
                className={`w-40 flex-shrink-0 ${
                  l.nome_agente === "Agente de Marketing"
                    ? "text-sky-400"
                    : l.nome_agente === "Agente de Vendas"
                    ? "text-emerald-400"
                    : "text-slate-500"
                }`}
              >
                {l.nome_agente}
              </span>
              <span className="flex-1 text-slate-300">{l.acao_realizada}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CartaoAgente({ nome, papel, ligado, onToggle, acoes, regras, icone: Icone }) {
  return (
    <div className={`rounded-xl bg-white p-5 shadow-sm ring-1 transition ${ligado ? "ring-blue-200" : "ring-slate-200"}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${ligado ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>
          <Icone size={18} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">{nome}</p>
          <p className="text-xs text-slate-500">{papel}</p>
        </div>
        <button
          onClick={onToggle}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            ligado ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          <Power size={13} /> {ligado ? "Ligado" : "Desligado"}
        </button>
      </div>

      <ul className="mt-4 space-y-1.5">
        {regras.map((r) => (
          <li key={r} className="flex gap-2 text-xs leading-snug text-slate-600">
            <span className={`mt-1.5 h-1 w-1 flex-shrink-0 rounded-full ${ligado ? "bg-blue-500" : "bg-slate-300"}`} />
            {r}
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
        {acoes} {acoes === 1 ? "ação registrada" : "ações registradas"}
      </p>
    </div>
  );
}
