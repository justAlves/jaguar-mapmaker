---
name: Jaguar
description: RPG maps, straight to your favorite VTT.
colors:
  ink: "#14110d"
  ink-2: "#1c1811"
  ink-3: "#221d15"
  line: "#3a3226"
  line-soft: "#2a251c"
  parchment: "#ede3cc"
  text-soft: "#b7ac93"
  text-faint: "#9d9179"
  ember: "#e2a33b"
  ember-hover: "#f0b64e"
  ember-soft: "rgba(226, 163, 59, 0.16)"
  moss: "#6d8f76"
  rust: "#c17158"
typography:
  display:
    fontFamily: "Archivo, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontWeight: 800
    letterSpacing: "-0.01em"
    fontVariation: "text-transform: uppercase"
  headline:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "clamp(2.4rem, 4vw, 3.4rem)"
    fontWeight: 900
    lineHeight: 1.08
  title:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "clamp(1.6rem, 2.8vw, 2.2rem)"
    fontWeight: 800
  body:
    fontFamily: "Archivo, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.55
  label:
    fontFamily: "Archivo, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.03em"
    fontVariation: "text-transform: uppercase"
  code:
    fontFamily: "ui-monospace, Menlo, Consolas, monospace"
    fontSize: "0.86rem"
rounded:
  none: "0px"
components:
  button-primary:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.85em 1.7em"
  button-primary-hover:
    backgroundColor: "{colors.ember}"
  button-inverse:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.none}"
    padding: "0.85em 1.7em"
  link-inline:
    textColor: "{colors.text-soft}"
    rounded: "{rounded.none}"
  image-frame:
    backgroundColor: "{colors.ink-3}"
    padding: "8px"
    rounded: "{rounded.none}"
---

# Design System: Jaguar

## 1. Overview

**Creative North Star: "Bare Metal"**

Jaguar's landing page runs close to the hardware: one heavy sans family, hard edges, solid color blocks, thick rules, flat offset shadows with zero blur. No serif, no italic, no soft glow, no rounded corners. This is the second real pass at the system, not the first: the first pass fixed individual components (removed a tracked-uppercase eyebrow, removed rotation on screenshots) but kept the underlying recipe — italic serif display + mono labels + hairline dividers — which is itself the most saturated brand-surface aesthetic of 2026 (the Stripe/Notion-adjacent "editorial-typographic" lane). Patching symptoms inside a saturated recipe doesn't escape it. This pass replaces the recipe: a single grotesque sans (Archivo) carrying the whole page through weight contrast alone, zero border-radius anywhere, 2px rules instead of 1px hairlines, and hard non-blurred offset shadows (a solid duplicate block behind a frame, not a soft glow) as the one recurring signature device.

The ink/ember/moss/rust palette itself is kept — it's real brand equity from PRODUCT.md, not the problem — but its *deployment* shifts from Restrained (ember as a rare, precious accent) to Committed (ember covers full solid sections: the closing CTA is a full ember field, the hero highlight is a solid ember text-block, not a tinted glow). The bespoke torch-cursor hero mechanic from the previous pass was removed by deliberate choice (not preserved for its own sake) because it belonged to the softer, more atmospheric system this pass replaces; the new hero carries the same headline and screenshot but through blocky, hard-edged framing instead.

**Key Characteristics:**
- One family (Archivo) for everything, carried by weight (700–900 for display/labels, 400–500 for body) instead of a display+body pairing — a deliberate single-family commitment, not an oversight.
- Zero border-radius anywhere. Every edge is a hard corner.
- Hard offset shadows (`Npx Npx 0 0 <color>`, zero blur) as the one recurring signature device on framed images and buttons — never a soft ambient glow.
- 2px rules (`--rule`) replace the old 1px hairlines throughout: nav border, section dividers, card borders, legend/roadmap row separators.
- Ember shifts from rare accent to occasional full-field commitment: the closing section and the hero's highlighted phrase are solid ember blocks, not tinted touches.
- Real product screenshots remain the primary persuasive device, per PRODUCT.md's "show, don't tell" principle — framing changed, the screenshots themselves didn't.

## 2. Colors

The palette itself (ink/ember/moss/rust) is unchanged brand equity from PRODUCT.md. What changed is the **strategy**: Committed, not Restrained. Ember now covers full sections and solid text-highlight blocks, not just small rare touches.

### Primary
- **Ember** (`#e2a33b`): CTAs, the closing section's full background field, the hero's solid text-highlight block (`.hl`), the "active" roadmap tag's fill, legend icons, hard-offset shadow color on the hero screenshot. No longer rationed to "rare" — it's allowed to be the dominant color of an entire section when the moment calls for it (the close), while staying a targeted accent elsewhere (icons, tags).
- **Ember Hover** (`#f0b64e`): reserved for future use; the current button hover state uses a press-motion (translate + shadow collapse) instead of a color change, so this token currently has no active call site — flag before reusing.

