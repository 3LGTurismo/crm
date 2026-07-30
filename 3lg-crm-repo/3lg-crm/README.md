# CRM 3LG Turismo

CRM de operador único para a 3LG Turismo. Não é um quadro para você administrar —
é uma tela que diz **com quem falar agora e o que dizer**.

> **Repositório privado.** Contém dados operacionais da agência. Não tornar público.

## A ideia

Kanban é ferramenta de gerente olhando time. Aqui não tem time: tem o Leonardo.
Então a tela principal é a **Agora**: um cliente por vez, o motivo de ele estar no topo,
o próximo passo e a mensagem pronta. O funil continua existindo, mas como visão de apoio.

## Rodar

```bash
npm install
npm run dev
```

## Testar

```bash
npm test          # 59 testes de regra de negócio
npm run check     # testes + build de produção
```

Rode `npm test` sempre antes de subir código. O `npm run check` roda os testes
e depois compila — se qualquer um falhar, o comando para.

## Mobile

A interface funciona no celular. No desktop, a navegação fica na sidebar esquerda.
No celular, a sidebar some e aparece uma barra de navegação na parte inferior da tela.
As telas, modais e botões estão adaptados para toque.

## Telas

| Tela | Para quê |
|------|----------|
| **Agora** | A fila do dia. Um cliente, um passo, uma mensagem. É onde você trabalha. |
| **Funil** | Visão geral em Kanban, com a regra de bloqueio da proposta. |
| **Tarefas do dia** | O que os agentes criaram enquanto você não estava olhando. |
| **Centro de Comando IA** | Log dos agentes, liga/desliga, backup. |

## As regras que valem dinheiro

**Regra de bloqueio.** Nenhum negócio entra em "Montando Proposta" sem destino, data de
ida e orçamento. Vale no arraste do Kanban e no botão de avançar da tela Agora.

**SLA dinâmico.** Prazo fixo de 48h trata igual quem viaja em 20 dias e quem viaja em
10 meses — o primeiro perde a viagem, o segundo se sente perseguido. O prazo nasce da
distância até a data de ida, ajustado pela etapa. Lead novo: 1 hora.

**Fila de prioridade.** Lead sem contato vem sempre primeiro (velocidade de resposta é o
fator que mais muda resultado). Depois, todo mundo que estourou o prazo. Só então quem
está em dia. Comissão é desempate, nunca fator principal.

**Uma tarefa por gatilho.** Enquanto a tarefa estiver pendente, o agente não cria outra
igual. Sem isso, você acorda com 40 alertas repetidos e desliga o sistema.

## Agentes

**Agente de Marketing** — nutre e cuida da reputação. Vigia Qualificação parada, sugere
dica de viagem sem falar de preço, e cobra o pedido de avaliação no Google depois da venda.

**Agente de Vendas** — velocidade e fechamento. Alerta lead novo passando de 1h, cobra
follow-up de proposta no silêncio, gera script de fechamento por faixa de orçamento na
entrada em Negociação.

## Estrutura

```
src/
  lib/
    dominio.js        Etapas, roteiro de vendas, scripts, objeções, utilitários
    motor.js          SLA, fila de prioridade, agentes (funções puras)
    persistencia.js   Único ponto de contato com o armazenamento
    dadosIniciais.js  Base de demonstração
  telas/              Agora, Funil, Tarefas, ComandoIA
  componentes/        Modal, campos, avisos
```

O conhecimento de vendas mora em `dominio.js` (ROTEIRO, OBJECOES, scripts). Mudou o jeito
de vender? Mexe lá, e só lá. As telas não sabem nada sobre vendas.

`motor.js` é feito de funções puras: recebem o estado, devolvem tarefas e logs. Isso existe
para que os agentes possam virar um cron no servidor sem reescrita.

## Limites de hoje

Os dados ficam no `localStorage` deste navegador. Portanto: os agentes só rodam com a aba
aberta, e a base não acompanha você no celular. **Baixe o backup toda semana** pelo Centro
de Comando IA. Ambos os limites caem na Fase 2.

## Publicar na Vercel

Importe o repositório em vercel.com. Ela detecta o Vite sozinha (`npm run build` → `dist`).
Cada push na `main` publica.

Para usar `crm.3lg.com.br`: adicione o domínio na Vercel e crie no Zone Editor do cPanel:

| Tipo  | Nome | Valor                |
|-------|------|----------------------|
| CNAME | crm  | cname.vercel-dns.com |

O site em `www.3lg.com.br` continua no HostGator, intocado.

## Roteiro

- [x] **Fase 0** — Funil, regra de bloqueio, agentes.
- [x] **Fase 1** — Modo guiado: fila, SLA dinâmico, roteiro por etapa, objeções, motivo de perda, comissão.
- [ ] **Fase 2** — Supabase. Base fora do navegador, agentes em cron, acesso pelo celular.
- [ ] **Fase 3** — Captura de lead pelo site com `gclid` + conversão offline para o Google Ads (conta 7735794813), usando comissão como valor.
- [ ] **Fase 4** — WhatsApp Cloud API com a conversa dentro do card.
- [ ] **Fase 5** — IA lendo o histórico real para qualificar e escrever a mensagem.
