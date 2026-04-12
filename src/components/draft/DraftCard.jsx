import { useState } from 'react';
import { IconEdit, IconX, IconChevronDown } from '../Icons';

const CATEGORY_LABELS = {
  intake: '問診', observation: '観察', test: 'テスト', evaluation: '評価',
  hypothesis: '仮説', intervention: '介入', reevaluation: '再評価',
  homework: 'ホームワーク', next_plan: '次回方針', notice: '要確認',
};

const CATEGORY_MOVE_OPTIONS = Object.entries(CATEGORY_LABELS);

const TYPE_STYLES = {
  fact: { color: '#4a6fa5', bg: 'rgba(74,111,165,0.08)', label: '事実' },
  interpretation: { color: '#7c5cbf', bg: 'rgba(124,92,191,0.08)', label: '解釈' },
  tentative: { color: '#b8860b', bg: 'rgba(184,134,11,0.08)', label: '推定' },
};

const CONFIDENCE_STYLES = {
  high: { color: '#3a8a6a', label: '高' },
  medium: { color: '#b8860b', label: '中' },
  low: { color: '#c0392b', label: '低' },
};

const STATUS_OPTIONS = ['pending', 'approved', 'modified', 'rejected'];

export default function DraftCard({ item, onUpdate, onRemove, onHighlightSource }) {
  const [editing, setEditing] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const typeStyle = TYPE_STYLES[item.type] || TYPE_STYLES.fact;
  const confStyle = CONFIDENCE_STYLES[item.confidence] || CONFIDENCE_STYLES.medium;
  const statusClass = item.status === 'approved' ? 'draft-approved' : item.status === 'rejected' ? 'draft-rejected' : item.status === 'modified' ? 'draft-modified' : '';

  return (
    <div className={`draft-card ${statusClass}`} style={{ borderLeftColor: typeStyle.color }}>
      {/* Header */}
      <div className="draft-card-header">
        <div className="draft-card-title-row">
          {editing ? (
            <input
              type="text"
              className="draft-title-input"
              value={item.title}
              onChange={e => onUpdate(item.id, { title: e.target.value, status: 'modified' })}
              autoFocus
            />
          ) : (
            <span className="draft-card-title">{item.title}</span>
          )}
        </div>
        <div className="draft-card-badges">
          <span className="draft-type-badge" style={{ color: typeStyle.color, background: typeStyle.bg }}>
            {typeStyle.label}
          </span>
          <span className="draft-conf-dot" style={{ background: confStyle.color }} title={`確信度: ${confStyle.label}`}></span>
        </div>
      </div>

      {/* Content */}
      {editing ? (
        <textarea
          className="draft-content-edit"
          value={item.content}
          onChange={e => onUpdate(item.id, { content: e.target.value, status: 'modified' })}
          rows={3}
        />
      ) : (
        <div className="draft-card-content">{item.content}</div>
      )}

      {/* Source excerpt */}
      {item.source_excerpt && (
        <div
          className="draft-source"
          onClick={() => onHighlightSource?.(item.source_excerpt)}
          title="クリックで元テキストをハイライト"
        >
          "{item.source_excerpt}"
        </div>
      )}

      {/* Actions */}
      <div className="draft-card-actions">
        <button
          className={`draft-action-btn draft-action-approve ${item.status === 'approved' ? 'active' : ''}`}
          onClick={() => onUpdate(item.id, { status: item.status === 'approved' ? 'pending' : 'approved' })}
        >
          ✓ 採用
        </button>
        <button
          className={`draft-action-btn draft-action-edit ${editing ? 'active' : ''}`}
          onClick={() => setEditing(!editing)}
        >
          <IconEdit s={11} /> 修正
        </button>
        <button
          className="draft-action-btn draft-action-move"
          onClick={() => setShowMove(!showMove)}
        >
          → 移動
        </button>
        <button
          className="draft-action-btn draft-action-delete"
          onClick={() => onUpdate(item.id, { status: 'rejected' })}
        >
          <IconX s={11} /> 削除
        </button>
      </div>

      {/* Move dropdown */}
      {showMove && (
        <div className="draft-move-dropdown">
          {CATEGORY_MOVE_OPTIONS.map(([key, label]) => (
            <button
              key={key}
              className={`draft-move-option ${key === item.category ? 'current' : ''}`}
              onClick={() => { onUpdate(item.id, { category: key, status: 'modified' }); setShowMove(false); }}
              disabled={key === item.category}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { CATEGORY_LABELS, TYPE_STYLES, CONFIDENCE_STYLES };
