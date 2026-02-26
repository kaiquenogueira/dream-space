# DreamSpace AI Architect

DreamSpace AI Architect é uma ferramenta poderosa de design de interiores impulsionada por IA, desenvolvida especificamente para **imobiliárias**, **corretores** e **empresas de divulgação de imóveis**.

Esta aplicação permite transformar fotos de ambientes (vazios ou mobiliados) em visualizações arquitetônicas impressionantes, ajudando a vender o potencial de um imóvel antes mesmo da visita física.

## 🚀 Funcionalidades Principais

- **🔐 Autenticação Segura**: Gerenciada via Supabase Auth (Google & Email).
- **🤖 Redesign de Interiores com IA**: Utilize o poder do Google Gemini 2.5 Flash para redecorar ambientes.
- **⚡ Visualização Instantânea**: Carregue fotos de imóveis e veja transformações em segundos.
- **🎨 Múltiplos Estilos**: Escolha entre estilos como Moderno, Escandinavo, Industrial, Minimalista, entre outros.
- **🔄 Comparação Antes/Depois**: Visualize as mudanças com uma interface intuitiva de "split view".
- **📝 Prompt Personalizado**: Ajuste os detalhes do design com instruções específicas.
- **☁️ Serverless Backend**: Arquitetura segura onde a chave da API nunca é exposta ao cliente.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19, Vite, TypeScript
- **Estilização**: Tailwind CSS v4
- **Backend**: Vercel Serverless Functions (Node.js)
- **IA Generativa**: Google Gemini API (`@google/genai`)

## 📦 Configuração e Instalação

### Pré-requisitos
- Node.js instalado (v18+)
- Vercel CLI instalado globalmente (`npm i -g vercel`) para rodar o backend localmente.

### 1. Instale as dependências
```bash
npm install
```

### 2. Configuração de Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Sua chave da API do Google Gemini (https://aistudio.google.com/)
GEMINI_API_KEY=sua_chave_aqui

# Supabase (client-side)
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon_supabase

# Opcional: URL de redirecionamento para Auth (padrão: window.location.origin)
# Útil para deploys de preview ou domínios customizados
VITE_REDIRECT_URL=https://seu-dominio.com
```

## 🚀 Como Rodar Localmente

Como o projeto utiliza Serverless Functions para proteger a API Key e gerenciar a autenticação, você deve usar a CLI da Vercel para simular o ambiente de produção.

**Não use apenas `npm run dev`**, pois isso iniciará apenas o frontend (Vite) e as rotas de API (`/api/*`) não funcionarão.

Para rodar a aplicação completa (Frontend + Backend):

```bash
vercel dev
```
Ou use o script facilitador:
```bash
npm run dev:vercel
```

Acesse a aplicação em: `http://localhost:3000`

### Notas de desenvolvimento
- O HMR do Vite está desativado por compatibilidade com ambientes que aplicam SES/lockdown no navegador. As alterações recarregam a página inteira.
- Se você iniciar apenas o Vite (`npm run dev`), as rotas `/api/*` não estarão disponíveis.

## ✅ Testes
```bash
npm run test
```

Testes críticos de UI e fluxo principal:
- `src/tests/app.test.tsx`
- `src/tests/useImageGeneration.test.tsx`

## ☁️ Deploy na Vercel

O projeto está otimizado para a Vercel.

1. Instale a Vercel CLI e faça login:
   ```bash
   vercel login
   ```
2. Faça o deploy:
   ```bash
   vercel
   ```
3. **Importante**: Configure as variáveis de ambiente (`GEMINI_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) no painel da Vercel em **Settings > Environment Variables**.

## 📂 Estrutura do Projeto

- `/api`: Serverless Functions (Backend)
  - `generate.ts`: Geração de imagens.
  - `generate-drone-tour.ts`: Geração de vídeo (Drone Tour).
  - `check-operation.ts`: Polling do status de operações de vídeo.
  - `media-proxy.ts`: Proxy autenticado de mídia.
  - `verify.ts`: Validação de token via Supabase.
  - `admin/users.ts` e `admin/credits.ts`: Gestão administrativa de usuários e créditos.
- `/components`: Componentes React (Login, Upload, Seletores).
- `/services`: Lógica de integração com o backend.
- `geminiService.ts`: Chamadas às APIs e persistência de metadados de geração.
- `App.tsx`: Componente principal da aplicação.
