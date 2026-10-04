/**
 * The small animated icon shown next to the agent's status line in the chat.
 * It changes with the tool the agent is running.
 */
import React from 'react';
import { BsFileEarmarkCode, BsPencil, BsFiles, BsTerminal, BsFileEarmarkText } from 'react-icons/bs';
import styles from './AgentChatCards.module.css';

const SEARCH_ICON_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor">
    <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/>
  </svg>
);

export const AgentShimmerIcon = ({ type, volturianoLogo }) => {
  if (type === 'search' || type === 'search_files' || type === 'list_files') {
    return <div className={styles.searchIconShimmer}>{SEARCH_ICON_SVG}</div>;
  }
  if (type === 'read' || type === 'read_file') {
    return <div className={styles.fileIconShimmer}><BsFileEarmarkText size={15} /></div>;
  }
  if (type === 'write' || type === 'edit' || type === 'create_file' || type === 'edit_file' || type === 'replace_file') {
    return <div className={styles.writeIconShimmer}><BsPencil size={14} /></div>;
  }
  if (type === 'terminal' || type === 'get_build_errors') {
    return <div className={styles.terminalIconShimmer}><BsTerminal size={14} /></div>;
  }
  if (type === 'browse_components' || type === 'fetch_component_bundle') {
    return <div className={styles.searchIconShimmer}><BsFiles size={14} /></div>;
  }

  if (volturianoLogo) {
    return (
      <div
        className={styles.tornadoLogoShimmer}
        style={{ width: 20, height: 20, '--logo-url': `url(${volturianoLogo})` }}
      />
    );
  }

  return <div className={styles.fileIconShimmer}><BsFileEarmarkCode size={14} /></div>;
};
