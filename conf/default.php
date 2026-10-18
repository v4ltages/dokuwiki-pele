<?php
/**
 * Default configuration for the pele plugin
 *
 * @license MIT
 */

// Load the bundled Pele library automatically? Set to 0 if your template
// or another plugin already provides window.pele.
$conf['loadlib'] = 1;

// Empty: use the bundled copy in lib/plugins/pele/dist/pele.global.js.
// Set a URL to load Pele from a CDN instead, e.g.
// https://cdn.jsdelivr.net/npm/pele@1/dist/pele.global.js
$conf['cdn'] = '';
