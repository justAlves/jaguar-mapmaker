import { useEffect, useState } from "react";
import { LegendIcon } from "./LegendIcon";

const GITHUB_URL = "https://github.com/justAlves/jaguar-mapmaker";
const RELEASES_URL = "https://github.com/justAlves/jaguar-mapmaker/releases";

interface LegendEntry {
  icon: Parameters<typeof LegendIcon>[0]["name"];
  title: string;
  body: string;
}

const EDITOR_LEGEND: LegendEntry[] = [
  { icon: "art", title: "Sua arte, sem autotile pra aprender", body: "Importe qualquer floor, wall ou prop que você já tem — funciona sem bitmask pra configurar." },
  { icon: "flame", title: "Luz com intensidade e cor", body: "Tochas, luz fria, luz quente — cada fonte com seu próprio alcance, pra dar clima real ao ambiente." },
  { icon: "layers", title: "Sem bagunça", body: "Organize seus assets em pastas, favoritos e tags. Encontre o que precisa sem rolar a lista inteira." },
  { icon: "file", title: "É só arquivo", body: "Um project.json e uma pasta assets/. Sem conta, sem nuvem obrigatória." },
];

type RoadmapStatus = "active" | "planned";

interface RoadmapEntry {
  title: string;
  body: string;
  status: RoadmapStatus;
}

const ROADMAP: RoadmapEntry[] = [
  { title: "Criador de tokens", status: "active", body: "Um criador de tokens simples e intuitivo, com diversas opções de personalização." },
  { title: "Handout pro grupo", status: "active", body: "Mostra uma imagem ou carta pros jogadores na hora, sem precisar compartilhar a tela." },
  { title: "Sincronização na nuvem", status: "planned", body: "Pago, opcional. Continue de onde parou em outro aparelho, ou jogue com o grupo à distância — o disco continua sendo a fonte da verdade." },
  { title: "Marketplace de assets", status: "planned", body: "Um lugar pra artistas publicarem e venderem pacotes de assets pra comunidade usar." },
  { title: "Notas do mestre no mapa", status: "planned", body: "Marcações que só você vê, presas a um ponto do mapa — lembrete de armadilha, segredo ou gancho de história." },
];

const ROADMAP_GROUPS: { label: string; status: RoadmapStatus }[] = [
  { label: "Em progresso", status: "active" },
  { label: "No radar", status: "planned" },
];

const TABLE_LEGEND: LegendEntry[] = [
  { icon: "link", title: "Desenhou, já é jogável", body: "A sessão usa o mesmo mapa que você acabou de pintar. Sem exportar pra outro programa, sem re-importar token." },
  { icon: "flame", title: "Iluminação dinâmica", body: "Fog of war com shadow-casting de verdade — Crie ambientes com iluminação customizada." },
  { icon: "unlock", title: "Sem conta, sem mensalidade", body: "Nenhum login, nenhuma cobrança. É grátis e de código aberto." },
  { icon: "art", title: "Controle o que seus jogadores veem", body: "Tenha uma nova perspectiva sobre o que os jogadores podem ver no mapa." },
];

