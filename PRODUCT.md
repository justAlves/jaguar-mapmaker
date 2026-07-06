# Product

## Register

brand

Jaguar has two surfaces: a marketing landing page (`landing.html`, `src/landing/`) and a Tauri desktop map editor (`src/`, everything under `App.css`). The landing page is the primary register for this file. The editor itself is a `product`-register surface — treat it that way when working inside the app, regardless of this default.

## Users

Solo game masters prepping maps at home before a session — not necessarily technical, often coming from Photoshop/Clip Studio, Owlbear Rodeo, Foundry, or Roll20. They land on the site trying to answer one question fast: "will this get a map onto my table without a bunch of new ceremony?" They already have their own floor/wall/prop art (or are willing to grab some) and don't want to learn an autotile/bitmask system to use it.

## Product Purpose

Jaguar paints grid maps with the user's own art, lets them place and pose props Photoshop-style, and exports a PNG sized exactly to the grid — ready to drop into whatever VTT they already run their session in. It deliberately stops there: no live-session features, no accounts, no cloud. The landing page's job is to make that scope read as a feature (fast, honest, local-first) rather than a limitation, and to get a casual, non-technical GM to trust it enough to download it.

## Brand Personality

Craft tool, no-nonsense. The voice is dry and confident — closer to how the README talks ("Jaguar doesn't try to be a live VTT, it just gets a map onto the table fast") than to fantasy-tavern marketing copy. Confidence comes from capability and directness, not decoration or hype. The existing warm ink/parchment/ember palette and serif/sans pairing are a reasonable starting material, but the current landing page reads as generic/AI-made and needs a real point of view, not just a paint job.

## Anti-references

- Generic AI-SaaS landing page grammar: gradient text, tiny uppercase tracked eyebrows, hero-metric stat blocks, cream/beige-by-default surfaces, identical icon+heading+text card grids.
- Cutesy fantasy/D&D marketing: parchment-and-dragons tavern kitsch, whimsical illustrated mascots, quest-log copy. Jaguar is a serious creative tool that happens to serve RPG maps, not a themed toy.
- Anything that could pass for a template — the page should feel like it was made specifically for this tool, not filled in from a generic landing-page skeleton.

## Design Principles

1. **Show, don't tell.** The map editor's actual output (painted grids, posed props, exported PNGs) is more persuasive than adjectives — lead with real screenshots/art, not abstract claims.
2. **Scope is a feature.** "No autotile rules, no cloud, no account, just files" should read as deliberate craft restraint, not as a list of missing features.
3. **Confidence without decoration.** Say things plainly and let the tool's capability carry the persuasion; avoid ornamental effects that don't serve comprehension.
4. **Local-first as trust signal.** The "it's just files" pitch (a project is a folder, nothing you can't back up with copy-paste) is a differentiator for a technical-adjacent, privacy-conscious GM audience — make it visible early, not buried.
5. **One voice across surfaces.** The landing page's tone should match the README's and the app's own dry, direct copy — no tonal whiplash between marketing and product.

## Accessibility & Inclusion

Standard WCAG AA: body text ≥4.5:1 contrast, large text ≥3:1, full reduced-motion alternatives for any scroll/reveal animation, keyboard-navigable nav and CTAs.
