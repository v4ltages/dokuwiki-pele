<?php
/**
 * Standalone harness for user/developer testing: stubs the minimal DokuWiki
 * API and drives the plugin's syntax and action components the way
 * DokuWiki would. Not loaded by DokuWiki; run from the command line:
 *
 *   php .harness/test.php
 */

error_reporting(E_ALL);

// The plugin directory is web-accessible when installed via git clone;
// refuse to run over HTTP and only allow command-line execution.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

define('DOKU_LF', "\n");
define('DOKU_BASE', '/');
define('DOKU_LEXER_ENTER', 1);
define('DOKU_LEXER_UNMATCHED', 2);
define('DOKU_LEXER_EXIT', 3);

function hsc($s) { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

class DokuWiki_Syntax_Plugin {}
class DokuWiki_Action_Plugin {
    protected $conf = array();
    public function getConf($k) { return $this->conf[$k] ?? ($k === 'loadlib' ? 1 : ''); }
    public function setConf($k, $v) { $this->conf[$k] = $v; }
}
class Doku_Event_Handler {}
class Doku_Event {
    public $data;
    public function __construct($name, &$data) { $this->data = &$data; }
}
class Doku_Handler {}
class Doku_Renderer { public $doc = ''; }

$ACT = 'show';

require dirname(__DIR__) . '/syntax.php';
require dirname(__DIR__) . '/action.php';

$syntax = new syntax_plugin_pele();
$renderer = new Doku_Renderer();

// simulate the instruction stream for one <pele> block
$instructions = array(
    array(DOKU_LEXER_ENTER, ''),
    array(DOKU_LEXER_UNMATCHED, "flowchart TD\n  A[Start] --> B{Yes?}\n  B -- Yes --> C[OK] & <b> & \"quoted\"\n"),
    array(DOKU_LEXER_EXIT, ''),
);
foreach ($instructions as $ins) {
    $data = $syntax->handle($ins[1], $ins[0], 0, new Doku_Handler());
    $ok = $syntax->render('xhtml', $renderer, $data);
    if (!$ok) { fwrite(STDERR, "render returned false for state {$ins[0]}\n"); exit(1); }
}

echo "XHTML output:\n" . $renderer->doc . "\n";

// assertions
$html = $renderer->doc;
$checks = array(
    'container div'      => strpos($html, '<div class="pele-diagram">') !== false,
    'source pre present' => strpos($html, '<pre class="pele-source">') !== false,
    'html escaped'       => strpos($html, '&lt;b&gt;') !== false && strpos($html, '&quot;quoted&quot;') !== false,
    'mermaid text kept'  => strpos($html, 'flowchart TD') !== false,
    'no raw tags inside' => strpos($html, '<b>') === false,
);
$fail = 0;
foreach ($checks as $label => $pass) {
    echo ($pass ? 'PASS' : 'FAIL') . " - $label\n";
    if (!$pass) $fail = 1;
}

// non-xhtml formats must be declined
if ($syntax->render('metadata', new Doku_Renderer(), array('state' => DOKU_LEXER_EXIT)) !== false) {
    echo "FAIL - metadata format should be declined\n"; $fail = 1;
} else {
    echo "PASS - non-xhtml formats declined\n";
}

// action component: local library
$eventData = array('script' => array(array('type' => 'text/javascript', 'src' => '/lib/exe/js.php')));
$event = new Doku_Event('TPL_METAHEADER_OUTPUT', $eventData);
$action = new action_plugin_pele();
$action->handleMetaheader($event, null);
$src = $eventData['script'][0]['src'];
echo "first script src: $src\n";
if ($src !== '/lib/plugins/pele/dist/pele.global.js') { echo "FAIL - local lib not injected first\n"; $fail = 1; }
else { echo "PASS - bundled library injected before js.php\n"; }

// action component: CDN override
$action->setConf('cdn', 'https://cdn.jsdelivr.net/npm/pele@1/dist/pele.global.js');
$eventData = array('script' => array());
$event = new Doku_Event('TPL_METAHEADER_OUTPUT', $eventData);
$action->handleMetaheader($event, null);
if ($eventData['script'][0]['src'] !== 'https://cdn.jsdelivr.net/npm/pele@1/dist/pele.global.js') {
    echo "FAIL - CDN URL not used\n"; $fail = 1;
} else { echo "PASS - CDN override honored\n"; }

// action component: loadlib disabled
$action->setConf('loadlib', 0);
$action->setConf('cdn', '');
$eventData = array('script' => array());
$event = new Doku_Event('TPL_METAHEADER_OUTPUT', $eventData);
$action->handleMetaheader($event, null);
if (!empty($eventData['script'])) { echo "FAIL - loadlib=0 still injects\n"; $fail = 1; }
else { echo "PASS - loadlib=0 injects nothing\n"; }

// action component: ACT whitelist (edit actions must get the library,
// because the AJAX preview is rendered into an already-loaded page)
$action->setConf('loadlib', 1);
global $ACT;
foreach (array('edit' => true, 'preview' => true, 'conflict' => true,
               'admin' => false, 'search' => false, 'index' => false) as $actName => $expect) {
    $ACT = $actName;
    $eventData = array('script' => array());
    $event = new Doku_Event('TPL_METAHEADER_OUTPUT', $eventData);
    $action->handleMetaheader($event, null);
    $injected = !empty($eventData['script']);
    if ($injected === $expect) { echo "PASS - ACT '$actName' injection: " . var_export($injected, true) . "\n"; }
    else { echo "FAIL - ACT '$actName' injection should be " . var_export($expect, true) . "\n"; $fail = 1; }
}
$ACT = 'show';

exit($fail);
