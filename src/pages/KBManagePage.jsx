import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  getItems, getAllSources, getLinks, getPriorityRules, getKBStats,
  getUniqueBodyRegions, getUniqueMovementThemes, getUniquePopulations, getUniqueLayers,
  getSourcesByKeys,
} from '../services/kbService';

const ITEM_TYPE_LABELS = {
  observation: '観察', test: 'テスト', evaluation: '評価', intervention: '介入',
  reevaluation: '再評価', intake_question: '問診', region_master: '部位マスター',
  movement_master: '動作マスター', population_master: '対象マスター',
};

const LINK_TYPE_LABELS = {
  intake_to_observation: '問診→観察', observation_to_test: '観察→テスト',
  test_to_evaluation: 'テスト→評価', evaluation_to_intervention: '評価→介入',
  intervention_to_reevaluation: '介入→再評価',
};

const LAYER_LABELS = {
  base: '基本', evidence: 'エビデンス拡張', movement: '動作別',
  population: '対象別', region: '部位別',
};

export default function KBManagePage() {
  const [tab, setTab] = useState('items');
  const [filters, setFilters] = useState({
    item_type: '', body_region: '', movement_theme: '', target_population: '', layer: '', search: '',
  });
  const [expandedId, setExpandedId] = useState(null);

  const stats = getKBStats();
  const bodyRegions = getUniqueBodyRegions();
  const movements = getUniqueMovementThemes();
  const populations = getUniquePopulations();
  const layers = getUniqueLayers();

  const updateFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));

  const filteredItems = useMemo(() => {
    const f = {};
    if (filters.item_type) f.item_type = filters.item_type;
    if (filters.body_region) f.body_region = filters.body_region;
    if (filters.movement_theme) f.movement_theme = filters.movement_theme;
    if (filters.target_population) f.target_population = filters.target_population;
    if (filters.layer) f.layer = filters.layer;
    if (filters.search) f.search = filters.search;
    return getItems(f);
  }, [filters]);

  const allSources = useMemo(() => getAllSources(), []);
  const allLinks = useMemo(() => getLinks({}), []);
  const allRules = useMemo(() => getPriorityRules(), []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">知識ベース管理</h1>
        <p className="page-subtitle">
          アイテム {stats.items}件 ・ リンク {stats.links}件 ・ 参考文献 {stats.sources}件 ・ 優先ルール {stats.priority_rules}件
        </p>
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: 'var(--space-lg)' }}>
        {[
          { key: 'items', label: `アイテム (${stats.items})` },
          { key: 'links', label: `リンク (${stats.links})` },
          { key: 'sources', label: `参考文献 (${stats.sources})` },
          { key: 'rules', label: `優先ルール (${stats.priority_rules})` },
        ].map(t => (
          <button key={t.key} className={`tab-item ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Items tab */}
      {tab === 'items' && (
        <>
          <div className="kb-filters">
            <select className="form-select kb-filter-select" value={filters.item_type} onChange={e => updateFilter('item_type', e.target.value)}>
              <option value="">全種別</option>
              {Object.entries(ITEM_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="form-select kb-filter-select" value={filters.body_region} onChange={e => updateFilter('body_region', e.target.value)}>
              <option value="">全部位</option>
              {bodyRegions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select className="form-select kb-filter-select" value={filters.movement_theme} onChange={e => updateFilter('movement_theme', e.target.value)}>
              <option value="">全動作</option>
              {movements.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select className="form-select kb-filter-select" value={filters.target_population} onChange={e => updateFilter('target_population', e.target.value)}>
              <option value="">全対象</option>
              {populations.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="form-select kb-filter-select" value={filters.layer} onChange={e => updateFilter('layer', e.target.value)}>
              <option value="">全層</option>
              {layers.map(l => <option key={l} value={l}>{LAYER_LABELS[l] || l}</option>)}
            </select>
            <input
              className="form-input kb-filter-search"
              type="text"
              placeholder="🔍 キーワード検索..."
              value={filters.search}
              onChange={e => updateFilter('search', e.target.value)}
            />
          </div>

          <div className="kb-results-count">
            {filteredItems.length}件 / {stats.items}件
          </div>

          <div className="kb-manage-list">
            {filteredItems.slice(0, 100).map(item => (
              <div key={item.id} className="kb-manage-card" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                <div className="kb-manage-card-header">
                  <span className={`kb-manage-type kb-manage-type--${item.item_type}`}>
                    {ITEM_TYPE_LABELS[item.item_type] || item.item_type}
                  </span>
                  <span className="kb-manage-title">{item.title}</span>
                  {item.body_region_label && <span className="kb-meta-tag">{item.body_region_label}</span>}
                  {item.layer && <span className="kb-meta-tag kb-meta-layer">{LAYER_LABELS[item.layer] || item.layer}</span>}
                </div>
                {expandedId === item.id && (
                  <div className="kb-manage-detail">
                    {item.content && item.content !== item.title && (
                      <div className="kb-manage-row"><span className="kb-manage-label">内容:</span> {item.content}</div>
                    )}
                    {item.movement_theme && <div className="kb-manage-row"><span className="kb-manage-label">動作:</span> {item.movement_theme}</div>}
                    {item.target_population && <div className="kb-manage-row"><span className="kb-manage-label">対象:</span> {item.target_population}</div>}
                    {item.condition_theme && <div className="kb-manage-row"><span className="kb-manage-label">条件:</span> {item.condition_theme}</div>}
                    {item.priority_base && <div className="kb-manage-row"><span className="kb-manage-label">優先度:</span> {item.priority_base}</div>}
                    {item.source_keys && (
                      <div className="kb-manage-row">
                        <span className="kb-manage-label">参考文献:</span>
                        {item.source_keys.split(';').map(k => (
                          <span key={k} className="kb-meta-tag">{k.trim()}</span>
                        ))}
                      </div>
                    )}
                    <div className="kb-manage-row"><span className="kb-manage-label">ID:</span> <code>{item.id}</code></div>
                  </div>
                )}
              </div>
            ))}
            {filteredItems.length > 100 && (
              <div className="kb-manage-more">… 他 {filteredItems.length - 100}件</div>
            )}
          </div>
        </>
      )}

      {/* Links tab */}
      {tab === 'links' && (
        <div className="kb-manage-list">
          <div className="kb-link-stats">
            {Object.entries(LINK_TYPE_LABELS).map(([key, label]) => {
              const count = allLinks.filter(l => l.link_type === key).length;
              return <span key={key} className="kb-link-stat">{label}: {count}</span>;
            })}
          </div>
          {allLinks.slice(0, 80).map((link, i) => (
            <div key={link.id || i} className="kb-manage-card kb-link-card">
              <div className="kb-manage-card-header">
                <span className="kb-meta-tag">{LINK_TYPE_LABELS[link.link_type] || link.link_type}</span>
                <span className="kb-manage-title" style={{ fontSize: 'var(--font-size-xs)' }}>{link.from_id} → {link.to_id}</span>
                <span className="kb-link-weight">重み: {link.priority_weight}</span>
              </div>
              {link.rationale && <div className="kb-link-rationale">{link.rationale}</div>}
            </div>
          ))}
          {allLinks.length > 80 && <div className="kb-manage-more">… 他 {allLinks.length - 80}件</div>}
        </div>
      )}

      {/* Sources tab */}
      {tab === 'sources' && (
        <div className="kb-manage-list">
          {allSources.map((src, i) => (
            <div key={src.source_key || i} className="kb-manage-card">
              <div className="kb-manage-card-header">
                <span className="kb-meta-tag">{src.source_key}</span>
                <span className={`kb-ref-ev kb-ref-ev--${(src.evidence_level || 'C').toLowerCase()}`}>
                  Evidence: {src.evidence_level || '—'}
                </span>
              </div>
              <div className="kb-manage-title" style={{ marginTop: 4 }}>{src.title} ({src.year})</div>
              {src.study_design && <div className="kb-manage-row" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{src.study_design}</div>}
              {src.practical_use && <div className="kb-manage-row" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>実務: {src.practical_use}</div>}
              {src.url && <a href={src.url} target="_blank" rel="noopener noreferrer" className="kb-ref-link" style={{ fontSize: 'var(--font-size-xs)' }}>PubMed →</a>}
            </div>
          ))}
        </div>
      )}

      {/* Rules tab */}
      {tab === 'rules' && (
        <div className="kb-manage-list">
          {allRules.map((rule, i) => (
            <div key={i} className="kb-manage-card">
              <div className="kb-manage-card-header">
                <span className="kb-meta-tag">{rule.rule_type}</span>
                <span className="kb-manage-title">{rule.rule_key} {rule.condition_key ? `× ${rule.condition_key}` : ''}</span>
                {rule.weight_adjustment !== 0 && <span className="kb-link-weight">+{rule.weight_adjustment}</span>}
              </div>
              {rule.boost_observations && <div className="kb-manage-row" style={{ fontSize: 'var(--font-size-xs)' }}>観察: {rule.boost_observations}</div>}
              {rule.boost_tests && <div className="kb-manage-row" style={{ fontSize: 'var(--font-size-xs)' }}>テスト: {rule.boost_tests}</div>}
              {rule.boost_interventions && <div className="kb-manage-row" style={{ fontSize: 'var(--font-size-xs)' }}>介入: {rule.boost_interventions}</div>}
              {rule.note && <div className="kb-manage-row" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{rule.note}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
