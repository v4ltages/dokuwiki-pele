# Pele Diagrams for DokuWiki

A DokuWiki plugin that renders **Mermaid** diagrams using
[Pele](https://pele.run/) — the lightweight, themeable Mermaid renderer
([obsidianmd/pele](https://github.com/obsidianmd/pele), MIT).

Pele is small (~250 kB gzipped), synchronous, has no runtime dependencies,
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

Diagrams render client-side in the browser. The edit preview works as
well: DokuWiki's preview is a full page load, so it includes both the
Pele library and the plugin's renderer. Diagrams that appear after the
page has loaded — e.g. content fetched by other plugins via AJAX — are
picked up automatically.

Failures are visible rather than silent. Without JavaScript the raw
Mermaid source is shown instead of a blank box. If the Pele library
itself fails to load, a visible error says so instead of silently
falling back to the source. And when a diagram fails to parse, Pele's
error message (including the offending source) is displayed as text.

## Installation

Manual install (git):

```bash
git clone https://github.com/v4ltages/dokuwiki-pele lib/plugins/pele
```

No further setup is required — the bundled defaults work out of the box.
The Configuration Manager offers the settings below if you want to change
them.

## Configuration

Configuration Manager → "Pele Diagrams":

| Setting  | Default | Meaning |
|----------|---------|---------|
| `loadlib` | `1`     | Load the bundled Pele library automatically. Set to `0` if your template or another plugin already provides `window.pele`. |
| `cdn`     | empty   | Empty: serve the bundled copy from `lib/plugins/pele/dist/pele.global.js`. Set a URL to load Pele from a CDN instead, e.g. `https://cdn.jsdelivr.net/npm/pele@1/dist/pele.global.js`. |

## Theming

Pele is themed entirely with CSS variables, and color changes apply without
re-rendering.

By default the plugin maps those variables to the active template's palette
(DokuWiki's `style.ini` placeholders), so diagrams match the template's
colors automatically. Templates that switch their palette for dark mode
take the diagrams with them — no per-wiki configuration needed.

To use a custom palette instead, override the variables in
`conf/userstyle.css` (or the template); user styles load after plugin
styles, so they win:

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

On a template without dark mode, the same variables under a
`@media (prefers-color-scheme: dark)` block (or a body class of your
choice) give diagrams a dark palette, and switching applies instantly to
already-rendered diagrams.

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
action.php               injects the Pele library script tag (incl. edit/preview actions)
script.js                renders each container with pele.mount(), incl. AJAX-inserted content
style.css                container, template palette mapping, fallback and error styling
conf/                    configuration defaults and metadata
lang/en/settings.php     English config labels
dist/pele.global.js      bundled Pele 1.6.0 (MIT, obsidianmd/pele)
dist/LICENSE             Pele's MIT license (incl. the Lucide ISC notice)
.harness/                PHP/Node test harness for user/developer testing
```

## Testing

The `.harness/` directory contains a standalone test harness that verifies
the plugin without a DokuWiki installation — useful for developers making
changes and for users who want to check the plugin before deploying it:

```bash
php .harness/test.php    # syntax + action component (stubbed DokuWiki API)
node .harness/js-test.mjs # renderer (fake DOM)
```

Each prints one PASS/FAIL line per check and exits non-zero on failure.
`test.php` runs only from the command line: the plugin directory is
web-accessible on a git-clone install, so the harness refuses to execute
over HTTP.

## Licenses

- Plugin code: MIT — see [LICENSE](LICENSE)
- Bundled `dist/pele.global.js`: Pele 1.6.0, MIT License,
  Copyright (c) kepano — see [dist/LICENSE](dist/LICENSE),
  https://github.com/obsidianmd/pele

## AI assistance

This plugin's code and documentation were written with the assistance of
AI coding tools (Mistral Vibe, built by Mistral AI). It is released as-is
under the MIT license.
