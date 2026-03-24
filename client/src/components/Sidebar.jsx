import React, { memo, useCallback, useMemo, useState } from 'react';

function Sidebar({ isOpen, onToggle, debates, currentDebateId, onSelectDebate }) {
  const [search, setSearch] = useState('');

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = useMemo(
    () => debates.filter((d) => (d.topic ?? '').toLowerCase().includes(normalizedSearch)),
    [debates, normalizedSearch],
  );

  const handleSearchChange = useCallback((e) => setSearch(e.target.value), []);

  return (
    <aside className={`sidebar${isOpen ? '' : ' collapsed'}`} aria-label="Debate history">
      <div className="sidebar__inner">
        <div className="sidebar__search-wrap">
          <input
            className="sidebar__search"
            type="text"
            placeholder="Search debates..."
            value={search}
            onChange={handleSearchChange}
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
                onSelect={onSelectDebate}
              />
            ))
          )}
        </div>
      </div>
    </aside>
  );
}

function DebateItemBase({ debate, isActive, index, onSelect }) {
  const safeDate = debate?.date ? new Date(debate.date) : new Date();
  const formattedDate = Number.isNaN(safeDate.getTime())
    ? 'Unknown date'
    : safeDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const handleSelect = useCallback(() => onSelect(debate.id), [debate.id, onSelect]);

  return (
    <div
      className={`sidebar__item${isActive ? ' active' : ''}`}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={handleSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleSelect()}
      aria-current={isActive ? 'page' : undefined}
      aria-label={`Open debate: ${debate.topic ?? 'Untitled topic'}`}
    >
      <span className="sidebar__item-topic" title={debate.topic ?? 'Untitled topic'}>
        {debate.topic ?? 'Untitled topic'}
      </span>
      <span className="sidebar__item-date">{formattedDate}</span>
    </div>
  );
}

const DebateItem = memo(DebateItemBase);

export default memo(Sidebar);
