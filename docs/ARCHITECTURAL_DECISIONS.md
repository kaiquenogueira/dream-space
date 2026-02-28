# Decisões Arquiteturais e Melhorias Técnicas

## 1. Qualidade de Código (Linting)
- **Decisão:** Adotar regras mais rígidas de ESLint para prevenir bugs silenciosos.
- **Mudanças:**
  - `no-explicit-any`: Alterado para `warn` (objetivo futuro: `error`). O uso de `any` anula os benefícios do TypeScript.
  - `no-unused-vars`: Ativado para evitar código morto.
  - `prefer-const`: Ativado para garantir imutabilidade onde possível.
- **Ação Requerida:** Todo novo código deve seguir essas regras. Evite `any` a todo custo; use `unknown` com validação de tipo se necessário.

## 2. Camada de Serviço (Frontend)
- **Decisão:** Abstrair chamadas de API (`fetch`) de dentro dos componentes React para serviços dedicados.
- **Benefícios:**
  - Melhora a testabilidade (fácil de mockar).
  - Centraliza tratamento de erros.
  - Desacopla UI de lógica de dados.
- **Exemplo:** `AdminService` foi criado para gerenciar usuários e créditos, removendo lógica complexa do `AdminDashboard.tsx`.

## 3. Segurança e Validação (Backend)
- **Decisão:** Implementar validação de esquema com **Zod** nas Serverless Functions.
- **Motivação:** Confiar apenas na tipagem do TypeScript no frontend não protege a API contra requisições maliciosas ou malformadas.
- **Implementação:**
  - A API `/api/generate` agora valida `body` usando um schema Zod estrito.
  - Campos como `imageBase64` e `customPrompt` são validados quanto a presença, tipo e tamanho antes de qualquer processamento.

## 4. Testes
- **Decisão:** Priorizar testes de unidade para serviços e lógicas de negócio críticas.
- **Status:** Testes adicionados para `adminService`. Próximos passos incluem testes de integração para o fluxo de geração de imagem.

## 5. Refatoração de Tipos (Domínio vs. UI)
- **Decisão:** Separar o tipo `UploadedImage` em `ImageAsset` (dados do arquivo) e `ImageState` (estado de interface).
- **Motivação:** O objeto de imagem original misturava responsabilidades, dificultando a manutenção e os testes.
- **Implementação:**
  - `ImageAsset`: Contém `id`, `file`, `base64`, `generatedUrl`, etc.
  - `ImageState`: Contém `isGenerating`, `error`, `selected`.
  - `UploadedImage`: Agora é uma interseção `ImageAsset & ImageState` para manter compatibilidade retroativa enquanto permite uso isolado das partes.

## 6. Rate Limiting (Pendente de Implementação)
- **Status:** Planejado.
- **Problema Atual:** O controle de requisições está em memória (`Map`), o que não persiste entre execuções serverless.
- **Solução Proposta:** Implementar `@upstash/ratelimit` com Redis.
- **Motivação:** Proteger a API contra abusos e custos excessivos do Gemini.

## 7. Gerenciamento de Estado (React Query)
- **Decisão:** Adotar **TanStack React Query** para gerenciamento de estado do servidor (propriedades, imagens).
- **Problema Atual:** O hook `useProject` original acumulava muita lógica de sincronização, fetch manual e persistência no localStorage, causando complexidade e bugs.
- **Solução:**
  - `usePropertiesQuery`: Hook para buscar dados do Supabase com cache automático.
  - `useCreatePropertyMutation`, `useUploadImagesMutation`: Hooks para operações de escrita com update otimista.
  - O hook `useProject` foi mantido como "Facade" para compatibilidade, delegando as operações para o React Query.
- **Benefícios:**
  - Código mais limpo e declarativo.
  - Cache robusto e invalidação automática.
  - Updates otimistas para melhor UX.

---
*Atualizado em: 27/02/2026*
