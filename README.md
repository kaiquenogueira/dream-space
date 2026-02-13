# DreamSpace AI Architect

DreamSpace AI Architect é uma ferramenta poderosa de design de interiores impulsionada por IA, desenvolvida especificamente para **imobiliárias**, **corretores** e **empresas de divulgação de imóveis**.

Esta aplicação permite transformar fotos de ambientes (vazios ou mobiliados) em visualizações arquitetônicas impressionantes, ajudando a vender o potencial de um imóvel antes mesmo da visita física.

## 🚀 Funcionalidades Principais

- **Redesign de Interiores com IA**: Utilize o poder do Google Gemini para redecorar ambientes com diversos estilos arquitetônicos.
- **Visualização Instantânea**: Carregue fotos de imóveis e veja transformações em segundos.
- **Múltiplos Estilos**: Escolha entre estilos como Moderno, Escandinavo, Industrial, Minimalista, entre outros.
- **Processamento em Lote**: Carregue e gere designs para múltiplas fotos de um imóvel simultaneamente.
- **Comparação Antes/Depois**: Visualize as mudanças com uma interface intuitiva de "split view".
- **Prompt Personalizado**: Ajuste os detalhes do design com instruções específicas para atender às necessidades do cliente.

## 🎯 Aplicação no Mercado Imobiliário

- **Virtual Staging**: Mobílie digitalmente quartos vazios para torná-los mais atrativos em anúncios online.
- **Ideias de Renovação**: Mostre aos compradores interessados como um imóvel antigo pode ficar após uma reforma.
- **Diferenciação de Anúncios**: Crie imagens de capa impactantes que se destacam em portais imobiliários.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19, Vite, TypeScript
- **IA Generativa**: Google Gemini API (`@google/genai`)
- **Estilização**: Tailwind CSS (inferido pela estrutura de classes utilitárias)

## 📦 Como Rodar Localmente

**Pré-requisitos:** Node.js instalado.

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure a API Key:**
   - Obtenha sua chave de API do Google Gemini no [Google AI Studio](https://aistudio.google.com/).
   - Defina a variável `GEMINI_API_KEY` no arquivo `.env.local` (crie o arquivo se não existir).

3. **Inicie a aplicação:**
   ```bash
   npm run dev
   ```

## 🔮 Próximos Passos Sugeridos

- **Modo "Virtual Staging" Específico**: Criar prompts otimizados especificamente para mobiliar ambientes vazios, detectando paredes e janelas.
- **Exportação Profissional**: Funcionalidade para baixar o "Antes e Depois" em um único arquivo de imagem com a logo da imobiliária.
- **Estimativa de Custos**: Integração futura para estimar custos aproximados da reforma sugerida (baseado em materiais identificados).
- **Galeria de Projetos**: Salvar e organizar projetos por "Imóvel" ou "Cliente".
