# config-settings Redesign Plan

Working plan for replacing the current config-settings concept. Edit this
doc from either Claude Code (CLI) or claude.ai (web) — both work off this
branch, so `git pull` before starting a session and push when you stop.

**Status:** working prototype at `redesign/prototype/index.html` — landing
gallery, token dashboard, six levers plus a shape override, image-led
light/dark theming, spec-conformant export. Open it in a browser; no build step.
**Scope:** blank sheet — VISU v4 is reference material, not a starting point.

---

## Goals

Turn the tool from *"upload an image, watch something pretty happen"* into
*"upload an image, walk away with a design system."*

The image stops being the subject of the output and becomes the **source of
truth for a set of design decisions**. The deliverable is a downloadable
`DESIGN.md` — a design system document that another designer, a developer,
or an AI coding agent can pick up and build from.

Three things the current version doesn't do:

1. **No takeaway.** v4's output lives and dies in the browser. Nothing leaves.
2. **No control.** The image decides everything; the user can't steer.
3. **No way in.** A blank upload button gives a first-time visitor no idea
   what the tool produces or why they'd want it.

---

## ⚠️ Key research finding: DESIGN.md is a real, open spec

This changes the shape of the project. `DESIGN.md` is not a format we invent —
it's an **open Apache-2.0 specification published by Google Labs** (~26k stars)
for describing a visual identity to coding agents. There is a companion CLI and
linter, `@google/design.md`.

**We should conform to it exactly.** The value of the export collapses if it's
a bespoke Markdown file; it multiplies if the output drops straight into any
agent-driven workflow that already reads the format.

### What the spec requires

A DESIGN.md file is **YAML frontmatter + Markdown body**. Frontmatter carries
machine-readable tokens; the body carries human-readable rationale. Tokens are
normative; prose explains how to apply them.

Frontmatter token groups: `colors`, `typography`, `rounded`, `spacing`,
`components`. Cross-references use `{path.to.token}` syntax — e.g. a button's
`backgroundColor: "{colors.primary}"`. Only `colors.primary` is strictly
required.

Body sections must appear in this order (any may be omitted):

1. Overview (aka Brand & Style)
2. Colors
3. Typography
4. Layout (aka Layout & Spacing)
5. Elevation & Depth
6. Shapes
7. Components
8. Do's and Don'ts

Two rules worth remembering while building the exporter: **duplicate section
headings are a hard error** (the file gets rejected), and **unknown sections
and token names are preserved without error**. That second rule is what makes
our extensions legal.

Tokens are designed to convert cleanly to and from `tokens.json`, Figma
variables, and Tailwind theme configs.

### Motion: not in the spec yet

