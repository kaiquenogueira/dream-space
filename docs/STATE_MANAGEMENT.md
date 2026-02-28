# Gerenciamento de Estado (React Query)

A aplicação migrou de um gerenciamento de estado manual e complexo (useState + useEffect + localStorage) para **TanStack React Query**.

## Motivação
O hook `useProject` original acumulava muitas responsabilidades:
- Fetch de dados (Supabase)
- Sincronização local vs remoto
- Persistência manual em localStorage
- Estado de UI (seleção de imagem/propriedade)

Isso causava bugs de sincronização e tornava o código difícil de testar e manter.

## Nova Arquitetura

### 1. Server State (React Query)
Todo o estado que vem do servidor (lista de propriedades e imagens) é gerenciado pelo React Query.
- **Queries**: `usePropertiesQuery` busca dados e faz cache.
- **Mutations**: `useCreatePropertyMutation`, `useUploadImagesMutation`, `useDeleteImageMutation` alteram dados no servidor e atualizam o cache automaticamente (invalidação ou update otimista).

### 2. UI State (Local)
O estado puramente de interface permanece local no hook `useProject` (ou nos componentes):
- `activePropertyId`: Qual propriedade está sendo visualizada.
- `selectedImageId`: Qual imagem está selecionada no carrossel.

### 3. Compatibilidade (Facade Pattern)
Para evitar refatorar toda a aplicação de uma vez, o hook `useProject` foi mantido como uma "fachada". Ele usa os hooks do React Query internamente mas expõe a mesma API (incluindo `setProperties` e `setImages`) para os componentes consumidores.
- `setProperties` e `setImages` agora são "shims" que atualizam o cache do React Query via `queryClient.setQueryData`.

## Benefícios
- **Menos código**: Remoção de lógica manual de persistência e efeitos colaterais.
- **Cache robusto**: Dados são mantidos em cache e atualizados automaticamente em background.
- **UX Melhor**: Updates otimistas (UI atualiza antes do servidor responder) para seleção e upload de imagens.
- **Testabilidade**: Fácil de testar isoladamente mockando o `projectService` ou o próprio `QueryClient`.
