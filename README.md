# SGT de Armas

Aplicação web para gestão de relatórios de eventos, com sincronização em nuvem (Firebase) e exportação em PDF.

## Funcionalidades

- Cadastro, edição e exclusão de relatórios de evento
- Sincronização em tempo real via Firebase (Firestore) com login Google
- Geração de PDF individual ou consolidado (vários relatórios em uma tabela)
- Exportação direta para o Google Drive
- Filtro por data (atalhos rápidos, mês específico, intervalo personalizado)
- Painel de estatísticas (total de eventos, por mês, por responsável)
- Funciona também sem login, salvando localmente no navegador

## Stack

React + TypeScript + Vite + Tailwind CSS + Firebase (Auth + Firestore) + jsPDF

## Rodando localmente

**Pré-requisitos:** Node.js (versão LTS)

1. Instale as dependências:
   ```
   npm install
   ```

2. Configure o Firebase. Este projeto usa um arquivo `firebase-applet-config.json` na raiz (não versionado no Git, por conter a chave do projeto). Copie o exemplo e preencha com os dados do seu projeto Firebase (disponíveis em **Configurações do Projeto → Geral** no Firebase Console):
   ```
   cp firebase-applet-config.example.json firebase-applet-config.json
   ```
   Alternativamente, você pode preencher as variáveis `VITE_FIREBASE_*` em um arquivo `.env.local` (veja `.env.example`) — elas têm prioridade sobre o JSON.

3. Rode o app:
   ```
   npm run dev
   ```

4. (Opcional) Publique as regras do Firestore (`firestore.rules`) no Firebase Console ou via CLI:
   ```
   firebase deploy --only firestore:rules
   ```

## Build de produção

```
npm run build
```

Os arquivos finais ficam em `dist/`.
