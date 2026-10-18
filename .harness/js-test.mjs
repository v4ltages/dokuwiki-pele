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

// ---- load script.js with stubs ----
const boxes = new FakeNodeList();
global.document = {
    createElement(tag) {
        return { className: '', textContent: '', parentNode: null };
    },
    querySelectorAll(sel) {
        return sel === '.pele-diagram' ? boxes : new FakeNodeList();
    },
};

// record appendChild/removeChild on created elements
const origCreate = global.document.createElement;
global.document.createElement = function (tag) {
    const el = origCreate(tag);
    el.appendChild = (n) => { el.child = n; n.parentNode = el; };
    el.parentNode = null;
    return el;
};

let jqueryReadyFn = null;
global.jQuery = function (fn) { jqueryReadyFn = fn; };
global.window = global;

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const code = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
// script.js defines functions at top level and registers with jQuery()
eval(code);

const results = [];
function check(label, pass, extra) {
    results.push(`${pass ? 'PASS' : 'FAIL'} - ${label}${extra ? ' (' + extra + ')' : ''}`);
    if (!pass) process.exitCode = 1;
}

// scenario 1: successful mount
let failures = 0;
const okBox = makeBox('flowchart TD\n A --> B');
boxes.push(okBox);
global.pele = {
    mount(target, text) {
        if (text.indexOf('flowchart') === -1) throw new Error('bad');
        target.mountedText = text;
    },
};
jqueryReadyFn();
check('success: pele-done class added', okBox.classList.contains('pele-done'));
check('success: target appended', okBox.appended.length === 1 && okBox.appended[0].mountedText.indexOf('flowchart') === 0);

// scenario 2: mount throws -> error element, source hidden by pele-done
const errBox = makeBox('%% unparsable %%');
boxes.push(errBox);
jqueryReadyFn(); // re-run; okBox already done, should be skipped
check('error: pele-done added', errBox.classList.contains('pele-done'));
check('error: target removed', errBox.appended.every((n) => !n.className || n.className !== 'pele-target'));
check('error: error box shown', errBox.appended.some((n) => n.className === 'pele-error' && n.textContent.indexOf('bad') >= 0));
check('idempotent: okBox has one target', okBox.appended.filter((n) => n.className === 'pele-target').length === 1);

// scenario 3: library missing -> retry, then appears
const lateBox = makeBox('flowchart LR\n X --> Y');
boxes.push(lateBox);
delete global.pele;
jqueryReadyFn();
check('missing lib: not marked done yet', !lateBox.classList.contains('pele-done'));
global.pele = { mount(t) { t.mounted = true; } };
await new Promise((r) => setTimeout(r, 80));
check('missing lib: rendered after lib appears', lateBox.classList.contains('pele-done'));

console.log(results.join('\n'));