The current spec has **no motion tokens at all**. There's an open proposal
(issue #47) for an additive `motion:` frontmatter block. Because the reference
parser silently drops unknown frontmatter keys, emitting `motion:` today is
backward-compatible — it just gets ignored by tools that don't know it.

The proposed schema, which we should adopt verbatim rather than inventing our
own:

```yaml
motion:
  duration:
    fast: 150ms
    medium: 300ms
    slow: 600ms
  easing:
    standard:   "cubic-bezier(0.2, 0, 0, 1)"
    emphasized: "cubic-bezier(0.2, 0, 0, 1.5)"
    decelerate: "cubic-bezier(0, 0, 0, 1)"
  prefers-reduced-motion-fallback:
    medium: 100ms
    slow:   100ms
```

Precedent for the values: Material Design 3, IBM Carbon, Fluent UI and Shopify
Polaris all publish duration + easing tokens. Material 3's scale is the most
granular and is a reasonable model for our generated ramp.

**The accessibility rule matters for our Animation Speed lever.** Anything over
roughly 200ms reads as *deliberate motion* rather than a state transition, and
WCAG 2.2 (2.3.3 Animation from Interactions) plus vestibular-sensitivity
guidance says it needs a reduced-motion path. So:

> Whenever a generated duration exceeds 200ms, we must also emit a
> `prefers-reduced-motion-fallback` entry. This should be automatic, not a
> checkbox the user can forget.

This is a real design opportunity — the Animation Speed lever can show the
reduced-motion fallback updating alongside the main value, which makes an
invisible accessibility obligation visible.

### Figma is moving the same direction

Figma Motion launched at Config 2026: a native timeline, keyframes, and
**motion variables** — easing and timing values defined as variables with modes,
so switching a mode updates every animation referencing it. Dev Mode exposes
every timing value and easing curve as copyable CSS, JSON or React.

Two implications:

- **Validation.** The industry is converging on motion-as-tokens. A tool that
  generates motion tokens from an image is aimed at a real gap, not a
  hypothetical one.
- **Interoperability target.** Our motion tokens should be shaped so they can
  be pasted into Figma motion variables. Since DESIGN.md tokens already map to
  Figma variables, this mostly comes free — but it argues for CSS-native values
  (`ms`, `cubic-bezier(...)`) over anything clever.

---

## Current State

What exists today (v4), and what happens to it:

| Piece | What it does | Verdict |
|---|---|---|
| `analysis.js` | K-means colour clustering, hue/brightness histograms, derives energy / temperature / complexity / luminance, generates a name | **Keep as the engine.** This is the valuable part. |
| `treatments.js` | Four full-screen canvas visuals (particle field, flow lines, chroma bloom, +1) | **Demote.** Becomes the pattern thumbnail, not the main event. |
| `cards.js` | Info cards overlaid on the visual | **Replace** with the token dashboard. |
| `app.js` | Two-page flow: upload → visual, with control bar and history strip | **Rewrite** around the new structure. |
| `index.html` / `styles.css` | v4 shell | **Rebuild.** |
| `elw/` | Unrelated standalone piece | **Leave alone.** |

The analysis maths already produces most of what the token model needs. That's
why this redesign is realistic rather than aspirational. Gaps are listed under
*Buildability* below.

---

## Concept

**An image in, a DESIGN.md out.**

Upload a photograph, an artwork, a screenshot, a mood board. The tool reads its
colour, contrast, density and rhythm, and proposes a complete token set —
palette, type scale, corner radius, spacing, motion timing, and a generative
pattern. The user tunes those proposals with a small set of levers, then
exports a spec-conformant `DESIGN.md`.

The image is not decoration. Its **colour** sets the palette, its **energy**
sets motion and weight, its **complexity** sets density, and its **dominant
shapes** set the pattern geometry.

---

## Screen 1 — Landing / Gallery

The front door. Not a blank upload button on an empty stage.

**Eight curated seed images ship with the tool.** They exist so a first-time
visitor can see real output before committing a file of their own. They should
be chosen to span the range the engine can express — something near-monochrome,
something high-chroma, something architectural and hard-edged, something
organic and soft — so the gallery doubles as a demonstration of what the levers
actually do.

The eight shipped are: `10dark` (warm dark monitor), `blackdashboard`
(near-monochrome), `blueredrun` (high-chroma diagonal collage),
`bluescreensplash` (hard geometric poster), `brightsquare` (flat vector),
`goast` (soft organic gradients), `goldlake` (split horizontal landscape),
`poster100` (muted editorial). Between them they cover monochrome to
high-chroma and rigid to organic.

**Changed during the build: seeds are analysed live, not pre-baked.** The plan
called for pre-baked thumbnails to guarantee a fast first paint. In practice a
single analysis takes a few milliseconds, so the eight run staggered behind the
first paint and every tile on the landing page is real engine output. Nothing
on the page is a promise the tool can't keep, and there are no stale baked
assets to regenerate whenever the engine changes.

**The eight images ship inlined as data URLs** (`seeds-data.js`, ~363 KB).
That is not an optimisation. A page opened from `file://` cannot call
`getImageData` on a canvas that has drawn a local file — the canvas is tainted
and the read throws — so path-loaded seeds would fail silently for anyone who
just double-clicks the HTML. Data URLs are same-origin, so analysis works with
no server and no browser flags. Regenerate with `tools/build-seeds.py`.

### The paired tile

This is the core visual idea of the landing page. **Every entry is a pair:**

```
┌─────────────┬─────────────┐
│             │             │
│   SOURCE    │   PATTERN   │
│   IMAGE     │  / DATA     │
│             │             │
└─────────────┴─────────────┘
        System name
```

Left: the source image. Right: **the generated pattern with the extracted
palette as a strip along the bottom**, rendered at exactly the same size. Same
treatment for every entry — the eight seeds and any upload.

*Decided.* The palette strip earns its place: it's the one piece of the system
that's unambiguously derived from the image, so it makes the translation legible
at a glance without needing a caption. Token counts and other metadata stay off
the tile — they belong on the dashboard.

The equal sizing is the argument the page makes: input and output carry the same
weight. Set them side by side and the viewer reads the translation immediately.

### Uploads

An upload button sits with the gallery rather than dominating the page.
Uploading goes straight to the dashboard.

Navigating back, the uploaded image **appears above the eight seeds** as a new
paired tile, visually identical in construction. Multiple uploads stack newest-
first above the seed set.

### Persistence: session only, deliberately

Uploads live in memory for the session and are **not** stored. Close the tab
and they're gone.

This is a deliberate product decision, not a shortcut. We can't control what
people upload, and storing arbitrary user images creates obligations we don't
want at this stage.

**Future paid tier:** log in, keep your gallery, keep your exported DESIGN.md
files. The session-only behaviour today is the free tier — the plan should
leave a clean seam for accounts later rather than pretending they'll never
exist.

**Design consequence, and it needs handling:** a user who exports a DESIGN.md
and then refreshes loses their system. The landing page needs to be honest
about this before they invest effort — a quiet, non-nagging line near the
upload zone, and probably a confirmation if they try to leave the dashboard
without exporting. Getting this tone right matters; done badly it reads as the
tool apologising for itself.

---

## Screen 2 — Token Dashboard

Where the work happens. Three regions:

**Left — the source.** The uploaded image with its extracted palette beneath.
Swatches are clickable to lock or reject a colour.

**Centre — the tokens.** Grouped to mirror DESIGN.md's own section order, so
what you see on screen maps one-to-one onto what you export:

- *Colors* — `primary` (required), `secondary`, `tertiary`, `neutral`,
  `surface`, `on-surface`, plus a tonal ramp
- *Typography* — a Google Fonts pairing chosen from the image, plus 9–15 levels
  using semantic names (`headline-lg`, `body-md`, `label-sm`). See *Typography &
  font selection* below.
- *Layout / Spacing* — base unit and the resulting scale
- *Shapes / Rounded* — `none`, `sm`, `md`, `lg`, `xl`, `full`
- *Motion* — duration and easing ramps, with reduced-motion fallbacks
- *Pattern* — the generative motif *(our extension; legal as an unknown section)*

Each token shows its value, a live preview, and a one-line rationale
("radius 16px — low energy image, softer corners"). **The rationale is not
decoration — it becomes the Markdown prose in the exported file.** The prose
half of DESIGN.md is what makes it useful to an agent, so we should be
generating it as we go, not bolting it on at export.

**Right — the levers.** Two kinds, deliberately:

**Coupled offsets** (−100…+100 from the image's own reading). Each moves
several tokens at once so the system stays internally consistent — you tune a
feeling, not thirty numbers.

| Lever | Range | What it moves |
|---|---|---|
| **Tone** | cool ← → warm | Palette temperature; every colour token together |
| **Energy** | calm ← → bold | Type weight, type scale ratio, pattern weight, motion speed |
| **Animation speed** | slow ← → fast | Duration tokens, plus their reduced-motion fallbacks |
| **Density** | sparse ← → dense | Base type size and pattern element count |

**Absolute controls** (0–100). These are direct: the number on screen is the
number in the exported file, and no other lever can move them behind your back.

| Lever | Range | Maps to |
|---|---|---|
| **Curve** | 0 square … 100 fully round | Panel and button corner radius, 0px → 32px |
| **Padding** | 0 tight … 100 airy | Space *inside* things — button, chip, card and panel padding — plus the base spacing unit 4px → 40px and base text size |
| **Button size** | 0 compact … 100 large | Control height 26px → 56px; chips and inputs scale with it but stay distinct |

**Pattern group** — the shape override and everything that governs how the
pattern is drawn, kept together rather than scattered through the panel:

| Control | Range | Maps to |
|---|---|---|
| **Shape** | 8 primitives + auto | Overrides the inferred primitive |
| **Grain** | 0 coarse … 100 fine | Marks per unit area, after Bertin — size and spacing move together, ink held constant |
| **Blur** | 0 crisp … 100 soft | Gaussian softening, exported as a token and applied to the page backdrop |
| **Opacity** | 0 … 100 | How present the pattern is, in the tile and behind the page |

Density used to be a coupled lever that also moved spacing and base type size.
Those now belong to Padding, which is where a user looks for them. Grain is a
pattern control and does nothing else.

### Component size is a control, not a constant

An earlier accessibility pass set `min-height:44px` on every button to satisfy
target-size guidance. That met the letter of 2.5.5 and broke the design: every
control became the same size and there was no way to make a compact one.

**Visual size and hit area are now separate concerns.** Button height is a token
driven by the Button size lever (26–56px); the 44px target is carried by an
invisible pseudo-element that does not affect layout. A 26px button is still
comfortably reachable. Components are also deliberately *not* uniform — button,
chip and input take related but distinct values off one scale, and the exported
`components` block states each height, its padding, and `minTargetSize: 44px`
with the reason.

The split matters. Coupling is right for qualities you *judge* — how bold, how
warm. It's wrong for quantities you *specify*: if you set a panel radius you
expect it to stay set. Curve and Padding start at a position read off the
image, and go absolute the moment you touch them.

**Pattern shape override.** The pattern primitive is inferred from image
geometry, and inference on a busy photograph is not always right — see *Where
inference stops* below. A row of shape buttons lets you overrule it. Which one
the engine inferred stays marked, and the override is recorded in the export.

**The dashboard is styled by the DESIGN.md it generates.** The page background
is `surface`, its text is `on-surface`, panels are `neutral`, the typeface is
the chosen Google Font at the generated weight and line height, and padding,
corner radius, transition duration and easing all resolve to generated tokens.
The generated pattern sits behind the whole page at low opacity. Move a lever
and the interface restyles itself. A live component strip at the top of the
token column shows buttons and a card built from nothing but the tokens.

### Light or dark is the image's decision

A dark photograph should not produce a white interface. When the source's mean
luminance falls below the threshold the system inverts: `surface` becomes a deep
tone, `on-surface` a near-white, and elevated surfaces get *lighter* rather than
darker. Of the eight seeds, three come out dark.

**The background always carries the image's hue.** Hue is taken from the
*dominant* colour, not the lightest cluster — the lightest cluster is usually a
near-white highlight with no hue at all, which is exactly how a vividly coloured
image ends up with a generic grey page. Light backgrounds sit at 95–96%
lightness rather than 98%, because at 98% a tint is arithmetically present and
visually absent, and every image resolves to the same off-white. The eight seeds
now produce eight distinguishable backgrounds — cool mint, warm blush, pale
blue, two different creams, and three tinted darks.

### Accessibility — WCAG 2.1 AA, guaranteed by construction

Every colour is walked away from the background until it clears its target
before being written to the file: `on-surface` 7:1, `primary`, `secondary` and
`tertiary` 4.5:1. Doing this in the tokens rather than in a stylesheet means the
exported DESIGN.md is legible for whoever opens it next, not only on our page.

**Two bugs the audit caught that nothing else would have.**

*Colours were only ever checked against `surface`.* But text sits on panels too,
and `neutral` is a different tone — so a token clearing 4.5:1 on the page could
sit at 3.80:1 on a card. Sweeping 19 sources × 81 lever positions found **3,672
failing pairs out of 50,787**, every one of them on a panel. Foregrounds are now
validated against *both* grounds, and `neutral` is always the harder of the two.

*Type could reach 8.1px.* An aggressive scale ratio applied downward drove
`label-sm` far below readable size at tight padding. Negative steps now use a
gentler ratio and nothing is generated below **11px** — unreadable text is
unreadable regardless of its contrast.

**Adversarial sources.** Because uploads are arbitrary, the sweep includes
eleven synthetic worst cases alongside the eight seeds: pure white, pure black,
mid grey, neon yellow, neon cyan, pastel, near-black, single-hue, blown-out
highlights, hard two-tone, and sepia. **24,696 assertions, zero failures.**

**The markup, not just the maths.** Contrast is the part tokens can guarantee;
the rest had to be fixed in the page — a global `:focus-visible` ring on a
colour already guaranteed above 3:1 (2.4.7), every interactive control raised to
a 44px target (2.5.5), the export sheet given `role="dialog"`, `aria-modal`, a
focus trap and focus restoration (2.1.2, 2.4.3), swatches given real names and
`aria-pressed` (4.1.2), the shape picker made a `radiogroup`, canvases labelled
or marked decorative (1.1.1), live regions on the loader and lint status, and a
`prefers-reduced-motion` block so the prototype honours what its own exports
preach (2.3.3). The inferred shape is marked with a glyph as well as a border
colour, so meaning never rides on colour alone (1.4.1).

**The export documents its own conformance.** An `## Accessibility` section
carries the full pair-by-pair contrast table with measured ratios, and states
plainly what tokens *cannot* guarantee — keyboard order, focus management, touch
targets, labelling and name/role/value in the consumer's own components. A
generated design system should not imply it has made those decisions for you.

---

## Pattern generation

A pattern is a **primitive** arranged by a **layout**. Both are chosen from
image geometry, never from colour, so two images that happen to share a
dominant edge angle still produce visibly different patterns.

**Primitives:** `rect`, `bar`, `circle`, `triangle`, `lozenge`, `arc`, `blob`
**Layouts:** `grid`, `bands`, `columns`, `concentric`, `radial`, `stack`, `scatter`

Chosen from six measurements taken off the image:

| Metric | What it captures | What it drives |
|---|---|---|
| `rectilinearity` | share of edge energy on the dominant axis and its perpendicular | boxes vs. curves |
| `featureScale` | mean run length between luminance crossings | few big shapes vs. many small |
| `radial` | correlation of luminance with distance from centre | concentric arrangements |
| `banding` / `bandStrength` | row variance vs. column variance | horizontal bands vs. columns |
| `symV` / `symH` | mirror symmetry | radial vs. scattered |
| `peakCount` | distinct peaks in the edge-angle histogram | 1 = stripes, 2 = grid, 3+ = scatter |

Element count, jitter, corner rounding, stroke weight and fill-vs-outline are
continuous, so the space is far larger than the 49 shape × layout pairs.
Placement uses a seeded PRNG, so a given image always draws the same pattern.

Output is an SVG, and the same renderer fills the right half of every gallery
tile and the backdrop of the dashboard.

**The pattern is drawn on `surface`** — the same ground as the page it belongs
to. It previously used `on-surface`, which meant the gallery tile advertised a
system the dashboard never rendered.

Blur and opacity are exported as pattern tokens, so a consumer of the file
reproduces the intended treatment rather than just the geometry.

**Against the eight seed images this produces 7 distinct combinations from 8
images.** The one repeat is `bar`/`bands`, on two images that genuinely are
dark horizontal compositions.

## What cartography contributes

Map design has spent a century on precisely this problem — encoding information
in pattern, texture and colour without misleading the reader. Three ideas from
it are now built in rather than merely cited.

### Grain is not density (Bertin)

Bertin's *Sémiologie Graphique* (1967) defines **grain** as "the number of
separable marks within a unit area", and — the important part — varies it by
changing mark size **and** spacing together *while holding the ink ratio
constant*, so the average value of the area does not shift.

Our Density lever was not doing that. It changed element count only, so turning
density up also made the pattern heavier: you could not make a texture finer
without darkening it. That conflates two of Bertin's variables, grain and value.

Grain now scales element size and stroke by 1/√k against a count multiplier of
k, holding total ink roughly fixed. Measured on `brightsquare`: marks go 8 → 49
across the lever while mean rendered value moves 223.8 → 226.4, about 1%. The
texture gets finer without getting heavier, and *value* is left to Opacity where
it belongs. The lever is now labelled **Grain**, coarse → fine.

### Palettes carry an implied order — say which (ColorBrewer)

ColorBrewer's central distinction is between **sequential** (ordered by
lightness, for magnitude), **diverging** (two hues against a light middle, for
data with a real midpoint) and **qualitative** (several hues, no order, for
categories). Using a qualitative set to imply magnitude is one of the standard
ways a chart misleads.

The export was handing someone six colours with no statement about whether they
carry order. Palettes are now classified from hue separation and lightness
range, and the doc names the class and states the rule that goes with it —
"qualitative sets carry no order; use these hues to separate categories, never
to imply magnitude, rank or progression".

### Figure and ground bounds the decoration

Cartography's oldest layout rule: ground must stay ground. The backdrop pattern
composites its own colours over `surface`, which shifts the effective background
under every piece of body text — so a hand-picked opacity is a guess.

The backdrop alpha is now *solved* rather than chosen: the largest value at
which body text still clears 4.5:1 against the worst ground the pattern can
composite. Turn Opacity to 100 and the backdrop stops where legibility stops.
Verified across five sources × five opacity settings × three tone positions,
against every palette colour.

### Noted, not built

Bertin also observes that **orientation is a coarse channel** — he suggests four
steps, because people cannot reliably separate more. Our pattern angle is
continuous, which is fine for a decorative texture but would be wrong if the
pattern ever encoded data. Worth remembering if this grows into charting.

### Reading the subject, not the frame

Whole-frame statistics describe the frame, not the subject. In a photograph of
a monitor in a room, the room is most of the pixels: beige walls dominate the
palette and flat wall dilutes every structural measurement, so the thing a
designer actually looks at gets averaged away.

Every cell of the image is scored for chroma and detail; the cells well above
average are kept; the bounding box of the largest connected run of them becomes
the **focus region**, and all structural analysis happens inside it. If nothing
stands out — a flat lay, a full-bleed poster — it falls back to the whole frame,
which is the honest answer for those images. Five of the eight seeds focus;
three legitimately don't.

Verified by eye: the box lands on the wave on the monitor screen in `10dark`,
the coral fabric in `goast`, the orange band in `goldlake`.

### Overlay panels

Large flat axis-aligned regions sitting on busier content — the translucent app
window in `10dark`. Detected via a coarse variance grid and a largest-rectangle
scan. Two uses: the region is **masked out of the flow analysis**, because
measuring flow through a panel mixes the gradient underneath with the dense
hard-edged text on top and the two cancel; and its presence changes the
Elevation section of the export from tonal layering to layered translucent
surfaces.

### What didn't work

**`orthogonality`** — how close the dominant edge is to 0°/90°. Photographic
content nearly always peaks near the horizontal or vertical, so it reads ≈0.94
for seven of the eight seeds and separates nothing. Still computed and reported;
nothing branches on it.

**Global brightness ridge for wave detection.** The first attempt tracked the
brightest row per column. On `10dark` the ridge jumps between the bright window
behind the monitor and the screen in front, reading as noise. Replaced with a
local block-orientation field.

### Where inference stops

Detecting "this image contains a wave" is not reliably solvable from geometry
alone, and the plan should say so rather than pretend.

Four signals were tried in sequence — rotation magnitude, turn consistency, edge
softness, and masking the overlay panel. Each improved things; none produced a
clean separation. The failure is legible: in `10dark` the golden wave and a
dense hard-edged text panel occupy the same region, so softness and consistency
pull in opposite directions. Meanwhile a curved ultrawide monitor bezel
(`blackdashboard`) genuinely *does* produce smooth consistent turning, and
scores higher than the actual wave.

Lowering the threshold until `10dark` qualifies turns five of the eight seeds
into waves and destroys the variety the vocabulary exists for.

**So the pattern shape is a proposal with a manual override**, exactly like the
typeface. This is consistent with the rest of the tool and more honest than a
classifier that is confidently wrong. The inferred value stays marked in the UI
and is recorded in the exported doc alongside any override.

---

## Typography & font selection

Yes — we can pull from Google Fonts and pick a typeface from the image. The
research says do it with a **curated shortlist plus the CSS2 loader**, not with
the Fonts API.

### Why not the API

The Google Fonts **Developer API** (the one that lists every family with
metadata) **requires an API key on every request**. A key can't be shipped in a
client-side, no-build HTML file without exposing it. That rules it out for the
prototype.

The **CSS2 API** (`fonts.googleapis.com/css2`) needs **no key at all**. So we
can *render* any Google Font freely — we just can't *enumerate* them at runtime.

### Nothing is embedded except a list of names

To be explicit, because the wording matters: **no font files are bundled.** All
fonts load from Google over the keyless CSS2 link, in both the app and anything
built from an exported DESIGN.md.

What sits locally is a small array of font *names and tags* — around 25 entries
of `{ name, category, contrast, warmth, weightRange }`, a few KB. That exists
only because enumeration is the one operation requiring a key. We can load any
font without a key; we just can't ask Google what fonts exist without one.

The alternatives are worse: a serverless proxy to hide a key adds a backend and
kills the open-it-from-disk simplicity, and a static snapshot of all ~1,800
families is a far *larger* local list that also produces worse matches.

### The approach: curated shortlist

A hand-picked set of roughly 20–30 Google Fonts, each tagged with attributes the
analysis can actually match against:

| Attribute | Example values | Driven by |
|---|---|---|
| Category | grotesque, geometric, humanist, serif, slab, display, mono | complexity + energy |
| Contrast | low / medium / high | image contrast |
| Warmth | neutral, humanist, soft-terminal | temperature |
| Weight range | e.g. 200–900 | whether it's variable |

A curated list beats the full library anyway. Matching against 1,800 families
produces confident-looking nonsense; matching against 25 well-chosen faces that
span the expressive range produces defensible results, and every one can be
checked by eye before it ships.

### Variable fonts make the Energy lever work properly

The CSS2 API supports variable axis ranges —
`?family=Crimson+Pro:wght@200..900` returns a variable font with that range
baked in. If we bias the shortlist toward variable fonts, the **Energy lever can
drive font weight continuously and in real time** rather than snapping between
400 and 700.

That's a much better interaction than the discrete `cardWeight` step the current
code does, and it makes the lever feel like it's tuning a system rather than
flipping switches.

### Honesty about the inference

Colour → palette is a genuine derivation. **Image → typeface is an inference,
not a derivation** — a warm, low-energy photograph doesn't logically entail a
humanist serif, it just tends to sit well with one.

So the font is a **proposal with a stated rationale and a visible swap control**.
That's consistent with how the rest of the tool works, and it's more honest than
presenting a typeface as if it fell out of the maths. The rationale line ("warm,
low-contrast source — humanist serif with soft terminals") goes into the
exported prose, where it's genuinely useful to whoever reads the file next.

### What the exported DESIGN.md carries

The spec's `Typography` token has exactly these fields: `fontFamily`,
`fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `fontFeature`,
`fontVariation`. **There is no field for a font source or URL.** The format
names a font; it has no opinion on where you get it.

That's correct behaviour — a design system document shouldn't ship font
binaries. So the export names the family and the consumer loads it. We make that
frictionless by putting the ready-to-paste Google Fonts link in the `##
Typography` prose section, which is free-form:

```markdown
## Typography

Set in **Crimson Pro**, a humanist serif with low stroke contrast — chosen for
the source image's warm temperature and low energy.

Load from Google Fonts:
`https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@200..900&display=swap`
```

Note the variable weight range in that URL. It matters: `fontVariation` maps to
CSS `font-variation-settings`, so a system generated with the Energy lever at
an in-between position can export a genuine intermediate weight (say 437) rather
than rounding to the nearest hundred. The spec supports this natively.

### Fallback

Emit a real CSS font stack, not a bare family name, so the exported DESIGN.md
degrades gracefully where the font isn't available or the network is blocked.

---

## Screen 3 — Export

A review sheet over the dashboard: preview the file, choose what to include,
download.

Output is a **spec-conformant DESIGN.md** — YAML frontmatter followed by the
eight body sections in prescribed order, with our `motion:` block and `## Pattern`
section as additive extensions.

Validate against `@google/design.md` before shipping. If our output doesn't pass
the official linter, the export isn't finished.

Stretch, not v1: `tokens.json`, a CSS custom-properties file, a Figma variables
export, and the pattern SVG bundled as a zip.

---

## Buildability

Checked against the existing code:

**Already there** — colour clustering, primary/accent extraction, energy,
temperature, complexity, average luminance, and radius/weight/gap derivation.
This covers Colors, Shapes and Spacing with only light new work.

**Light new work** — tonal ramps from existing clusters; WCAG contrast ratings
(the spec converts all colours to sRGB for contrast checking, so this is
expected of us); an energy→duration mapping for motion; YAML frontmatter
serialisation.

**Genuinely new** — edge/angle detection for patterns, and shape
classification. No prior art in the codebase.

**Invention, flagged as such** — type *size* scales. Colour genuinely comes from
the image; type weight is a defensible stretch; type size is closer to
guesswork. See Open Questions.

---

## Open Questions

- **How do we warn about session-only loss without being annoying?** Needs a
  tone decision. A quiet line near upload, plus an export prompt on leaving the
  dashboard, is the current thinking.
- **How opinionated should the type scale be?** Font *family* is now settled
  (curated Google Fonts shortlist) and *weight* follows from energy via variable
  axes. Size is the open part — the spec expects 9–15 levels, which is a lot to
  derive from a photograph. Generate a full scale, or derive 3–4 and fill the
  rest from a standard ratio ramp?
- **How many fonts per system — one or a pairing?** The spec's own example uses
  two families (one for narrative, one for technical/label text). A pairing is
  richer but doubles the matching problem.
- **Should we emit `motion:` at all given it's not yet in the spec?** Yes,
  probably — it's backward-compatible and it's the most distinctive thing we
  generate. But worth a conscious decision, and worth watching issue #47.
- **Should levers be resettable per-token?** If someone hand-overrides radius
  and then moves the Energy lever, does the override survive?
- **Accessibility: constraint or report?** Does the tool refuse to propose a
  failing contrast pair, or propose it and flag the failure? Leaning
  flag-not-block, but it's a real fork. Note this is *separate* from the
  reduced-motion fallback, which should be automatic and non-optional.
- ~~**What happens with a bad source image?**~~ **Settled during the build.**
  Detect and say so. `blackdashboard` is genuinely near-monochrome — every
  cluster sits at 8–9% saturation — so there is no accent to find. The system
  now measures *chroma* rather than HSL saturation, flags the source as
  monochrome, tags it in the UI, and writes a plain warning into the exported
  doc telling the reader to bring a highlight colour from outside the image.
  Faking an accent would have been worse than admitting there isn't one.
- **Do we generate a `components` block?** The spec supports it and agents
  benefit from it, but deriving button padding from a photograph is a stretch.
  Possibly generate it from the other tokens rather than from the image.

---

## Prototype

Living prototype: `redesign/prototype/index.html`

Build order:

1. ✅ Landing page — paired-tile gallery, upload zone, placeholder frames
   awaiting the 8 seed images
2. ✅ Dashboard shell — three regions
3. ✅ Real analysis engine wired in — tokens populate from a real upload
4. ✅ Font shortlist — 28 variable Google Fonts, loaded via keyless CSS2
5. ✅ Levers — coupled, live-updating; Energy drives variable font weight
6. ✅ Pattern generation — Sobel edge/angle detection, four motifs
7. ✅ Eight seed images wired in, analysed live *(pre-baking dropped — see above)*
8. ✅ Export — spec-conformant DESIGN.md + pattern.svg
9. ✅ Dashboard restyled by its own generated tokens
10. ✅ Pattern rebuilt as primitive × layout from image geometry
11. ✅ Focus-region analysis, overlay-panel detection, flow measurement
12. ✅ Light/dark theme from the image; image-tinted backgrounds
13. ✅ Curve and Padding as absolute 0–100 controls; shape override
14. ⬜ Validate output against the official `@google/design.md` linter
    *(currently checked by an internal structural linter only)*
15. ✅ WCAG 2.1 AA verified across seeds, adversarial synthetics and the full
    lever space; conformance table written into the export
16. ⬜ Reduce how often `bands` wins the layout — three of eight seeds land
    there, which is the weakest remaining spot in the vocabulary
17. ⬜ Manual assistive-technology pass — the audit is automated, and automated
    checks catch roughly a third of real accessibility problems

### Notes from the build

**Edge detection needed an adaptive threshold.** The first pass used a fixed
gradient cut-off, which silently discarded soft imagery entirely — a smooth
radial gradient and a flat grey produced identical, meaningless output. The
threshold now adapts to each image's own mean gradient, and genuinely
structureless images are reported as `structured: false` rather than being
given an invented dominant angle. The exported prose says so explicitly.

**K-means was emitting duplicate colours.** It returned `#58c0fe` and
`#57c1fe` as two separate clusters, which then became primary and secondary —
a palette containing the same colour twice. Near-identical clusters are now
merged before the palette is built.

**HSL saturation is the wrong measure for picking an accent.** A near-white
cream reads as "92% saturated" in HSL, so the unweighted pick handed
`poster100` an accent indistinguishable from its background. The accent is now
chosen on *chroma* weighted by distance from the primary, which gives
`blueredrun` a red accent against its cyan primary — the obviously right answer
that saturation-sorting missed.

**Test coverage.** 26,109 assertions across three headless suites — 323 over five
synthetic sources (vertical stripes, diagonals, soft blob, moiré noise, flat
grey) and 357 over the eight real seed images. They cover colour maths,
contrast ratios, palette distinctness, lever coupling, DESIGN.md section order,
YAML validity, SVG integrity, the reduced-motion invariant across the whole
lever space, theme selection, background tinting, absolute-lever monotonicity
and independence, shape overrides, and a full WCAG 2.1 AA sweep over 19 sources
× 81 lever positions.

**Blur's range was set by looking, not by arithmetic.** The first mapping ran to
26px, and rendering the slider at 0/25/50/75/100 showed the top half was
indistinguishable brown fog — half the control did nothing useful. At 5% of the
short edge the whole range stays legible. Blur is also scaled to the artwork
rather than being a fixed pixel count, so a small tile and a full-bleed backdrop
soften by the same visual amount.

**Two rasterisers silently ignore SVG filters.** ImageMagick's internal renderer
and cairosvg both drop `feGaussianBlur` without complaint, which initially
looked like a bug in the exporter. It wasn't — the SVG was correct throughout.
Worth remembering before trusting a rasterised check of anything using filters.

**Not covered: anything visual in the running page.** No headless browser was
available, so layout, legibility and whether the generated systems actually
*look* good in situ are unverified by machine. Patterns, palettes, themes and
lever ranges were checked by rendering them to images and looking; the assembled
interface was not.

Single self-contained HTML file for as long as that's practical, so it can be
opened straight from disk with no build step.

---

## References

- [DESIGN.md specification](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md) — the format we must conform to
- [design.md repository](https://github.com/google-labs-code/design.md) — spec, examples, and the `@google/design.md` CLI/linter
- [Motion tokens proposal (issue #47)](https://github.com/google-labs-code/design.md/issues/47) — the `motion:` schema we adopt
- [Design Tokens Format Module 2025.10](https://www.designtokens.org/tr/drafts/format/) — W3C DTCG; the spec's parent influence
- [Material Design 3 — easing and duration tokens](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs) — model for our generated ramp
- [WCAG 2.2 — Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions) — the 200ms reduced-motion obligation
- [Google Fonts Developer API](https://developers.google.com/fonts/docs/developer_api) — full metadata list, but **requires an API key**
- [Google Fonts CSS2 API](https://developers.google.com/fonts/docs/css2) — keyless font loading, variable axis ranges (`wght@200..900`)
- [Getting the Most Out of Variable Fonts on Google Fonts](https://css-tricks.com/getting-the-most-out-of-variable-fonts-on-google-fonts/) — axis syntax reference
- [Introducing Figma Motion](https://www.figma.com/blog/introducing-figma-motion/) — motion variables, Dev Mode export
- [Config 2026 recap](https://www.figma.com/blog/config-2026-recap/)
