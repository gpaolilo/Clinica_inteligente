# Documentação Completa de APIs e Funcionalidades da Plataforma

Este documento fornece um mapeamento exaustivo de todas as **APIs externas e internas** integradas ao sistema, bem como a descrição detalhada das **funcionalidades principais** divididas por perfis de acesso (*Profissionais/Professores, Alunos/Pacientes e Administradores*).

---

## 1. APIs e Serviços Externos Integrados

### 1.1. Groq Cloud API
* **Base URL:** `https://api.groq.com/openai/v1`
* **Finalidade:** Inferência de modelos de linguagem de altíssima velocidade para geração de inteligência clínica e pedagógica.
* **Modelos Utilizados:** `qwen/qwen3.8-27b` (com fallback dinâmico para `openai/gpt-oss-120b` e outros modelos ativos).
* **Usos no Sistema:**
  * **Análise de Sessão de Aulas:** Extração estruturada (JSON) de erros gramaticais, lacunas de vocabulário, pontuação de fluência e padrões de aprendizado.
  * **Geração Adaptativa de Tarefas (Homework):** Construção automatizada de exercícios personalizados derivados dos erros reais da aula.
  * **Correção Inteligente de Redação:** Revisão frase a frase com explicações gramaticais em português e versão aprimorada.
  * **Simulador Conversacional de Cenários:** Chat interativo em inglês baseado em personas de situações reais (*Job Interview, Sales Pitch, Restaurant, Travel, etc.*).
  * **Avaliação de Desempenho em Cenários:** Scoring de fluência e gramática pós-prática.
  * **Evolução Clínica Psicanalítica:** Mascaramento de dados sensíveis (PII) e estruturação de prontuários clínicos.

---

### 1.2. AssemblyAI API
* **Base URL:** `https://api.assemblyai.com/v2`
* **Finalidade:** Transcrição de áudio para texto (*Speech-to-Text*) de alta precisão com suporte a múltiplos interlocutores.
* **Endpoints Utilizados:**
  * `POST https://api.assemblyai.com/v2/upload`: Upload de chunks ou arquivos de áudio gravados durante a sessão.
  * `POST https://api.assemblyai.com/v2/transcript`: Início do processo assíncrono de transcrição.
  * `GET https://api.assemblyai.com/v2/transcript/{id}`: Polling de status e recuperação de texto com marcação de falantes (*Speaker Diarization: Professor vs Aluno / Psicólogo vs Paciente*).

---

### 1.3. Supabase (BaaS / Backend-as-a-Service)
* **Componentes Utilizados:**
  * **PostgreSQL Database:** Armazenamento relacional completo com Row Level Security (RLS) estrito por `user_id` e papéis (*roles*).
  * **Supabase Auth:** Gerenciamento seguro de sessões, emissão de JWTs e autenticação de usuários.
  * **Supabase Storage:** Armazenamento de mídias de áudio gravadas, logotipos e identidades visuais personalizadas (*Brand Studio*).
  * **Database Functions & RPCs:** Funções transacionais no banco (ex.: `consume_teacher_credits`, `book_class`, `get_kpis`, `sync_user_role`).

---

### 1.4. Stripe API (Pagamentos, Assinaturas e Payouts)
* **SDK:** `stripe` (Node.js SDK) e `@stripe/connect-js` / `@stripe/react-connect-js` (Frontend).
* **Usos no Sistema:**
  * **Stripe Connect Express:** Criação de contas conectadas para professores e psicólogos receberem pagamentos diretamente com repasse automático.
  * **Stripe Checkout:** Checkout hospedado para venda de planos SaaS, pacotes de créditos de IA e recargas.
  * **Stripe Billing & Customer Portal:** Gestão de assinaturas ativas, upgrade/downgrade de planos e histórico de faturas.
  * **Stripe Webhooks:** Tratamento idempotente de eventos críticos (`checkout.session.completed`, `customer.subscription.*`, `account.updated`, `transfer.created`).

---

