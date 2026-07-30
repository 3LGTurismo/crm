/* ============================================================
   Único ponto de contato com o armazenamento.
   Hoje: localStorage. Fase 2: Supabase — troque só o corpo
   destas duas funções e nada mais no app precisa mudar.
   ============================================================ */

const CHAVE = "crm3lg:estado:v2";

export async function carregarEstado() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) return JSON.parse(bruto);
  } catch (e) {
    console.warn("Não foi possível ler os dados salvos. Iniciando base nova.", e);
  }
  return null;
}

export async function salvarEstado(estado) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
  } catch (e) {
    console.warn("Não foi possível salvar. A sessão continua em memória.", e);
  }
}

export function exportarBackup(estado) {
  const blob = new Blob([JSON.stringify(estado, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `backup-crm-3lg-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importarBackup(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      try {
        resolve(JSON.parse(leitor.result));
      } catch (e) {
        reject(new Error("Arquivo inválido. Selecione um backup gerado por este CRM."));
      }
    };
    leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    leitor.readAsText(arquivo);
  });
}
