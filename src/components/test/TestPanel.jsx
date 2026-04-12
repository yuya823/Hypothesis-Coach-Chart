import { useState } from 'react';
import {
  TEST_CATEGORIES,
  TEST_PRESETS,
  TEST_RESULT_OPTIONS,
  LATERALITY_OPTIONS,
  createTest,
} from '../../data/observationPresets';
import { TEST_ICONS, IconPlus, IconEdit, IconX, IconLink, IconChevronDown, IconSpark } from '../Icons';

export default function TestPanel({
  tests,
  observations,
  onAdd,
  onUpdate,
  onRemove,
  highlightedIds,
  onSelect,
  pendingTestRequest,
  onClearTestRequest,
  onAISuggest,
  aiLoading,
}) {
  const [expandedCats, setExpandedCats] = useState({ mobility: true, muscle_stability: true, sensory: false, breathing_pressure: false, appearance_body: false, custom: false });
  const [customInputs, setCustomInputs] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [linkingId, setLinkingId] = useState(null);

  const toggleCat = (cat) => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));

  const handlePresetClick = (cat, presetName) => {
    const newTest = createTest(cat, presetName, true);
    if (pendingTestRequest) {
      newTest.linkedObservationIds = [pendingTestRequest.id];
      onClearTestRequest?.();
    }
    onAdd(newTest);
    setEditingId(newTest.id);
  };

  const handleCustomAdd = (cat) => {
    const text = (customInputs[cat] || '').trim();
    if (!text) return;
    const newTest = createTest(cat, text, false);
    if (pendingTestRequest) {
      newTest.linkedObservationIds = [pendingTestRequest.id];
      onClearTestRequest?.();
    }
    onAdd(newTest);
    setCustomInputs(prev => ({ ...prev, [cat]: '' }));
    setEditingId(newTest.id);
  };

  const toggleObsLink = (testId, obsId) => {
    const test = tests.find(t => t.id === testId);
    if (!test) return;
    const linked = test.linkedObservationIds || [];
    const newLinked = linked.includes(obsId) ? linked.filter(id => id !== obsId) : [...linked, obsId];
    onUpdate(testId, { linkedObservationIds: newLinked });
  };

  const catTests = (cat) => tests.filter(t => t.category === cat);

  return (
    <div className="ote-panel ote-panel--test">
      <div className="ote-panel-header">
        <div className="ote-panel-header-icon ote-test-bg">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6M10 3v6.5L4 18a1 1 0 00.87 1.5h14.26A1 1 0 0020 18l-6-8.5V3"/></svg>
        </div>
        <div>
          <h2 className="ote-panel-title">テスト</h2>
          <p className="ote-panel-subtitle">確かめた事実</p>
        </div>
        <span className="ote-panel-count ote-test-count">{tests.length}</span>
      </div>

      {/* AI suggest button */}
      {onAISuggest && (
        <button className="ote-ai-suggest-btn ote-ai-suggest-btn--test" onClick={onAISuggest} disabled={aiLoading || observations.length === 0}>
          <IconSpark s={14} />
          {aiLoading ? 'AI分析中...' : '観察からテスト提案'}
        </button>
      )}

      {pendingTestRequest && (
        <div className="ote-test-request">
          <div className="ote-test-request-text">
            <IconLink s={14} />
            「{pendingTestRequest.name}」を確かめるテストを追加
          </div>
          <button className="ote-item-btn" onClick={onClearTestRequest}><IconX s={12} /></button>
        </div>
      )}

      <div className="ote-panel-body">
        {Object.entries(TEST_CATEGORIES).map(([catKey, catMeta]) => {
          const presets = TEST_PRESETS[catKey] || [];
          const items = catTests(catKey);
          const isOpen = expandedCats[catKey];
          const CatIcon = TEST_ICONS[catKey];

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
                  {presets.length > 0 && (
                    <div className="ote-preset-grid">
                      {presets.map(name => (
                        <button key={name} className="ote-preset-tag ote-preset-tag--test" onClick={() => handlePresetClick(catKey, name)}>+ {name}</button>
                      ))}
                    </div>
                  )}

                  {items.map(test => (
                    <div key={test.id} className={`ote-item ote-test-item ${highlightedIds?.includes(test.id) ? 'highlighted' : ''}`} onClick={() => onSelect?.(test.id, 'test')}>
                      <div className="ote-item-header">
                        <span className="ote-item-name">{test.name}</span>
                        <div className="ote-item-actions">
                          <button className="ote-item-btn" title="観察との紐づけ" onClick={(e) => { e.stopPropagation(); setLinkingId(linkingId === test.id ? null : test.id); }}><IconLink s={12} /></button>
                          <button className="ote-item-btn" title="詳細を編集" onClick={(e) => { e.stopPropagation(); setEditingId(editingId === test.id ? null : test.id); }}><IconEdit s={12} /></button>
                          <button className="ote-item-btn ote-item-btn--danger" onClick={(e) => { e.stopPropagation(); onRemove(test.id); }}><IconX s={12} /></button>
                        </div>
                      </div>

                      <div className="ote-item-badges">
                        {test.result && <span className="ote-badge ote-badge--result">{TEST_RESULT_OPTIONS.find(r => r.value === test.result)?.label || test.result}</span>}
                        {test.laterality && test.laterality !== 'none' && <span className="ote-badge ote-badge--laterality">{LATERALITY_OPTIONS.find(l => l.value === test.laterality)?.label || test.laterality}</span>}
                        {test.score && <span className="ote-badge ote-badge--score">{test.score}</span>}
                      </div>

                      {test.linkedObservationIds?.length > 0 && (
                        <div className="ote-linked-items">
                          {test.linkedObservationIds.map(obsId => {
                            const obs = observations.find(o => o.id === obsId);
                            return obs ? <span key={obsId} className="ote-linked-tag ote-linked-tag--obs">{obs.name}</span> : null;
                          })}
                        </div>
                      )}

                      {editingId === test.id && (
                        <div className="ote-item-edit" onClick={e => e.stopPropagation()}>
                          <div className="ote-edit-row"><label>結果</label><select value={test.result || ''} onChange={e => onUpdate(test.id, { result: e.target.value })}><option value="">未設定</option>{TEST_RESULT_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
                          <div className="ote-edit-row"><label>左右</label><select value={test.laterality || ''} onChange={e => onUpdate(test.id, { laterality: e.target.value })}><option value="">未設定</option>{LATERALITY_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}</select></div>
                          <div className="ote-edit-row"><label>スコア</label><input type="text" value={test.score || ''} onChange={e => onUpdate(test.id, { score: e.target.value })} placeholder="例: 左8cm / 右12cm" /></div>
                          <div className="ote-edit-row"><label>コメント</label><input type="text" value={test.comment || ''} onChange={e => onUpdate(test.id, { comment: e.target.value })} placeholder="補足情報..." /></div>
                        </div>
                      )}

                      {linkingId === test.id && (
                        <div className="ote-link-panel" onClick={e => e.stopPropagation()}>
                          <div className="ote-link-panel-title">確かめる観察所見を選択:</div>
                          {observations.length > 0 ? observations.map(obs => (
                            <label key={obs.id} className="ote-link-option">
                              <input type="checkbox" checked={(test.linkedObservationIds || []).includes(obs.id)} onChange={() => toggleObsLink(test.id, obs.id)} />
                              <span>{obs.name}</span>
                            </label>
                          )) : <div className="ote-link-empty">先に観察所見を追加してください</div>}
                        </div>
                      )}

                      {test.comment && editingId !== test.id && <div className="ote-item-comment">{test.comment}</div>}
                    </div>
                  ))}

                  <div className="ote-add-row">
                    <input type="text" className="ote-add-input" placeholder="テスト追加..." value={customInputs[catKey] || ''} onChange={e => setCustomInputs(prev => ({ ...prev, [catKey]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleCustomAdd(catKey)} />
                    <button className="ote-add-btn ote-add-btn--test" onClick={() => handleCustomAdd(catKey)}><IconPlus s={14} /></button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
