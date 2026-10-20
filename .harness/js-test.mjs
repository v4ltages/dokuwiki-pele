/**
 * Node harness for user/developer testing: runs script.js against a
 * minimal DOM stub. Not loaded by DokuWiki; run from the command line:
 *
 *   node .harness/js-test.mjs
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
            if (sel === 'pre.pele-source') return box.children[0] || null;
            if (sel === '.pele-error') {
                return box.appended.find((n) => n.className === 'pele-error') || null;
            }
            return null;
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
    readyState: 'complete',
    addEventListener() {},
    createElement(tag) {
        const el = { className: '', textContent: '', parentNode: null };
        el.appendChild = (n) => { n.parentNode = el; };
        return el;
    },
    querySelectorAll(sel) {
        return sel === '.pele-diagram' ? boxes : new FakeNodeList();
    },
};

// window.peleTries / pelePele delay hooks let the harness retry fast
global.window = { addEventListener() {}, peleTries: 2, peleDelay: 10 };

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

function fireMutation() { for (const cb of [...observerCallbacks]) cb(); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
function check(label, pass) {
    results.push(`${pass ? 'PASS' : 'FAIL'} - ${label}`);
    if (!pass) process.exitCode = 1;
}

// scenario 1: successful mount after an AJAX-style mutation
window.pele = {
    mount(target, text) {
        if (text.indexOf('flowchart') === -1) throw new Error('bad');
        target.mountedText = text;
    },
};
const okBox = makeBox('flowchart TD\n A --> B');
boxes.push(okBox);
fireMutation();
await wait(150);
check('success: pele-done class added', okBox.classList.contains('pele-done'));
check('success: target appended', okBox.appended.length === 1 && okBox.appended[0].mountedText.indexOf('flowchart') === 0);
check('observer registered for AJAX content', observerCallbacks.length === 1);

// scenario 2: mount throws -> error element, source hidden by pele-done
const errBox = makeBox('%% unparsable %%');
boxes.push(errBox);
fireMutation();
await wait(150);
check('error: pele-done added', errBox.classList.contains('pele-done'));
check('error: target removed', errBox.appended.every((n) => n.className !== 'pele-target'));
check('error: error box shown', errBox.appended.some((n) => n.className === 'pele-error' && n.textContent.indexOf('bad') >= 0));
check('idempotent: okBox has one target', okBox.appended.filter((n) => n.className === 'pele-target').length === 1);

// scenario 3: library missing -> visible notice after the retry budget
delete window.pele;
const missBox = makeBox('flowchart LR\n X --> Y');
boxes.push(missBox);
fireMutation();
await wait(200);
check('missing lib: not marked done', !missBox.classList.contains('pele-done'));
check('missing lib: notice added',
    missBox.appended.some((n) => n.className === 'pele-error' && n.textContent.indexOf('failed to load') >= 0));
check('missing lib: exactly one notice',
    missBox.appended.filter((n) => n.className === 'pele-error').length === 1);

// scenario 4: further render passes while still missing do not duplicate it
fireMutation();
await wait(200);
check('missing lib: no duplicate notice',
    missBox.appended.filter((n) => n.className === 'pele-error').length === 1);
check('missing lib: still not done', !missBox.classList.contains('pele-done'));

// scenario 5: the library finally arrives -> notice removed, diagram rendered
window.pele = { mount(t, text) { t.mounted = text; } };
fireMutation();
await wait(150);
check('late lib: rendered', missBox.classList.contains('pele-done'));
check('late lib: target mounted',
    missBox.appended.some((n) => n.className === 'pele-target' && n.mounted === 'flowchart LR\n X --> Y'));
check('late lib: stale notice removed',
    !missBox.appended.some((n) => n.className === 'pele-error'));

// scenario 6: repeated mutation callbacks stay idempotent
const targetsBefore = missBox.appended.filter((n) => n.className === 'pele-target').length;
fireMutation();
await wait(150);
const targetsAfter = missBox.appended.filter((n) => n.className === 'pele-target').length;
check('ajax preview: no duplicate targets on re-mutation', targetsBefore === targetsAfter);

// scenario 7: diagram inserted while the library is still unavailable
const earlyBox = makeBox('sequenceDiagram\n  A->>B: hello');
boxes.push(earlyBox);
delete window.pele;
fireMutation();
await wait(200);
check('ajax preview without lib: notice shown, not done',
    !earlyBox.classList.contains('pele-done') &&
    earlyBox.appended.some((n) => n.className === 'pele-error' && n.textContent.indexOf('failed to load') >= 0));
window.pele = { mount(t) { t.mounted = true; } };
fireMutation();
await wait(150);
check('ajax preview without lib: rendered once lib appears', earlyBox.classList.contains('pele-done'));
check('ajax preview: target mounted',
    earlyBox.appended.some((n) => n.className === 'pele-target' && n.mounted === true));

console.log(results.join('\n'));