### Secondary
- **Moss** (`#6d8f76`): the "planned" roadmap status pill text. A quieter second signal, never on CTAs or large fields.

### Tertiary
- **Rust** (`#c17158`): still reserved, still unused in the shipped CSS. Give it a deliberate job before introducing it.

### Neutral
- **Ink** (`#14110d`): page background; also the button text color and the closing section's button/heading color (dark-on-ember).
- **Ink 2** (`#1c1811`): alternate section background (`.section-dim`).
- **Ink 3** (`#221d15`): surface fill for screenshot/card frames.
- **Line** (`#3a3226`) / **Line Soft** (`#2a251c`): the 2px rules and borders throughout — nav, cards, section dividers, row separators.
- **Parchment / Text** (`#ede3cc`): primary text; also the offset-shadow color for the inverse button on the ember closing section.
- **Text Soft** (`#b7ac93`): secondary body copy.
- **Text Faint** (`#9d9179`): tertiary copy, captions. Lightened from an earlier `#7c735e` that failed WCAG AA (3.56–4.01:1); this value holds ≥5.3:1 against ink and ink-3.

### Named Rules
**The Committed Ember Rule.** Ember is allowed to be the dominant color of a whole section (the closing field, a text-highlight block) — that's a deliberate strategy shift from "rare accent," not scope creep. It still never shares a section with a second saturated hue.

## 3. Typography

**Single Family:** Archivo (with system sans fallback) — carries display, body, and label roles through weight and case alone. No second family for prose or headings. A true monospace system stack (`ui-monospace, Menlo, Consolas, monospace`) is kept for exactly one literal, non-decorative use: the fake file-tree code block in the ledger card.

**Character:** Heavy, uppercase, tight — headlines and labels commit to weight 700–900 and full uppercase; body copy drops to 400–500 and sentence case so paragraphs stay readable. The contrast axis is weight and case, not family — brand.md's own guidance is explicit that "a single well-chosen family with committed weight/size contrast is stronger than a timid display+body pair," which is the deliberate bet here.

### Hierarchy
- **Display / Headline** (weight 900, `clamp(2.4rem, 4vw, 3.4rem)`, line-height 1.08, uppercase): hero `h1` only.
- **Title** (weight 800, `clamp(1.6rem, 2.8vw, 2.2rem)`, uppercase): section `h2`s, max-width 22ch.
- **Body** (weight 400, 1rem, line-height 1.55, sentence case): paragraph copy; hero subhead and legend/roadmap descriptions cap at 40–52ch.
- **Label** (weight 700, 0.7–0.9rem, letter-spacing 0.03–0.04em, uppercase): nav links, the nav tagline, image captions, roadmap group labels and tag pills, footer. Reserved for short functional text; body-length copy never goes uppercase (brand.md ban).
- **Code** (system monospace, 0.86rem, no case transform): the ledger card's literal file-tree snippet only.

### Named Rules
**The One-Family Rule.** Every text role on the page is Archivo. Contrast comes from weight (400 → 900) and case (sentence vs. full uppercase), never from introducing a second typeface. The only exception is the system monospace stack, reserved for literally-code/file-path content, never decorative labels.

## 4. Elevation

Flat sections, hard offset accents. Sections are divided by 2px solid rules (`--rule`), never a shadow. The one place depth appears is framed images/cards and buttons, which carry a **hard, zero-blur offset shadow** — a solid duplicate rectangle in a contrasting color, sitting behind and to the lower-right of the element, no gradient, no glow, no rotation. On hover, buttons translate into their own shadow and the shadow collapses to zero — a literal "press" motion, the page's one recurring interactive signature.

### Shadow Vocabulary
- **Hard offset — ember** (`box-shadow: 7px 7px 0 0 var(--ember)`): hero screenshot frame.
- **Hard offset — line** (`box-shadow: 7px 7px 0 0 var(--line)`): gallery shots, ledger card.
- **Hard offset — ink** (`box-shadow: 7px 7px 0 0 var(--ink)`): primary buttons (ember fill, ink offset).
- **Hard offset — parchment** (`box-shadow: 7px 7px 0 0 var(--parchment)`): the inverse button on the ember closing section.
- **Press state**: on hover/active, the element translates by the same offset (`translate(7px, 7px)`) and its own shadow collapses to `0 0 0 0` — the block visually "sits down" flush with the page.

