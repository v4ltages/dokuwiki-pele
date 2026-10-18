<?php
/**
 * Pele Diagrams: action component
 *
 * Injects the Pele library (bundled copy or a CDN URL) as a script tag
 * before DokuWiki's own merged JavaScript, so window.pele is defined by
 * the time the plugin's script.js runs.
 *
 * @license MIT
 */

class action_plugin_pele extends DokuWiki_Action_Plugin
{
    /**
     * Register the metaheader hook.
     */
    public function register(Doku_Event_Handler $controller)
    {
        $controller->register_hook('TPL_METAHEADER_OUTPUT', 'BEFORE', $this, 'handleMetaheader');
    }

    /**
     * Add the library script in front of all other scripts.
     */
    public function handleMetaheader(Doku_Event $event, $param)
    {
        global $ACT;

        // only add the library where diagrams can appear
        if ($ACT !== null && $ACT !== 'show' && $ACT !== 'preview' && $ACT !== 'draft') {
            return;
        }
        if (!$this->getConf('loadlib')) {
            return; // template or another plugin loads Pele itself
        }

        $cdn = trim((string)$this->getConf('cdn'));
        if ($cdn !== '') {
            $src = $cdn;
        } else {
            $src = DOKU_BASE . 'lib/plugins/pele/dist/pele.global.js';
        }

        if (!isset($event->data['script']) || !is_array($event->data['script'])) {
            $event->data['script'] = array();
        }
        array_unshift($event->data['script'], array(
            'type' => 'text/javascript',
            'src' => $src,
            '_data' => '',
        ));
    }
}
