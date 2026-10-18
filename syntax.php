<?php
/**
 * Pele Diagrams: render Mermaid syntax with the Pele library
 *
 * Wiki syntax:
 *
 *   <pele>
 *   flowchart TD
 *       A[Start] --> B{Yes or no?}
 *       B -- Yes --> C[Continue]
 *       B -- No --> A
 *   </pele>
 *
 * The block is emitted as a container with the escaped diagram source.
 * The plugin's script.js then renders it with the Pele library, which
 * must expose window.pele (bundled dist/pele.global.js or a CDN copy).
 *
 * @license MIT
 */

class syntax_plugin_pele extends DokuWiki_Syntax_Plugin
{
    /** @var string buffered diagram source between ENTER and EXIT */
    protected $buffer = '';

    /**
     * Protected: no other syntax is parsed inside the block.
     */
    public function getType()
    {
        return 'protected';
    }

    public function getPType()
    {
        return 'block';
    }

    public function getSort()
    {
        return 190;
    }

    /**
     * Connect the &lt;pele&gt; entry pattern to the parser.
     */
    public function connectTo($mode)
    {
        // opening tag on its own line, optional trailing whitespace
        $this->Lexer->addEntryPattern('<pele>[ \t]*\n', $mode, 'plugin_pele');
        // DokuWiki tags are usually case-insensitive in spirit; support both
        $this->Lexer->addEntryPattern('<PELE>[ \t]*\n', $mode, 'plugin_pele');
    }

    public function postConnect()
    {
        $this->Lexer->addExitPattern('</pele>', 'plugin_pele');
        $this->Lexer->addExitPattern('</PELE>', 'plugin_pele');
    }

    /**
     * Handle the matched tokens. Content between the tags is passed
     * through verbatim; the assembled source is emitted on EXIT.
     */
    public function handle($match, $state, $pos, Doku_Handler $handler)
    {
        switch ($state) {
            case DOKU_LEXER_ENTER:
                return array('state' => $state);
            case DOKU_LEXER_UNMATCHED:
                return array('state' => $state, 'text' => $match);
            case DOKU_LEXER_EXIT:
                return array('state' => $state, 'text' => $this->buffer);
        }
        return array('state' => $state);
    }

    /**
     * Render the container. Only XHTML is supported; other formats
     * (metadata, odt, ...) are skipped.
     */
    public function render($format, Doku_Renderer $renderer, $data)
    {
        if ($format !== 'xhtml') {
            return false;
        }

        switch ($data['state']) {
            case DOKU_LEXER_ENTER:
                $this->buffer = '';
                return true;

            case DOKU_LEXER_UNMATCHED:
                $this->buffer .= $data['text'];
                return true;

            case DOKU_LEXER_EXIT:
                $source = trim($this->buffer);
                $this->buffer = '';

                $renderer->doc .= '<div class="pele-diagram">' . DOKU_LF;
                // fallback: shown as plain text until JS renders the diagram
                $renderer->doc .= '<pre class="pele-source">' . hsc($source) . '</pre>' . DOKU_LF;
                $renderer->doc .= '</div>' . DOKU_LF;
                return true;
        }

        return false;
    }
}
