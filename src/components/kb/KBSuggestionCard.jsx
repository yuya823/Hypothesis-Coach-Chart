import KBReferenceList from './KBReferenceList';

const PRIORITY_STYLES = {
  high:   { color: '#c0392b', bg: 'rgba(192,57,43,0.06)', label: '高' },
  medium: { color: '#b8860b', bg: 'rgba(184,134,11,0.06)', label: '中' },
  low:    { color: '#888', bg: 'rgba(136,136,136,0.06)', label: '低' },
};

function priorityLabel(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export default function KBSuggestionCard({ suggestion, onAdopt, onHold, onExclude }) {
  const { item, link, sources, priority } = suggestion;
  const matchedFrom = suggestion.matchedObservation || suggestion.matchedTest || suggestion.matchedEvaluation || suggestion.matchedIntervention;
  const pLevel = priorityLabel(priority);
  const pStyle = PRIORITY_STYLES[pLevel];

  return (
    <div className="kb-card">
      <div className="kb-card-header">
        <div className="kb-card-title">{item.title}</div>
        <div className="kb-card-priority" style={{ color: pStyle.color, background: pStyle.bg }}>
          優先度: {pStyle.label}
        </div>
      </div>

      {item.content && item.content !== item.title && (
        <div className="kb-card-content">{item.content}</div>
      )}

      {/* Rationale */}
      {link?.rationale && (
        <div className="kb-card-rationale">
          <span className="kb-card-rationale-label">根拠:</span> {matchedFrom?.title ? `${matchedFrom.title} → ` : ''}{link.rationale}
        </div>
      )}

      {/* Meta row */}
      <div className="kb-card-meta">
        {item.body_region_label && <span className="kb-meta-tag">{item.body_region_label}</span>}
        {item.movement_theme && <span className="kb-meta-tag">{item.movement_theme}</span>}
        {item.layer && <span className="kb-meta-tag kb-meta-layer">{item.layer}</span>}
        {sources.length > 0 && (
          <span className="kb-meta-ref">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle' }}>
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
            </svg>
            {' '}{sources.length}件
          </span>
        )}
      </div>

      {/* References */}
      <KBReferenceList sources={sources} />

      {/* Actions */}
      <div className="kb-card-actions">
        {onAdopt && <button className="kb-action-btn kb-action-adopt" onClick={() => onAdopt(suggestion)}>✓ 採用</button>}
        {onHold && <button className="kb-action-btn kb-action-hold" onClick={() => onHold(suggestion)}>⏸ 保留</button>}
        {onExclude && <button className="kb-action-btn kb-action-exclude" onClick={() => onExclude(suggestion)}>✕ 除外</button>}
      </div>
    </div>
  );
}
