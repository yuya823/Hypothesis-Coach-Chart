import { useState } from 'react';
import {
  EVALUATION_CATEGORIES,
  EVAL_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
  createEvaluation,
} from '../../data/observationPresets';
import { EVAL_ICONS, IconPlus, IconEdit, IconX, IconLink, IconChevronDown, IconSpark, IconArrowRight } from '../Icons';

export default function EvaluationPanel({
  evaluations,
  observations,
  tests,
  onAdd,
  onUpdate,
  onRemove,
  highlightedIds,
  onSelect,
  onSendToHypothesis,
  onAISuggest,
  aiLoading,
}) {
  const [expandedCats, setExpandedCats] = useState(
    Object.keys(EVALUATION_CATEGORIES).reduce((acc, k) => ({ ...acc, [k]: true }), {})
  );
  const [editingId, setEditingId] = useState(null);
  const [linkingId, setLinkingId] = useState(null);

  const toggleCat = (cat) => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));

  const handleAddEval = (cat) => {
    const newEval = createEvaluation(cat);
    onAdd(newEval);
    setEditingId(newEval.id);
  };

  const toggleObsLink = (evalId, obsId) => {
    const ev = evaluations.find(e => e.id === evalId);
    if (!ev) return;
    const linked = ev.linkedObservationIds || [];
    const newLinked = linked.includes(obsId) ? linked.filter(id => id !== obsId) : [...linked, obsId];
    onUpdate(evalId, { linkedObservationIds: newLinked });
  };

  const toggleTestLink = (evalId, testId) => {
    const ev = evaluations.find(e => e.id === evalId);
    if (!ev) return;
    const linked = ev.linkedTestIds || [];
    const newLinked = linked.includes(testId) ? linked.filter(id => id !== testId) : [...linked, testId];
    onUpdate(evalId, { linkedTestIds: newLinked });
  };

  const catEvaluations = (cat) => evaluations.filter(e => e.category === cat);

  const getTypeStyle = (type) => {
    const opt = EVAL_TYPE_OPTIONS.find(t => t.value === type);
    return opt ? { borderColor: opt.color, color: opt.color } : {};
  };

  const getPriorityStyle = (priority) => {
    const opt = PRIORITY_OPTIONS.find(p => p.value === priority);
    return opt ? { color: opt.color } : {};
  };

  return (
    <div className="ote-panel ote-panel--eval">
      <div className="ote-panel-header">
        <div className="ote-panel-header-icon ote-eval-bg">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 01-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 10-3.214 3.214c.446.166.855.497.925.968a.979.979 0 01-.276.837l-1.61 1.611a2.404 2.404 0 01-1.705.707 2.402 2.402 0 01-1.704-.706l-1.568-1.568a1.026 1.026 0 00-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 11-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 00-.289-.877l-1.568-1.568A2.402 2.402 0 011.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 103.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0112 2c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.969a2.5 2.5 0 113.237 3.237c-.464.18-.894.527-.967 1.02z"/></svg>
        </div>
        <div>
          <h2 className="ote-panel-title">評価</h2>
          <p className="ote-panel-subtitle">事実に基づく解釈</p>
        </div>
        <span className="ote-panel-count ote-eval-count">{evaluations.length}</span>
      </div>

      {/* AI suggest button */}
      {onAISuggest && (
        <button className="ote-ai-suggest-btn ote-ai-suggest-btn--eval" onClick={onAISuggest} disabled={aiLoading || (observations.length === 0 && tests.length === 0)}>
          <IconSpark s={14} />
          {aiLoading ? 'AI分析中...' : '所見から評価提案'}
        </button>
      )}

      <div className="ote-panel-body">
        {Object.entries(EVALUATION_CATEGORIES).map(([catKey, catMeta]) => {
          const items = catEvaluations(catKey);
          const isOpen = expandedCats[catKey];
          const CatIcon = EVAL_ICONS[catKey];

          return (
            <div key={catKey} className="ote-category">
              <button className="ote-category-header" onClick={() => toggleCat(catKey)}>
                <span className="ote-category-icon">{CatIcon && <CatIcon s={14} />}</span>
                <span className="ote-category-label">{catMeta.label}</span>
                <span className="ote-category-count">{items.length}</span>
                <span className={`ote-chevron-wrap ${isOpen ? 'open' : ''}`}><IconChevronDown s={12} /></span>
              </button>

              {isOpen && (
                <div className="ote-category-body">
                  {items.map(ev => (
                    <div key={ev.id} className={`ote-eval-card ${highlightedIds?.includes(ev.id) ? 'highlighted' : ''}`} onClick={() => onSelect?.(ev.id, 'evaluation')}>
                      <div className="ote-eval-card-header">
                        <div className="ote-eval-card-title-row">
                          {editingId === ev.id ? (
                            <input type="text" className="ote-eval-title-input" value={ev.title} onChange={e => onUpdate(ev.id, { title: e.target.value })} placeholder="評価タイトル..." onClick={e => e.stopPropagation()} />
                          ) : (
                            <h4 className="ote-eval-card-title">{ev.title || '( タイトル未入力 )'}</h4>
                          )}
                        </div>
                        <div className="ote-item-actions">
                          <button className="ote-item-btn" title="根拠リンク" onClick={(e) => { e.stopPropagation(); setLinkingId(linkingId === ev.id ? null : ev.id); }}><IconLink s={12} /></button>
                          <button className="ote-item-btn" title="詳細を編集" onClick={(e) => { e.stopPropagation(); setEditingId(editingId === ev.id ? null : ev.id); }}><IconEdit s={12} /></button>
                          <button className="ote-item-btn ote-item-btn--danger" onClick={(e) => { e.stopPropagation(); onRemove(ev.id); }}><IconX s={12} /></button>
                        </div>
                      </div>

                      <div className="ote-eval-meta">
                        <span className="ote-eval-type-badge" style={getTypeStyle(ev.type)}>
                          {EVAL_TYPE_OPTIONS.find(t => t.value === ev.type)?.label || '未設定'}
                        </span>
                        <span className="ote-eval-priority-badge" style={getPriorityStyle(ev.priority)}>
                          優先度: {PRIORITY_OPTIONS.find(p => p.value === ev.priority)?.label || '中'}
                        </span>
                      </div>

                      {editingId === ev.id ? (
                        <div className="ote-item-edit" onClick={e => e.stopPropagation()}>
                          <div className="ote-edit-row"><label>解釈</label><textarea value={ev.interpretation || ''} onChange={e => onUpdate(ev.id, { interpretation: e.target.value })} placeholder="事実に基づく解釈を記述..." rows={3} /></div>
                          <div className="ote-edit-row"><label>優先度</label><select value={ev.priority || 'medium'} onChange={e => onUpdate(ev.id, { priority: e.target.value })}>{PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
                          <div className="ote-edit-row"><label>種別</label><select value={ev.type || 'primary_factor'} onChange={e => onUpdate(ev.id, { type: e.target.value })}>{EVAL_TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                          <div className="ote-edit-row"><label>次確認</label><input type="text" value={ev.nextCheck || ''} onChange={e => onUpdate(ev.id, { nextCheck: e.target.value })} placeholder="次ステップの確認事項..." /></div>
                        </div>
                      ) : (
                        ev.interpretation && <div className="ote-eval-interpretation">{ev.interpretation}</div>
                      )}

                      {(ev.linkedObservationIds?.length > 0 || ev.linkedTestIds?.length > 0) && (
                        <div className="ote-eval-evidence">
                          <div className="ote-eval-evidence-label">根拠:</div>
                          <div className="ote-linked-items">
                            {(ev.linkedObservationIds || []).map(obsId => {
                              const obs = observations.find(o => o.id === obsId);
                              return obs ? <span key={obsId} className="ote-linked-tag ote-linked-tag--obs">{obs.name}</span> : null;
                            })}
                            {(ev.linkedTestIds || []).map(testId => {
                              const test = tests.find(t => t.id === testId);
                              return test ? <span key={testId} className="ote-linked-tag ote-linked-tag--test">{test.name}</span> : null;
                            })}
                          </div>
                        </div>
                      )}

                      {ev.nextCheck && editingId !== ev.id && <div className="ote-eval-next-check">次に確認: {ev.nextCheck}</div>}

                      {linkingId === ev.id && (
                        <div className="ote-link-panel" onClick={e => e.stopPropagation()}>
                          <div className="ote-link-panel-title">根拠となる観察所見:</div>
                          {observations.length > 0 ? observations.map(obs => (
                            <label key={obs.id} className="ote-link-option">
                              <input type="checkbox" checked={(ev.linkedObservationIds || []).includes(obs.id)} onChange={() => toggleObsLink(ev.id, obs.id)} />
                              <span>{obs.name}</span>
                            </label>
                          )) : <div className="ote-link-empty">観察所見なし</div>}
                          <div className="ote-link-panel-title" style={{ marginTop: 12 }}>根拠となるテスト結果:</div>
                          {tests.length > 0 ? tests.map(test => (
                            <label key={test.id} className="ote-link-option">
                              <input type="checkbox" checked={(ev.linkedTestIds || []).includes(test.id)} onChange={() => toggleTestLink(ev.id, test.id)} />
                              <span>{test.name}</span>
                            </label>
                          )) : <div className="ote-link-empty">テスト結果なし</div>}
                        </div>
                      )}

                      <div className="ote-eval-card-footer">
                        <button className={`ote-send-hyp-btn ${ev.sendToHypothesis ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); onUpdate(ev.id, { sendToHypothesis: !ev.sendToHypothesis }); }}>
                          {ev.sendToHypothesis ? (
                            <><span className="ote-check-mark">✓</span>仮説へ送る</>
                          ) : (
                            <><IconArrowRight s={12} /> 仮説へ送る</>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}

                  <button className="ote-add-eval-btn" onClick={() => handleAddEval(catKey)}>
                    <IconPlus s={12} /> 評価カードを追加
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
