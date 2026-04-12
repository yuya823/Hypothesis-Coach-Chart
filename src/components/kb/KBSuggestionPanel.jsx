import { useState, useEffect } from 'react';
import KBSuggestionCard from './KBSuggestionCard';
import {
  suggestTestsForObservation,
  suggestEvaluationsForTest,
  suggestInterventionsForEvaluation,
  suggestReevaluationsForIntervention,
} from '../../services/kbService';

const PANEL_TYPES = {
  observation_to_test: { title: 'テスト候補', subtitle: '知識ベースから関連テストを提案' },
  test_to_evaluation: { title: '評価候補', subtitle: '知識ベースから評価解釈を提案' },
  evaluation_to_intervention: { title: '介入候補', subtitle: '知識ベースから介入方法を提案' },
  intervention_to_reevaluation: { title: '再評価候補', subtitle: '知識ベースから再評価項目を提案' },
};

const SUGGEST_FNS = {
  observation_to_test: suggestTestsForObservation,
  test_to_evaluation: suggestEvaluationsForTest,
  evaluation_to_intervention: suggestInterventionsForEvaluation,
  intervention_to_reevaluation: suggestReevaluationsForIntervention,
};

export default function KBSuggestionPanel({
  queryText,
  linkType,
  context = {},
  onAdopt,
  maxItems = 8,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [excluded, setExcluded] = useState(new Set());

  useEffect(() => {
    if (!queryText || !linkType) {
      setSuggestions([]);
      return;
    }
    const fn = SUGGEST_FNS[linkType];
    if (!fn) return;
    const results = fn(queryText, context);
    setSuggestions(results.slice(0, maxItems));
    if (results.length > 0) setOpen(true);
  }, [queryText, linkType, context.body_region, context.movement_theme, context.target_population]);

  const visibleSuggestions = suggestions.filter(s => !excluded.has(s.item.id));
  const panelInfo = PANEL_TYPES[linkType] || { title: '提案', subtitle: '' };

  if (visibleSuggestions.length === 0 && suggestions.length === 0) return null;

  return (
    <div className="kb-panel">
      <button className="kb-panel-toggle" onClick={() => setOpen(!open)}>
        <div className="kb-panel-toggle-left">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
          </svg>
          <span className="kb-panel-title">{panelInfo.title}</span>
          <span className="kb-panel-count">{visibleSuggestions.length}件</span>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="kb-panel-body">
          <div className="kb-panel-subtitle">{panelInfo.subtitle}</div>
          {visibleSuggestions.length > 0 ? (
            <div className="kb-panel-cards">
              {visibleSuggestions.map((s, i) => (
                <KBSuggestionCard
                  key={s.item.id || i}
                  suggestion={s}
                  onAdopt={onAdopt ? () => onAdopt(s) : undefined}
                  onExclude={() => setExcluded(prev => new Set([...prev, s.item.id]))}
                />
              ))}
            </div>
          ) : (
            <div className="kb-panel-empty">
              {excluded.size > 0 ? '全て除外しました' : '関連する提案がありません'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
