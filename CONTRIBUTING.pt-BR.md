# Contribuindo com o Jaguar

*[English](CONTRIBUTING.md) · [Español](CONTRIBUTING.es.md)*

Obrigado por considerar contribuir! O Jaguar é uma ferramenta pequena e focada, então "isso se encaixa na proposta do app" pesa mais do que "o código está perfeito" — sinta-se à vontade para abrir uma issue e discutir uma feature antes de investir tempo num PR grande.

## Configurando o ambiente

Você vai precisar de:

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) (toolchain stable)
- Dependências de build da plataforma para o Tauri — veja o [guia oficial de pré-requisitos](https://v2.tauri.app/start/prerequisites/)

Depois:

```bash
npm install
npm run tauri dev
```

Isso inicia o app com hot-reload no frontend (mudanças em React/TypeScript aplicam na hora) e rebuild automático do lado Rust (mudanças em `src-tauri/` disparam recompilação + reabertura do app).

## Antes de abrir um PR

- Rode `npm run build` — isso executa o compilador TypeScript em modo estrito seguido do build de produção do Vite. Não há um passo de lint separado configurado, então essa é a verificação de base.
- Se você mexeu em código Rust, rode `cargo check` dentro de `src-tauri/`.
- **Teste a mudança de verdade** no app rodando. Este projeto ainda não tem uma suíte de testes automatizados, então a verificação manual (abrir um projeto, fazer a ação, confirmar que funciona) é a principal rede de segurança. Mencione o que você testou na descrição do PR.
- Mantenha os PRs focados em uma única mudança. Refatorações "de passagem" misturadas com uma feature dificultam muito a revisão.

## Estilo de código

- O modo estrito do TypeScript está ativado; mantenha assim (evite escapes com `any` sem um bom motivo).
- Siga os padrões já existentes: Zustand para estado, CSS puro com os tokens de design em `src/App.css` (sem CSS-in-JS, sem framework de utilitários), componentes React funcionais com hooks.
- Novas strings visíveis ao usuário precisam passar pelo sistema de i18n (`useT()` + `src/i18n/translations.ts`), preenchidas nos três idiomas (`en`, `pt`, `es`) — o TypeScript falha o build se uma chave estiver faltando em algum dicionário.
- Comentários devem explicar o *porquê*, não o *o quê* — veja o código existente para referência de tom.

## Reportando bugs / sugerindo features

Abra uma issue no GitHub. Para bugs, inclua seu sistema operacional, o que você esperava, o que aconteceu de fato, e passos para reproduzir. Para features, uma descrição curta do caso de uso é mais útil do que um design completo — podemos iterar juntos na abordagem.

## Problemas de segurança

Por favor, não abra uma issue pública para vulnerabilidades de segurança — veja [SECURITY.md](SECURITY.md) em vez disso.
