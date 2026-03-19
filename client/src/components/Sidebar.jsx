import React, { useState } from 'react';

/**
 * Sidebar — Collapsible 280px panel showing past debates in the current session.
 *
 * Props:
 *   isOpen         — boolean controlling visibility
 *   onToggle       — called when the user wants to close the sidebar
 *   debates        — array of { id, topic, date } objects
 *   currentDebateId — id of the currently active debate (highlighted)
 *   onSelectDebate — called with the debate id when user clicks a row
 */
export default function Sidebar({ isOpen, onToggle, debates, currentDebateId, onSelectDebate }) {
  const [search, setSearch] = useState('');

  const filtered = debates.filter(d =>
    d.topic.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className={`sidebar${isOpen ? '' : ' collapsed'}`} aria-label="Debate history">
      <div className="sidebar__inner">
        {/* Search */}
        <div className="sidebar__search-wrap">
          <input
            className="sidebar__search"
            type="text"
            placeholder="Search debates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search past debates"
          />
        </div>

        <div className="sidebar__label">Past Debates</div>

        <div className="sidebar__list">
          {filtered.length === 0 ? (
            <div className="sidebar__empty">
              {debates.length === 0
                ? 'No debates yet.\nConvene the panel to begin.'
                : 'No matches.'}
            </div>
          ) : (
            filtered.map((debate, i) => (
              <DebateItem
                key={debate.id}
                debate={debate}
                isActive={debate.id === currentDebateId}
                index={i}
                onSelect={() => onSelectDebate(debate.id)}
              />
            ))
          )}
        </div>
      </div>
    </aside>
  );
}

/**
 * DebateItem — A single row in the sidebar list.
 * Staggered animation delay based on its index.
 */
function DebateItem({ debate, isActive, index, onSelect }) {
  const formattedDate = debate.date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      className={`sidebar__item${isActive ? ' active' : ''}`}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect()}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="sidebar__item-topic" title={debate.topic}>
        {debate.topic}
      </span>
      <span className="sidebar__item-date">{formattedDate}</span>
    </div>
  );
}
