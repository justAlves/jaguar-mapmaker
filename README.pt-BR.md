<p align="center">
  <img src="public/jaguar-mark.svg" width="120" alt="Logo do Jaguar" />
</p>

<h1 align="center">Jaguar</h1>
<p align="center"><strong>Mapas de RPG, direto pro seu VTT favorito.</strong></p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.pt-BR.md">Português</a> ·
  <a href="README.es.md">Español</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="Licença MIT"></a>
</p>

---

Pinte um mapa em grid com a sua própria arte, posicione props, exporte um PNG limpo no tamanho exato do seu grid. É isso — o Jaguar não tenta ser um VTT ao vivo, ele só coloca um mapa na mesa rápido.

## Por que o Jaguar

- **Sua arte, não um tileset embutido.** Importe os PNGs de chão/parede/props que você já tem. Sem regras de bitmask pra satisfazer, sem formato de autotile pra converter.
- **Paredes que realmente parecem paredes.** Elas se encaixam na aresta da célula em vez de preencher o tile inteiro, então uma sala parece uma sala em vez de um bloco de tijolos. A aresta é detectada automaticamente por onde você está pintando, ou você pode fixar manualmente.
- **Props que dá pra realmente posicionar.** Alças de canto/aresta/rotação direto no canvas, estilo Photoshop — segure **Alt** para escalar proporcionalmente.
- **É só arquivo.** Um projeto é uma pasta com um `project.json` e um diretório `assets/`. Sem conta, sem nuvem, nada que você não consiga fazer backup com um copiar-e-colar.

Fora isso: uma biblioteca de assets com pastas e busca, salvamento automático, projetos recentes com thumbnails ao vivo, tema claro/escuro/sistema, e English/Português/Español — as coisas que você já esperaria de qualquer editor decente, presentes e fora do caminho.

## Atalhos de teclado

| Atalho | Ação |
| --- | --- |
| `F` / `W` / `X` / `P` / `H` | Pintar chão / Pintar parede / Apagar / Props / Mover (Pan) |
| `R` | Alterna o modo de aresta da parede (ao pintar paredes) |
| `G` | Mostra/oculta o grid |
| `Ctrl+Z` / `Ctrl+Y` | Desfazer / Refazer |
| `Ctrl+S` | Salvar |
| `Ctrl+D` | Duplicar prop selecionado |
| `Delete` | Excluir prop selecionado |
| Setas (+ `Shift`) | Mover o prop selecionado |
| `Escape` | Desmarcar seleção |

## Como começar

### Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) (toolchain stable)
- Dependências de build da plataforma para o Tauri — veja o [guia oficial de pré-requisitos](https://v2.tauri.app/start/prerequisites/) (no Linux isso significa `webkit2gtk`, `libsoup3` e afins)

### Rodar em desenvolvimento

```bash
npm install
npm run tauri dev
```

### Gerar um build de release

```bash
npm run tauri build
```

O app empacotado (e o instalador, quando aplicável) fica em `src-tauri/target/release/bundle/`.

## Estrutura do projeto

```
src/                Frontend em React + TypeScript
  components/        Componentes de UI (editor, canvas, painéis, diálogos)
  store/              Stores Zustand (estado do mapa/editor, configurações do app)
  lib/                I/O de projeto, exportação PNG, autosave, tema etc.
  i18n/               Dicionários de tradução (en / pt / es)
src-tauri/           Backend em Rust (shell do Tauri, capabilities, ícones)
```

Os projetos são pastas comuns no disco: um `project.json` descrevendo o grid, as células pintadas e os props, mais uma subpasta `assets/` com as imagens importadas. Nada fica escondido num banco de dados proprietário do app.

## Fora do escopo (por enquanto)

O Jaguar é, de propósito, uma ferramenta de *criação* de mapas, não um VTT ao vivo:

- Sem contas, sincronização em nuvem ou colaboração em tempo real.
- Sem conexão automática de paredes via autotile/bitmask (a pintura por aresta já cobre a maior parte dos casos sem isso).
- Sem fog of war, iluminação dinâmica ou outros recursos de sessão ao vivo — exporte um PNG e rode sua sessão no VTT de sua escolha.

## Contribuindo

Contribuições são bem-vindas — veja [CONTRIBUTING.md](CONTRIBUTING.md) para saber como configurar o ambiente, e [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) para as diretrizes da comunidade. Encontrou um problema de segurança? Siga o [SECURITY.md](SECURITY.md) em vez de abrir uma issue pública.

## Licença

MIT — veja [LICENSE](LICENSE).