### 1.5. Google OAuth & Google Calendar API
* **Bibliotecas:** `@react-oauth/google`
* **Usos no Sistema:**
  * Login social rápido e seguro com conta Google.
  * Sincronização bidirecional de agendamentos e bloqueios na agenda com o Google Agenda.

---

## 2. Endpoints Internos da API (Vercel Serverless Functions)

Os endpoints do backend localizam-se em `apps/web/api/`:

```
apps/web/api/
├── _lib/                     # Utilitários compartilhados (Groq, Supabase, Motor de Créditos)
│   ├── credits.ts            # Gerenciamento e débito transacional de créditos de IA
│   ├── groq.ts               # Cliente Groq com seleção e fallback automático de modelos
│   └── supabase.ts           # Inicialização com credenciais de Service Role e Auth
│
├── student-engine/           # Motor de Inteligência para Aulas de Idiomas
│   ├── _transcribe.ts        # Aciona transcrição no AssemblyAI e salva no banco
│   ├── _analyze.ts           # Analisa a transcrição com IA e gera métricas pedagógicas
│   ├── _generate-homework.ts # Cria lições de casa hiper-personalizadas
│   ├── _evaluate-writing.ts  # Avalia redações e respostas de escrita dos alunos
│   └── _profile.ts           # Retorna perfil consolidado de proficiência do aluno
│
├── scenario-engine/          # Motor de Simulação Conversacional
│   ├── _chat.ts              # Interação conversacional dinâmica com IA para prática de cenários
│   └── _evaluate.ts          # Avaliação e pontuação final da conversa simulada
│
├── payments/                 # Motor Financeiro e Cobrança
│   ├── _checkout.ts          # Criação de sessões de checkout Stripe (Planos & Créditos)
│   ├── _connect.ts           # Onboarding, status e login no dashboard Stripe Express
│   ├── _saas.ts              # Gestão do plano SaaS do professor e portal do cliente
│   ├── _dashboard.ts         # Métricas financeiras e faturamento
│   ├── _rates.ts             # Taxas de serviço e precificação
│   └── _webhook.ts           # Receptor oficial de webhooks Stripe
│
├── dashboard/                # Gestão de Agenda e Indicadores
│   ├── _availability.ts      # Configuração de grade horária semanal e intervalos
│   ├── _calendar.ts          # Consulta de eventos de calendário e conflitos
│   ├── _google.ts            # Sincronização com o Google Calendar
│   └── _kpis.ts              # Indicadores operacionais do profissional
│
└── admin-action/             # Operações Administrativas
    └── index.ts              # Aprovação de professores, auditorias e gestão de planos
```

