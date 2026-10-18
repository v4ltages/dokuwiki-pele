/**
 * Node harness for script.js using a minimal DOM stub.
 * Not part of the plugin; verification only.
 */

class FakeNodeList extends Array {}

function makeBox(text) {
    const pre = {
        className: 'pele-source',
        textContent: text,
        parentNode: null,
    };
    const box = {
        className: 'pele-diagram',
        children: [pre],
        appended: [],
        classList: {
            add(c) { box.classListValue.add(c); },
            contains(c) { return box.classListValue.has(c); },
        },
        classListValue: new Set(),
        querySelector(sel) {
            return sel === 'pre.pele-source' ? (box.children[0] || null) : null;
        },
        appendChild(node) { node.parentNode = box; box.appended.push(node); },
        removeChild(node) {
            const i = box.appended.indexOf(node);
            if (i >= 0) box.appended.splice(i, 1);
            const j = box.children.indexOf(node);
            if (j >= 0) box.children.splice(j, 1);
        },
    };
    pre.parentNode = box;
    return box;
}

// ---- stubs ----
const boxes = new FakeNodeList();
global.document = {
    body: { stub: true },
    createElement(tag) {
        const el = { className: '', textContent: '', parentNode: null };
        el.appendChild = (n) => { n.parentNode = el; };
        return el;
    },
    querySelectorAll(sel) {
        return sel === '.pele-diagram' ? boxes : new FakeNodeList();
    },
};

const jqueryReadyFns = [];
global.jQuery = function (fn) { jqueryReadyFns.push(fn); };
global.window = global;

// MutationObserver stub: record callbacks so tests can simulate mutations
const observerCallbacks = [];
global.MutationObserver = class {
    constructor(cb) { observerCallbacks.push(cb); }
    observe() {}
};

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const code = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
eval(code);

function runReady() { for (const fn of [...jqueryReadyFns]) fn(); }
function fireMutation() { for (const cb of [...observerCallbacks]) cb(); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
function check(label, pass) {
    results.push(`${pass ? 'PASS' : 'FAIL'} - ${label}`);
    if (!pass) process.exitCode = 1;
}

// scenario 1: successful mount on ready
const okBox = makeBox('flowchart TD\n A --> B');
boxes.push(okBox);
global.pele = {
    mount(target, text) {
        if (text.indexOf('flowchart') === -1) throw new Error('bad');
        target.mountedText = text;
    },
};
runReady();
check('success: pele-done class added', okBox.classList.contains('pele-done'));
check('success: target appended', okBox.appended.length === 1 && okBox.appended[0].mountedText.indexOf('flowchart') === 0);
check('observer registered for AJAX content', observerCallbacks.length === 1);

// scenario 2: mount throws -> error element, source hidden by pele-done
const errBox = makeBox('%% unparsable %%');
boxes.push(errBox);
runReady();
check('error: pele-done added', errBox.classList.contains('pele-done'));
check('error: target removed', errBox.appended.every((n) => n.className !== 'pele-target'));
check('error: error box shown', errBox.appended.some((n) => n.className === 'pele-error' && n.textContent.indexOf('bad') >= 0));
check('idempotent: okBox has one target', okBox.appended.filter((n) => n.className === 'pele-target').length === 1);

// scenario 3: library missing -> retry, then appears
const lateBox = makeBox('flowchart LR\n X --> Y');
boxes.push(lateBox);
delete global.pele;
runReady();
check('missing lib: not marked done yet', !lateBox.classList.contains('pele-done'));
global.pele = { mount(t) { t.mounted = true; } };
await wait(80);
check('missing lib: rendered after lib appears', lateBox.classList.contains('pele-done'));

// scenario 4: AJAX preview — diagram inserted after page load is picked
// up by the MutationObserver path
const previewBox = makeBox('sequenceDiagram\n  A->>B: hello');
boxes.push(previewBox);
fireMutation();
await wait(150);
check('ajax preview: rendered after mutation', previewBox.classList.contains('pele-done'));
check('ajax preview: target mounted',
    previewBox.appended.some((n) => n.className === 'pele-target' && n.mounted === true));

// scenario 5: repeated mutation callbacks stay idempotent
const targetsBefore = previewBox.appended.filter((n) => n.className === 'pele-target').length;
fireMutation();
await wait(150);
const targetsAfter = previewBox.appended.filter((n) => n.className === 'pele-target').length;
check('ajax preview: no duplicate targets on re-mutation', targetsBefore === targetsAfter);

// scenario 6: diagram inserted while the library is still unavailable
const earlyBox = makeBox('flowchart BT\n P --> Q');
boxes.push(earlyBox);
delete global.pele;
fireMutation();
await wait(150);
check('ajax preview without lib: no premature done', !earlyBox.classList.contains('pele-done'));
global.pele = { mount(t) { t.mounted = true; } };
await wait(150);
check('ajax preview without lib: rendered once lib appears', earlyBox.classList.contains('pele-done'));

console.log(results.join('\n'));
