import { useState } from 'react';

const EV_STYLES = {
  A: { color: '#3a8a6a', bg: 'rgba(58,138,106,0.08)', label: 'A' },
  B: { color: '#4a6fa5', bg: 'rgba(74,111,165,0.08)', label: 'B' },
  C: { color: '#888', bg: 'rgba(136,136,136,0.08)', label: 'C' },
};

export default function KBReferenceList({ sources }) {
  const [open, setOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="kb-ref-list">
      <button className="kb-ref-toggle" onClick={() => setOpen(!open)}>
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          <path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="kb-ref-icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
          </svg>
        </span>
        参考文献 ({sources.length}件)
      </button>
      {open && (
        <div className="kb-ref-items">
          {sources.map((src, i) => {
            const ev = EV_STYLES[src.evidence_level] || EV_STYLES.C;
            return (
              <div key={i} className="kb-ref-item">
                <div className="kb-ref-header">
                  <span className="kb-ref-key">{src.source_key}</span>
                  <span className="kb-ref-ev" style={{ color: ev.color, background: ev.bg }}>
                    Evidence: {ev.label}
                  </span>
                </div>
                <div className="kb-ref-title">
                  {src.title} ({src.year})
                </div>
                {src.study_design && (
                  <div className="kb-ref-design">{src.study_design}</div>
                )}
                {src.practical_use && (
                  <div className="kb-ref-use">実務: {src.practical_use}</div>
                )}
                {src.url && (
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="kb-ref-link">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    PubMed →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
