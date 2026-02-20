# DreamSpace AI Architect

DreamSpace AI Architect é uma ferramenta poderosa de design de interiores impulsionada por IA, desenvolvida especificamente para **imobiliárias**, **corretores** e **empresas de divulgação de imóveis**.

Esta aplicação permite transformar fotos de ambientes (vazios ou mobiliados) em visualizações arquitetônicas impressionantes, ajudando a vender o potencial de um imóvel antes mesmo da visita física.

## 🚀 Funcionalidades Principais

- **🔐 Autenticação Segura**: Acesso restrito via login com senha criptografada (hash) e tokens JWT.
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
- **Segurança**: `bcryptjs` (hash de senhas) e `jsonwebtoken` (JWT)

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

# Configurações de Login
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=hash_gerado_pelo_script
JWT_SECRET=sua_chave_secreta_jwt_aqui
```

### 3. Gerar Senha de Admin
Para gerar o hash seguro da sua senha de administrador, utilize o script incluído:

```bash
npm run generate-hash "SuaSenhaSeguraAqui"
```
Copie o hash gerado e cole na variável `ADMIN_PASSWORD_HASH` no seu arquivo `.env`.

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
3. **Importante**: Configure as variáveis de ambiente (`GEMINI_API_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `JWT_SECRET`) no painel da Vercel em **Settings > Environment Variables**.

## 📂 Estrutura do Projeto

- `/api`: Serverless Functions (Backend)
  - `generate.ts`: Rota protegida para geração de imagens.
  - `login.ts`: Autenticação e emissão de JWT.
  - `verify.ts`: Verificação de token.
- `/components`: Componentes React (Login, Upload, Seletores).
- `/services`: Lógica de integração com o backend.
- `/scripts`: Utilitários (gerador de hash de senha).
- `App.tsx`: Componente principal da aplicação.

## 📚 Documentação de Design e UX

Foi realizada uma análise completa de usabilidade e UX da aplicação. O relatório detalhado, incluindo descobertas, recomendações e plano de ação, pode ser encontrado em:

- [📄 Relatório de UX/UI e Acessibilidade](./UX_REPORT.md)
