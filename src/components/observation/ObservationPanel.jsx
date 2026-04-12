import { useState } from 'react';
import {
  OBSERVATION_CATEGORIES,
  OBSERVATION_PRESETS,
  SEVERITY_OPTIONS,
  LATERALITY_OPTIONS,
  CONDITION_OPTIONS,
  createObservation,
} from '../../data/observationPresets';
import { OBS_ICONS, IconPlus, IconEdit, IconX, IconArrowRight, IconChevronDown, IconSpark } from '../Icons';

export default function ObservationPanel({
  observations,
  onAdd,
  onUpdate,
  onRemove,
  onRequestTest,
  highlightedIds,
  onSelect,
  onAISuggest,
  aiLoading,
}) {
  const [expandedCats, setExpandedCats] = useState({ static: true, dynamic: true, breathing: false, sensory: false, appearance: false, freeNote: false });
  const [customInputs, setCustomInputs] = useState({});
  const [editingId, setEditingId] = useState(null);

  const toggleCat = (cat) => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));

  const handlePresetClick = (cat, presetName) => {
    const exists = observations.some(o => o.category === cat && o.name === presetName);
    if (!exists) {
      onAdd(createObservation(cat, presetName, true));
    }
  };

  const handleCustomAdd = (cat) => {
    const text = (customInputs[cat] || '').trim();
    if (!text) return;
    onAdd(createObservation(cat, text, false));
    setCustomInputs(prev => ({ ...prev, [cat]: '' }));
  };

  const isPresetActive = (cat, name) => observations.some(o => o.category === cat && o.name === name);
  const catEntries = Object.entries(OBSERVATION_CATEGORIES).filter(([key]) => key !== 'freeNote');
  const catObservations = (cat) => observations.filter(o => o.category === cat);

  return (
    <div className="ote-panel ote-panel--observation">
      <div className="ote-panel-header">
        <div className="ote-panel-header-icon ote-obs-bg">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        </div>
        <div>
          <h2 className="ote-panel-title">観察</h2>
          <p className="ote-panel-subtitle">見た事実を記録</p>
        </div>
        <span className="ote-panel-count ote-obs-count">{observations.length}</span>
      </div>

      {/* AI suggest button */}
      {onAISuggest && (
        <button className="ote-ai-suggest-btn ote-ai-suggest-btn--obs" onClick={onAISuggest} disabled={aiLoading}>
          <IconSpark s={14} />
          {aiLoading ? 'AI分析中...' : '問診からAI提案'}
        </button>
      )}

      <div className="ote-panel-body">
        {catEntries.map(([catKey, catMeta]) => {
          const presets = OBSERVATION_PRESETS[catKey] || [];
          const items = catObservations(catKey);
          const isOpen = expandedCats[catKey];
          const CatIcon = OBS_ICONS[catKey];

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
                        <button key={name} className={`ote-preset-tag ${isPresetActive(catKey, name) ? 'active' : ''}`} onClick={() => handlePresetClick(catKey, name)}>
                          {isPresetActive(catKey, name) ? '✓ ' : '+ '}{name}
                        </button>
                      ))}
                    </div>
                  )}

                  {items.map(obs => (
                    <div key={obs.id} className={`ote-item ote-obs-item ${highlightedIds?.includes(obs.id) ? 'highlighted' : ''}`} onClick={() => onSelect?.(obs.id, 'observation')}>
                      <div className="ote-item-header">
                        <span className="ote-item-name">{obs.name}</span>
                        <div className="ote-item-actions">
                          <button className="ote-item-btn" title="この所見を確かめるテストを追加" onClick={(e) => { e.stopPropagation(); onRequestTest?.(obs); }}>
                            <IconArrowRight s={12} />
                          </button>
                          <button className="ote-item-btn" onClick={(e) => { e.stopPropagation(); setEditingId(editingId === obs.id ? null : obs.id); }}>
                            <IconEdit s={12} />
                          </button>
                          <button className="ote-item-btn ote-item-btn--danger" onClick={(e) => { e.stopPropagation(); onRemove(obs.id); }}>
                            <IconX s={12} />
                          </button>
                        </div>
                      </div>

                      <div className="ote-item-badges">
                        {obs.severity && <span className="ote-badge ote-badge--severity">{SEVERITY_OPTIONS.find(s => s.value === obs.severity)?.label || obs.severity}</span>}
                        {obs.laterality && obs.laterality !== 'none' && <span className="ote-badge ote-badge--laterality">{LATERALITY_OPTIONS.find(l => l.value === obs.laterality)?.label || obs.laterality}</span>}
                        {obs.condition && <span className="ote-badge ote-badge--condition">{CONDITION_OPTIONS.find(c => c.value === obs.condition)?.label || obs.condition}</span>}
                      </div>

                      {editingId === obs.id && (
                        <div className="ote-item-edit" onClick={e => e.stopPropagation()}>
                          <div className="ote-edit-row"><label>程度</label><select value={obs.severity || ''} onChange={e => onUpdate(obs.id, { severity: e.target.value })}><option value="">未設定</option>{SEVERITY_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
                          <div className="ote-edit-row"><label>左右差</label><select value={obs.laterality || ''} onChange={e => onUpdate(obs.id, { laterality: e.target.value })}><option value="">未設定</option>{LATERALITY_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}</select></div>
                          <div className="ote-edit-row"><label>条件</label><select value={obs.condition || ''} onChange={e => onUpdate(obs.id, { condition: e.target.value })}><option value="">未設定</option>{CONDITION_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                          <div className="ote-edit-row"><label>コメント</label><input type="text" value={obs.comment || ''} onChange={e => onUpdate(obs.id, { comment: e.target.value })} placeholder="補足情報..." /></div>
                        </div>
                      )}

                      {obs.comment && editingId !== obs.id && <div className="ote-item-comment">{obs.comment}</div>}
                    </div>
                  ))}

                  <div className="ote-add-row">
                    <input type="text" className="ote-add-input" placeholder="その他を追加..." value={customInputs[catKey] || ''} onChange={e => setCustomInputs(prev => ({ ...prev, [catKey]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleCustomAdd(catKey)} />
                    <button className="ote-add-btn" onClick={() => handleCustomAdd(catKey)}><IconPlus s={14} /></button>
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
