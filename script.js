/**
 * Pele Diagrams: client-side renderer
 *
 * Finds every .pele-diagram container on the page and renders the
 * Mermaid source found in its pre.pele-source element with the Pele
 * library (window.pele). The source block stays visible until the
 * diagram has rendered, so pages without JavaScript still show the
 * diagram code.
 *
 * Diagrams that appear later are picked up by a MutationObserver on
 * the document body — e.g. plugins that fetch page content via AJAX.
 * If the library itself never arrives, a visible error says so instead
 * of silently leaving only the raw source.
 */

var PELE_TRIES = window.peleTries || 40; // 40 x 50 ms = 2 s per render pass
var PELE_DELAY = window.peleDelay || 50;
var PELE_MISSING = 'Pele library failed to load (window.pele is undefined); ' +
    'showing the diagram source instead.';

function peleRenderOne(box) {
    if (typeof window.pele === 'undefined') return;
    if (box.classList.contains('pele-done')) return;

    var source = box.querySelector('pre.pele-source');
    if (!source) return;

    var text = source.textContent;

    // the library arrived late: drop an earlier "failed to load" notice
    var stale = box.querySelector('.pele-error');
    if (stale && stale.parentNode) stale.parentNode.removeChild(stale);

    var target = document.createElement('div');
    target.className = 'pele-target';

    try {
        box.appendChild(target);
        window.pele.mount(target, text);
        box.classList.add('pele-done');
    } catch (err) {
        // PeleError messages quote the diagram source; show them as text
        var msg = (err && err.message) ? err.message : String(err);
        if (target.parentNode) target.parentNode.removeChild(target);

        var error = document.createElement('div');
        error.className = 'pele-error';
        error.textContent = msg;
        box.appendChild(error);
        box.classList.add('pele-done');
    }
}

function peleRenderAll() {
    var boxes = document.querySelectorAll('.pele-diagram');
    for (var i = 0; i < boxes.length; i++) {
        peleRenderOne(boxes[i]);
    }
}

/**
 * The library is still missing after the retry budget ran out: say so
 * on every unfinished diagram so the failure is visible, not silent.
 */
function peleFlagMissing() {
    var boxes = document.querySelectorAll('.pele-diagram');
    for (var i = 0; i < boxes.length; i++) {
        var box = boxes[i];
        if (box.classList.contains('pele-done')) continue;
        if (box.querySelector('.pele-error')) continue;

        var note = document.createElement('div');
        note.className = 'pele-error';
        note.textContent = PELE_MISSING;
        box.appendChild(note);
    }
}

function peleTry(attempt) {
    if (typeof window.pele !== 'undefined') {
        peleRenderAll();
    } else if (attempt < PELE_TRIES) {
        // library not loaded yet; retry for up to ~2s (slow CDN, CSP, ...)
        setTimeout(function () { peleTry(attempt + 1); }, PELE_DELAY);
    } else {
        peleFlagMissing();
    }
}

/**
 * Debounced entry point for mutations: gives the browser time to finish
 * inserting a batch of nodes, then renders whatever is still pending.
 * peleRenderOne() skips finished boxes, so repeated calls are cheap and
 * idempotent.
 */
var peleScheduled = false;
function peleSchedule() {
    if (peleScheduled) return;
    peleScheduled = true;
    setTimeout(function () {
        peleScheduled = false;
        peleTry(0);
    }, 100);
}

function peleBoot() {
    peleTry(0);

    // plugins inserting pages dynamically, AJAX previews, etc.
    if (typeof MutationObserver !== 'undefined' && document.body) {
        new MutationObserver(peleSchedule).observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

// run as soon as the DOM is ready; jQuery is not required
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', peleBoot);
} else {
    peleBoot();
}

// a very slow CDN may deliver the library only around the load event,
// after the initial retry budget has been spent
window.addEventListener('load', peleRenderAll);