### Detalhamento dos Principais Endpoints

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/api/student-engine/transcribe` | Transcreve o áudio da aula e armazena os dados do diálogo na tabela `session_transcripts`. |
| `POST` | `/api/student-engine/analyze` | Executa inferência via Groq (`qwen/qwen3.8-27b`), identifica erros gramaticais e lacunas de vocabulário, debita 40 créditos de IA e gera os eventos da aula. |
| `POST` | `/api/student-engine/generate-homework` | Gera plano de lição de casa com seções selecionadas (Erros, Gramática, Vocabulário, Redação, Fala, Cenário, etc.) e debita 20 créditos. |
| `POST` | `/api/student-engine/evaluate-writing` | Recebe uma resposta escrita de aluno e retorna correções com regras gramaticais e sugestão nativa. |
| `POST` | `/api/scenario-engine/chat` | Mantém o fluxo de mensagens em inglês para o cenário selecionado (*ex.: Job Interview, Sales Pitch*). |
| `POST` | `/api/scenario-engine/evaluate` | Analisa toda a transcrição do cenário praticado, pontua gramática e fluência e grava em `scenario_sessions`. |
| `POST` | `/api/payments/checkout` | Cria sessão Stripe Checkout para aquisição de créditos ou assinatura de planos da plataforma. |
| `POST` | `/api/payments/connect` | Gera URL de integração para cadastro bancário de repasses via Stripe Express. |
| `POST` | `/api/payments/webhook` | Processa confirmações de pagamento e credita carteiras automaticamente. |

---

## 3. Funcionalidades Principais por Perfil de Usuário

### 3.1. Painel do Profissional / Professor (`/dashboard`)
1. **Estúdio de Sessão Ativa (`/session/:id`)**:
   * Gravador de áudio embutido com temporizador em tempo real e suporte a upload de áudio externo.
   * Transcrição instantânea com divisão de falantes.
   * **Modo Aluno**: Gera insights de aprendizado automatizados com 1 clique.
   * **Modo Paciente/Clínico**: Gera evolução clínica automática no padrão psicanalítico com proteção e mascaramento de PII.
   * Editor de prontuário / relatório final com salvamento contínuo.

2. **Gerenciador de Tarefas Adaptativas (Homework Manager)**:
   * Criação automatizada de lições de casa baseadas estritamente nos erros cometidos pelo aluno na aula.
   * Escolha de templates de foco (*Quick, Standard, Intensive, Business English, Speaking, Exam Prep*).
   * Seleção modular de seções (Correção de Erros, Vocabulário, Redação, Desafio de Fala, Cenários e Desafio Bônus de XP).
   * Status de publicação (*Draft*, *Assigned*, *Completed*).

3. **Gestão de Pacientes e Alunos (`/patients` & `/patients/:id`)**:
   * Ficha cadastral com tipo de cliente (*Aluno de Idiomas* ou *Paciente de Psicologia*).
   * Linha do tempo de sessões passadas com acesso a prontuários e métricas.
   * Visualizador consolidado de padrões de aprendizado e pontos fortes/fracos.

4. **Agenda Interativa & Disponibilidade (`/agenda` & `/availability`)**:
   * Calendário semanal e mensal com horários bloqueados e sessões confirmadas.
   * Configuração de horários de atendimento semanais recorrentes (dias da semana, horários de início e fim, duração da aula).
   * Sincronização direta com Google Calendar.

5. **Loja de Créditos de IA & Analytics (`/ai-credits` & `/ai-analytics`)**:
   * Saldo atual de créditos de IA com extrato transacional detalhado.
   * Compra de pacotes de créditos via Stripe Checkout (Pix e Cartão de Crédito).
   * Gráficos analíticos de consumo de IA por categoria (Análise de aula, Lições de Casa, Simulação de Cenários).

6. **Brand Studio (White-label & Academy) (`/brand-studio`)**:
   * Personalização da identidade visual da escola/clínica (Logotipo, cor primária e cor secundária).
   * URL personalizada com suporte a domínio ou subcaminho exclusivo (`/academy/:slug`).

7. **Financeiro e Repasses (`/finance`)**:
   * Acompanhamento de faturamento bruto, valores a receber e controle de inadimplência.
   * Conexão e gerenciamento bancário via Stripe Connect para recebimento direto de repasses.

---

### 3.2. Portal do Aluno / Cliente (`/client`)
1. **Dashboard do Aluno (`/client`)**:
   * Visão geral de próximas aulas, tarefas pendentes, sequência de dias estudando (*streak*) e pontuação de XP acumulada.

2. **Insights da Aula (`/client/insights`)**:
   * Relatório pós-aula com os tópicos abordados, resumo de desempenho, erros com correções explicadas e novas palavras aprendidas.

3. **Central de Lição de Casa (Homework Hub) (`/client/homework`)**:
   * Interface interativa para realização de exercícios atribuídos.
   * Sistema de Flashcards interativo com animação de flip para fixação de vocabulário.
   * Módulo de Redação com avaliação imediata da IA (identifica desvios gramaticais e sugere versões nativas).
   * Recompensa de XP ao concluir cada exercício.

4. **Simulador de Prática de Cenários (`/client/practice`)**:
   * Treinamento imersivo de conversação em situações reais da vida cotidiana e negócios.
   * Cenários disponíveis: Entrevista de Emprego, Reunião de Vendas, Restaurante, Aeroporto/Viagem, Conversa Casual.
   * Relatório de fluência e precisão gramatical ao encerrar a simulação.

5. **Banco de Vocabulário (`/client/vocabulary`)**:
   * Vocabulário pessoal salvo com frases de exemplo, tradução contextual e status de domínio.

6. **Agendamento de Aulas (`/client/book` & `/client/agenda`)**:
   * Autoatendimento para marcação de aulas nos horários vagos do professor com confirmação automática.

7. **Faturamento do Aluno (`/client/billing`)**:
   * Histórico de mensalidades pagas e faturas pendentes.

---

### 3.3. Painel de Administração e Gestão SaaS (`/admin`)
1. **Painel Geral de Controle (`/admin`)**:
   * Métricas globais da plataforma: faturamento recorrente (MRR), usuários totais e sessões realizadas.

2. **Rentabilidade e Monitoramento de Custos de IA (`/admin/profitability` & `/admin/features`)**:
   * Rastreamento em tempo real do custo unitário das APIs de IA (*Groq, OpenAI, AssemblyAI*) comparado à receita gerada por créditos.
   * Cálculo de margem bruta por funcionalidade.

3. **Gestão de Usuários e Aprovação de Professores (`/admin/users` & `/admin/teacher-requests`)**:
   * Fila de moderação para aprovar ou rejeitar novos cadastros de professores.
   * Gestão de papéis (*ADMIN, TEACHER, PSYCHOLOGIST, STUDENT, PATIENT*).

4. **Configuração de Planos e Preços (`/admin/plans`)**:
   * Criação e ajuste de planos de assinatura e precificação de pacotes de créditos.

5. **Logs de Notificações e Auditoria (`/admin/email-logs` & `/admin/alerts`)**:
   * Histórico de e-mails enviados e alertas de sistema.

---

## 4. Arquitetura e Segurança de Dados

* **Privacidade e LGPD:** Todos os prontuários e notas de sessão contam com proteção de dados. No fluxo clínico, os dados de identificação pessoal (PII) são mascarados antes de serem submetidos ao LLM.
* **Row Level Security (RLS):** Cada consulta ao banco PostgreSQL via Supabase autentica a identidade do usuário a partir do token JWT, assegurando que nenhum professor, aluno ou paciente acesse dados de terceiros.
* **Resiliência de IA:** O módulo centralizado `callGroqChat` dispõe de chaveamento automático para modelos alternativos em caso de manutenção ou descontinuação de modelos pela provedora, garantindo alta disponibilidade do serviço.


1. APIs e Serviços Externos Integrados
Provedor / Serviço	Base URL / SDK	Finalidade no Sistema
Groq Cloud API	https://api.groq.com/openai/v1	Inferência ultra-rápida de LLMs (qwen/qwen3.8-27b com fallback dinâmico). Utilizada para análise pedagógica de aulas, extração de erros gramaticais e lacunas de vocabulário em JSON, geração de tarefas personalizadas, simulador de cenários em tempo real e evolução clínica psicanalítica.
AssemblyAI API	https://api.assemblyai.com/v2	Transcrição de áudio (Speech-to-Text) com Speaker Diarization (distinção automática da voz do professor/psicólogo e do aluno/paciente) a partir de gravações ou uploads de sessões.
Supabase	BaaS (PostgreSQL + Auth + Storage + RPC)	Banco de dados relacional com RLS (Row Level Security), autenticação e sessões JWT, armazenamento de mídias/logos no Storage e funções transacionais (ex.: débito de créditos de IA via RPC).
Stripe API	stripe Node SDK & @stripe/connect-js	Plataforma financeira completa: pagamentos via Stripe Checkout, faturamento recorrente de planos SaaS, compra de pacotes de créditos e repasses bancários para professores via Stripe Connect Express.
Google APIs	@react-oauth/google & Calendar	Login social OAuth 2.0 com conta Google e sincronização bidirecional de agendamentos com o Google Calendar.
2. Endpoints Internos da API (Vercel Serverless Functions)
Localizados no diretório 

apps/web/api/
:

Motor Pedagógico (/api/student-engine/):
transcribe: Aciona transcrição no AssemblyAI e salva o histórico da aula.
analyze: Analisa a transcrição com Groq AI, extrai erros, lacunas de vocabulário, fluência e debita os créditos correspondentes.
generate-homework: Monta tarefas hiper-personalizadas derivadas dos erros reais cometidos na aula.
evaluate-writing: Corretor interativo que analisa frases submetidas pelo aluno, explicando a regra gramatical em português e sugerindo versões aprimoradas.
profile: Consolida o mapa de evolução, pontos fracos e vocabulário dominado pelo aluno.
Simulador de Cenários (/api/scenario-engine/):
chat: Interação conversacional dinâmica em inglês com personas situacionais (Job Interview, Sales Pitch, Restaurant, Travel, etc.).
evaluate: Avaliação e scoring de fluência, gramática e vocabulário ao encerrar a simulação.
Pagamentos & Monetização (/api/payments/):
checkout: Sessões Stripe Checkout para planos e créditos.
connect: Onboarding e acesso ao painel Stripe Express para recebimento de repasses.
saas: Gerenciamento de assinaturas e portal de autoatendimento.
webhook: Receptor oficial de webhooks Stripe com conciliação automática.
Agenda & Operação (/api/dashboard/):
availability: Grade horária semanal, limites e regras de intervalo.
calendar: Consulta de horários ocupados e agendamentos.
kpis: Métricas operacionais de retenção, horas lecionadas e faturamento.
3. Funcionalidades Principais por Perfil
👨‍🏫 Para Profissionais / Professores (/dashboard)
Estúdio de Sessão Ativa (/session/:id): Gravação de áudio ao vivo ou upload de arquivo com transcrição automática por interlocutor e geração de insights (Modo Aluno) ou evolução clínica com mascaramento de PII (Modo Paciente).
Gerenciador de Tarefas Adaptativas: Geração de lições de casa modulares (Correção de Erros, Vocabulário, Redação, Prática de Fala, Cenários e Desafio Bônus de XP).
Prontuário e Ficha do Paciente/Aluno: Histórico completo de sessões, timeline de notas clínicas e gráficos de evolução.
Agenda e Agendamento: Calendário interativo com sincronização com Google Calendar e bloqueio de horários.
Loja de Créditos & Analytics de IA: Controle de consumo e saldo de créditos de IA com extrato analítico de custos.
Brand Studio (White-label): Customização da marca da escola/clínica (logotipo, cores primária/secundária e slug personalizado /academy/:slug).
Repasses Financeiros: Gestão de dados bancários e saques diretos via Stripe Connect.
🎓 Para Alunos / Clientes (/client)
Painel do Aluno: Acompanhamento de próximas aulas, tarefas pendentes, sequência diária (streak) e XP acumulado.
Central de Insights da Aula: Detalhamento dos erros cometidos na aula, correções recomendadas e explicações em português.
Homework Hub Interativo: Resolução de tarefas no navegador, flashcards interativos com virada 3D e desafio de redação com correção da IA em tempo real.
Simulador de Cenários: Prática de conversação em situações reais simuladas pela IA.
Banco de Vocabulário: Repositório de novos termos aprendidos em contexto.
Auto-agendamento de Aulas: Marcação direta de horários conforme a disponibilidade real do professor.
🛡️ Para Administradores da Plataforma (/admin)
Monitor de Rentabilidade & Custos de APIs: Rastreamento em tempo real do custo unitário das APIs de IA (Groq, OpenAI, AssemblyAI) versus receita bruta gerada por créditos e planos.
Moderação de Professores: Fila de aprovação de novos cadastros e permissões de acesso.
Gestão de Planos & Preços: Edição de limites de planos SaaS e custos em créditos por funcionalidade.
Logs de Auditoria e E-mails: Monitoramento de eventos e comunicações transacionais.
Para consultar o documento na íntegra, abra o arquivo 

PLATFORM_API_AND_FEATURES.md
.

10:21 PM
PS C:\Users\opaol\OneDrive\Gabriel_Pessoal\IA_Projects\Clinica_inteligente> 
PS C:\Users\opaol\OneDrive\Gabriel_Pessoal\IA_Projects\Clinica_inteligente> 
 
 
 
 
 
 
 
 
