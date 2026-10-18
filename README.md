# Pele Diagrams for DokuWiki

A DokuWiki plugin that renders **Mermaid** diagrams using
[Pele](https://pele.run/) — the lightweight, themeable Mermaid renderer
([obsidianmd/pele](https://github.com/obsidianmd/pele), MIT).

Pele is small (~230 kB gzipped), synchronous, has no runtime dependencies,
supports every diagram type built into Mermaid 12.1.0, and adapts its layout
to the container width. The library is bundled, so no external CDN request
is needed and it works under DokuWiki's default Content-Security-Policy.

## Usage

Wrap Mermaid syntax in a `<pele>` block (the opening tag must be on its
own line):

```
<pele>
flowchart TD
    A[Start] --> B{Yes or no?}
    B -- Yes --> C[Continue]
    B -- No --> A
</pele>
```

Works in DokuWiki pages:

```html
<pele>
sequenceDiagram
    participant Wiki
    participant Pele
    Wiki->>Pele: Mermaid text
    Pele-->>Wiki: SVG in 0.1 ms
</pele>
```

Diagrams render client-side in the browser. Without JavaScript the raw
Mermaid source is shown instead of a blank box, and Pele's error messages
(including the offending source) are displayed as text when a diagram
fails to parse.

## Installation

Manual install (git):

```bash
git clone https://github.com/YOURUSER/pele-dokuwiki lib/plugins/pele
```

Then log in as admin and open the Configuration Manager once so the
plugin's defaults are picked up, or just start editing pages — no further
setup is required.

## Configuration

Configuration Manager → "Pele Diagrams":

| Setting  | Default | Meaning |
|----------|---------|---------|
| `loadlib` | `1`     | Load the bundled Pele library automatically. Set to `0` if your template or another plugin already provides `window.pele`. |
| `cdn`     | empty   | Empty: serve the bundled copy from `lib/plugins/pele/dist/pele.global.js`. Set a URL to load Pele from a CDN instead, e.g. `https://cdn.jsdelivr.net/npm/pele@1/dist/pele.global.js`. |

## Theming

Pele is themed entirely with CSS variables, and color changes apply without
re-rendering. Override them for the wiki (e.g. in
`conf/userstyle.css` or the template):

```css
.dokuwiki .pele-diagram {
    --pele-bg: #fffcf0;
    --pele-fg: #100f0f;
    --pele-muted: #6f6e69;
    --pele-line: #100f0f;
    --pele-surface: #f2f0e5;
    --pele-surface-alt: #e6e4d9;
    --pele-border: #cecdc3;
}
```

This also makes dark-mode switching a single variable swap.

## Security

The rendered SVG contains no scripts, event handlers, or HTML, and Pele
never runs code from a diagram; links and images are limited to web
addresses and both source and output have size limits. Diagram sources are
embedded in the page HTML-escaped, and render errors are displayed as text.
See Pele's [SECURITY.md](https://github.com/obsidianmd/pele/blob/main/SECURITY.md)
for handling untrusted diagrams.

## Plugin contents

```
plugin.info.txt          plugin metadata
syntax.php               <pele> block → diagram container
action.php               injects the Pele library script tag
script.js                renders each container with pele.mount()
style.css                container, fallback and error styling
conf/                    configuration defaults and metadata
lang/en/settings.php     English config labels
dist/pele.global.js      bundled Pele 1.6.0 (MIT, obsidianmd/pele)
.harness/                standalone PHP/Node test harness (dev only)
```

## Licenses

- Plugin code: MIT
- Bundled `dist/pele.global.js`: Pele 1.6.0, MIT License,
  Copyright (c) obsidianmd/pele contributors — https://github.com/obsidianmd/pele