### Named Rules
**The Hard-Offset-Only Rule.** Any shadow on this page is a flat, zero-blur, solid-color offset block — never a soft blurred glow. If a shadow has blur radius, it's a regression to the previous system, not a variant.

## 5. Components

### Buttons
- **Shape:** zero radius, 2px solid border.
- **Primary:** ember fill, ink text, weight 800, uppercase, `0.85em 1.7em` padding, hard ink offset shadow. Used in the hero, and as `.nav-cta` (offset shadow suppressed there — a small nav-scale button doesn't carry the full signature, to avoid clutter at that size).
- **Inverse (`.btn-inverse`):** ink fill, parchment text and border, parchment hard offset shadow. Used only in the closing section, which is a full ember field — the button must invert to read against it.
- **Hover:** press motion (translate + shadow collapse), 0.12s ease — no color change, no bounce.
- **Ghost/Link (`.link`):** no fill, 2px underline in `line`, text in `text-soft`; hover swaps text to full `text` and underline to ember. Sentence case, never uppercase (it reads as prose-adjacent, not a label).

### Chips / Tags
- **Roadmap tag:** zero-radius rectangular chip (no pill), weight 700, uppercase, 2px border. Two real per-item states: `--active` (solid ember fill, ink text, ink border) and `--planned` (moss text, line border, no fill) — never a single hardcoded label across all items.

### Cards / Containers ("image frames")
- **Corner Style:** zero radius throughout, both outer frame and inner image.
- **Background:** `ink-3`, 2px `line` border, 8–10px padding.
- **Shadow Strategy:** see Elevation — hard offset only, color varies by context (ember for the hero shot, line for gallery/ledger).
- **Ledger card** is the same frame treatment applied to a text block (a literal fake file tree in system monospace) instead of an image.

### Navigation
- Sticky, solid ink background (no gradient fade), 2px solid bottom rule. Brand mark is the wordmark in heavy uppercase Archivo (no italic, no serif) plus a one-time small uppercase tagline beside it (hidden under 860px). Links in `text-soft` at 0.9rem weight 600, ember on hover, plus a persistent ember `.nav-cta` so the download action stays reachable while scrolling. Under 860px, in-page links and the GitHub text link collapse behind a hamburger (`.nav-toggle`) that opens a full-screen `.nav-menu` — never a silent `display: none` with no replacement.

### Legend / Feature List (signature component)
A two-column icon+text list (`.legend-row`): a 44px filled `ink-3` square with a 2px `line` border and an ember stroke icon, beside a heading + description, separated by 2px hairlines rather than cards. Reuse this pattern for any new feature list instead of a boxed card grid.

### Highlight block (`.hl`)
A solid ember background directly behind a short inline text span (ink text on top) — used once, in the hero headline, to give one phrase full-block emphasis without gradient-clip text or italics. Reserve for a single deliberate moment per view, not a general "important word" treatment.

## 6. Do's and Don'ts

### Do:
- **Do** carry the whole page on one family (Archivo) through weight and case contrast — don't reach for a second family "for hierarchy"; that's what weight is for here.
- **Do** keep every corner hard (zero radius). A single rounded element breaks the bit.
- **Do** use the hard-offset-shadow-plus-press-on-hover motif as the one recurring signature — don't invent a second interactive treatment alongside it.
- **Do** let ember go full-field when the moment earns it (the closing section, the hero highlight) — that's the Committed strategy, not overuse, as long as it stays to one section/moment at a time.
- **Do** keep real product screenshots as the primary persuasive device.
- **Do** keep a persistent primary CTA reachable (`.nav-cta`) on any long scrolling page.
- **Do** give status pills their real per-item state rather than one hardcoded label.

### Don't:
- **Don't** reintroduce a serif display font, italics, or a decorative mono label anywhere — that was the previous system (an editorial-typographic lane that's currently the most saturated brand aesthetic) and it's been deliberately replaced, not merged with this one.
- **Don't** add border-radius to anything. Zero is the value, not a default waiting to be overridden.
- **Don't** reintroduce soft blurred shadows or rotation — any shadow is a flat, zero-blur offset block or nothing.
- **Don't** use gradient text, hero-metric stat blocks, glassmorphism, or cream/beige surfaces anywhere.
- **Don't** introduce parchment-and-dragons fantasy-tavern illustration, mascots, or quest-log copy.
- **Don't** let the mobile nav collapse with no replacement — the hamburger + full-screen menu is the settled pattern.
- **Don't** let a listed group (roadmap, legend, or similar) exceed 4 items without splitting into labeled sub-groups.
- **Don't** set body-length copy in uppercase — reserve uppercase for short labels, headings, and buttons.
