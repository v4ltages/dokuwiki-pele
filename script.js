/**
 * Pele Diagrams: client-side renderer
 *
 * Finds every .pele-diagram container on the page and renders the
 * Mermaid source found in its pre.pele-source element with the Pele
 * library (window.pele). The source block stays visible until the
 * diagram has rendered, so pages without JavaScript still show the
 * diagram code.
 */

function peleRenderOne(box) {
    if (box.classList.contains('pele-done')) return;

    var source = box.querySelector('pre.pele-source');
    if (!source) return;

    var text = source.textContent;
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

function peleTry(attempt) {
    if (typeof window.pele !== 'undefined') {
        peleRenderAll();
    } else if (attempt < 40) {
        // library not loaded yet; retry for up to ~2s (slow CDN, CSP, ...)
        setTimeout(function () { peleTry(attempt + 1); }, 50);
    }
}

jQuery(function () {
    peleTry(0);
});