function Legend({ entries }: { entries: LegendEntry[] }) {
  return (
    <div className="legend">
      {entries.map((entry) => (
        <div className="legend-row" key={entry.title}>
          <span className="legend-icon">
            <LegendIcon name={entry.icon} />
          </span>
          <div className="legend-text">
            <h3>{entry.title}</h3>
            <p>{entry.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" } as const;

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

export function LandingApp() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="landing">
      <header className="nav">
        <a className="brand" href="#top">
          <img src="/jaguar-icon.svg" alt="" width={26} height={26} />
          <span className="brand-name">Jaguar</span>
          <span className="brand-tagline">editor de mapas + mesa virtual</span>
        </a>
        <nav>
          <a href="#editor">Editor</a>
          <a href="#mesa">Mesa</a>
          <a href="#arquivos">Seus arquivos</a>
        </nav>
        <div className="nav-actions">
          <a className="nav-github" href={GITHUB_URL} {...EXTERNAL}>
            GitHub ↗
          </a>
          <a className="btn nav-cta" href={RELEASES_URL} {...EXTERNAL}>
            Baixar Jaguar
          </a>
          <button
            type="button"
            className="nav-toggle"
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <HamburgerIcon />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="nav-menu" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="nav-menu-header">
            <button type="button" className="nav-toggle" aria-label="Fechar menu" onClick={closeMenu}>
              <CloseIcon />
            </button>
          </div>
          <nav>
            <a href="#editor" onClick={closeMenu}>Editor</a>
            <a href="#mesa" onClick={closeMenu}>Mesa</a>
            <a href="#arquivos" onClick={closeMenu}>Seus arquivos</a>
          </nav>
          <div className="actions">
            <a className="btn" href={RELEASES_URL} {...EXTERNAL} onClick={closeMenu}>
              Baixar Jaguar
            </a>
            <a className="link" href={GITHUB_URL} {...EXTERNAL} onClick={closeMenu}>
              Ver código-fonte
            </a>
          </div>
        </div>
      )}

      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="hero-copy">
              <h1>
                Você enxerga tudo.
                <br />
                Seus jogadores, só o que <span className="hl">a luz alcança</span>.
              </h1>
              <p className="hero-sub">
                Pinte o mapa com a sua própria arte, acenda tochas, jogue com fog of war de verdade — parede bloqueia
                visão, não é só um círculo apagado. Tudo em arquivos seus, offline, sem conta pra criar.
              </p>
              <div className="actions">
                <a className="btn" href={RELEASES_URL} {...EXTERNAL}>
                  Baixar Jaguar
                </a>
                <a className="link" href={GITHUB_URL} {...EXTERNAL}>
                  Ver código-fonte
                </a>
              </div>
              <p className="hero-note">Windows · macOS · Linux — grátis e de código aberto, licença MIT</p>
            </div>
            <div className="hero-shot">
              <img src="/screenshots/hero.png" alt="Captura de tela do editor de mapas do Jaguar, mostrando um mapa desenhado com arte própria e uma luz colorida" loading="eager" />
            </div>
          </div>
        </section>

        <section id="editor" className="section">
          <h2>Um mapa é feito da sua arte, não da nossa</h2>
          <Legend entries={EDITOR_LEGEND} />
        </section>

        <section id="mesa" className="section section-dim">
          <h2>O mesmo mapa, agora jogável</h2>
          <Legend entries={TABLE_LEGEND} />
          <p className="section-footnote">
            E claro, o que você já esperaria de uma mesa virtual também está lá: iniciativa, régua de distância,
            múltiplos mapas por sessão e uma tela separada pra quem joga acompanhar.
          </p>
        </section>

        <section className="section shots">
          <h2>Isso aqui não é ilustração</h2>
          <p className="section-lede">Direto do app, sem Photoshop — cada captura é a mesma tela que você vai usar.</p>
          <div className="shots-grid">
            <figure className="shot">
              <img src="/screenshots/editor.png" alt="Captura de tela do editor de mapas do Jaguar, mostrando um mapa desenhado com arte própria" loading="lazy" />
              <figcaption>o editor, com um mapa real desenhado nele</figcaption>
            </figure>
            <figure className="shot">
              <img
                src="/screenshots/vtt.png"
                alt="Captura de tela da mesa virtual do Jaguar com um personagem, tocha acesa e fog of war bloqueando o resto do mapa"
                loading="lazy"
              />
              <figcaption>a mesma sessão, com tocha e fog of war ativos</figcaption>
            </figure>
          </div>
        </section>

        <section className="section section-dim">
          <h2>E quais são os próximos passos?</h2>
          {ROADMAP_GROUPS.map((group) => {
            const items = ROADMAP.filter((item) => item.status === group.status);
            if (items.length === 0) return null;
            return (
              <div className="roadmap-group" key={group.status}>
                <p className="roadmap-group-label">{group.label}</p>
                <div className="roadmap-list">
                  {items.map((item) => (
                    <div className="roadmap-row" key={item.title}>
                      <span className={`roadmap-tag roadmap-tag--${item.status}`}>
                        {item.status === "active" ? "em progresso" : "no radar"}
                      </span>
                      <div className="roadmap-text">
                        <h3>{item.title}</h3>
                        <p>{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        <section id="arquivos" className="section ledger">
          <div className="ledger-copy">
            <h2>O disco é a fonte da verdade</h2>
            <p>
              Um projeto ou uma sessão de Jaguar não vive num servidor — vive numa pasta, com nome e tudo, do jeito
              que o Obsidian trata suas notas. Funciona 100% offline, sem conta, hoje e sempre.
            </p>
          </div>
          <div className="ledger-card" aria-hidden="true">
            <pre>{`arco-1-a-queda-de-valdrun/
├── session.json
├── tokens/
│   ├── liora.png
│   └── kessa.png
└── project.json`}</pre>
          </div>
        </section>

        <section className="closing">
          <div className="closing-inner">
            <h2>Sem conta. Sem servidor. Só o seu mapa.</h2>
            <a className="btn btn-inverse" href={RELEASES_URL} {...EXTERNAL}>
              Baixar Jaguar
            </a>
          </div>
        </section>
      </main>

      <footer className="foot">
        <span className="brand">
          <img src="/jaguar-icon.svg" alt="" width={18} height={18} />
          Jaguar
        </span>
        <span>© {new Date().getFullYear()} — código aberto sob licença MIT</span>
        <a href={GITHUB_URL} {...EXTERNAL}>GitHub</a>
      </footer>
    </div>
  );
}
