import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as db from '../lib/database';
import { useAuth } from '../App';
import { promptE_SessionStructuring } from '../services/aiService';
import {
  createObservation,
  createTest,
  createEvaluation,
} from '../data/observationPresets';
import DraftCard, { CATEGORY_LABELS } from '../components/draft/DraftCard';

const FACT_CATEGORIES = ['intake', 'observation', 'test', 'intervention', 'reevaluation'];
const INTERP_CATEGORIES = ['evaluation', 'hypothesis', 'notice'];
const META_CATEGORIES = ['homework', 'next_plan'];

const INPUT_TYPES = [
  { value: 'transcript', label: '文字起こし', placeholder: 'セッションの文字起こしテキストを貼り付け...' },
  { value: 'memo', label: '自由メモ', placeholder: 'セッション中のメモを貼り付け...' },
  { value: 'bullet', label: '箇条書き', placeholder: '箇条書きのメモを貼り付け...' },
];

export default function AIDraftReviewPage() {
  const { id: sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [client, setClient] = useState(null);
  const [intake, setIntake] = useState(null);
  const [loading, setLoading] = useState(true);

  // Input state
  const [inputType, setInputType] = useState('memo');
  const [rawText, setRawText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Draft items
  const [draftItems, setDraftItems] = useState([]);
  const [unclassified, setUnclassified] = useState([]);
  const [highlightExcerpt, setHighlightExcerpt] = useState('');

  // Applying state
  const [applying, setApplying] = useState(false);
  const [phase, setPhase] = useState('input'); // input | review | done

  useEffect(() => { loadData(); }, [sessionId]);

  async function loadData() {
    try {
      const s = await db.getSessionById(sessionId);
      setSession(s);
      const c = await db.getClientById(s.client_id);
      setClient(c);
      try { const i = await db.getIntakeByClientId(s.client_id); setIntake(i); } catch {}
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  // ─── AI Analysis ───
  const handleAnalyze = async () => {
    if (!rawText.trim()) { alert('テキストを入力してください'); return; }
    setAiLoading(true);
    try {
      const clientContext = {
        chief_complaint: intake?.chief_complaint || client?.latest_chief_complaint || '',
        goal: intake?.goal || client?.latest_goal || '',
      };
      const result = await promptE_SessionStructuring(rawText, inputType, clientContext);
      if (result.success && result.data.items) {
        const items = result.data.items.map((item, i) => ({
          ...item,
          id: item.id || `draft_${Date.now()}_${i}`,
          status: 'pending',
        }));
        setDraftItems(items);
        setUnclassified(result.data.unclassified || []);
        setPhase('review');
      } else {
        alert('AI解析エラー: ' + (result.error || '不明なエラー'));
      }
    } catch (err) {
      alert('AI解析エラー: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // ─── Draft item updates ───
  const updateDraftItem = (id, updates) => {
    setDraftItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeDraftItem = (id) => {
    setDraftItems(prev => prev.filter(item => item.id !== id));
  };

  // ─── Categorized items ───
  const factItems = useMemo(() => draftItems.filter(i => FACT_CATEGORIES.includes(i.category)), [draftItems]);
  const interpItems = useMemo(() => draftItems.filter(i => INTERP_CATEGORIES.includes(i.category)), [draftItems]);
  const metaItems = useMemo(() => draftItems.filter(i => META_CATEGORIES.includes(i.category)), [draftItems]);
  const approvedCount = useMemo(() => draftItems.filter(i => i.status === 'approved' || i.status === 'modified').length, [draftItems]);

  // ─── Highlight source excerpt ───
  const handleHighlightSource = (excerpt) => {
    setHighlightExcerpt(excerpt);
    setTimeout(() => setHighlightExcerpt(''), 3000);
  };

  // ─── Bulk actions ───
  const handleApproveAll = () => {
    setDraftItems(prev => prev.map(item => item.status === 'pending' ? { ...item, status: 'approved' } : item));
  };

  const handleRejectAll = () => {
    setDraftItems(prev => prev.map(item => ({ ...item, status: 'rejected' })));
  };

  // ─── Apply to session ───
  const handleApplyToSession = async () => {
    const approved = draftItems.filter(i => i.status === 'approved' || i.status === 'modified');
    if (approved.length === 0) { alert('採用する項目がありません'); return; }
    if (!confirm(`${approved.length}件の項目をセッションに反映しますか？`)) return;

    setApplying(true);
    try {
      // Load existing observations data
      const existingObs = session?.observations || {};
      const observations = existingObs.observations || [];
      const tests = existingObs.tests || [];
      const evaluations = existingObs.evaluations || [];
      const freeNote = existingObs.freeNote || '';

      // Process each approved item
      const hwItems = [];
      const nextPlanItems = [];

      for (const item of approved) {
        switch (item.category) {
          case 'observation': {
            const obs = createObservation(item.sub_category || 'dynamic', item.title, false);
            obs.comment = item.content;
            obs.source = 'ai_draft';
            observations.push(obs);
            break;
          }
          case 'test': {
            const test = createTest(item.sub_category || 'mobility', item.title, false);
            test.comment = item.content;
            test.source = 'ai_draft';
            tests.push(test);
            break;
          }
          case 'evaluation': {
            const ev = createEvaluation(item.sub_category || 'structure_mobility');
            ev.title = item.title;
            ev.interpretation = item.content;
            ev.source = 'ai_draft';
            evaluations.push(ev);
            break;
          }
          case 'hypothesis': {
            const catMap = {
              structure_mobility: '構造・可動性仮説', muscle_function: '筋機能仮説',
              motor_control: '運動制御仮説', sensory_input: '感覚入力仮説',
              breathing_pressure: '呼吸・圧仮説', lifestyle: '生活背景仮説',
            };
            await db.createHypothesis({
              session_id: sessionId,
              category: catMap[item.sub_category] || '構造・可動性仮説',
              description: `${item.title}\n${item.content}`,
              rationale: item.source_excerpt || '',
              priority: item.confidence === 'high' ? 1 : item.confidence === 'low' ? 3 : 2,
              status: 'pending', source: 'ai',
            });
            break;
          }
          case 'intervention': {
            await db.createIntervention({
              session_id: sessionId,
              name: item.title,
              intent: item.content,
              reevaluation_items: [],
              source: 'ai',
            });
            break;
          }
          case 'homework':
            hwItems.push(item.title + (item.content ? `: ${item.content}` : ''));
            break;
          case 'next_plan':
            nextPlanItems.push(item.title + (item.content ? `: ${item.content}` : ''));
            break;
          case 'intake':
          case 'reevaluation':
          case 'notice':
            // Add to free note
            observations.push(createObservation('freeNote', `[${CATEGORY_LABELS[item.category]}] ${item.title}: ${item.content}`, false));
            break;
        }
      }

      // Save observations
      const updatedObs = { observations, tests, evaluations, freeNote };
      const sessionUpdates = { observations: updatedObs };

      if (hwItems.length > 0) {
        sessionUpdates.homework = [session?.homework, ...hwItems].filter(Boolean).join('\n');
      }
      if (nextPlanItems.length > 0) {
        sessionUpdates.next_plan = [session?.next_plan, ...nextPlanItems].filter(Boolean).join('\n');
      }

      await db.updateSession(sessionId, sessionUpdates);

      await db.createAuditLog({
        user_id: user.id, user_name: user.name,
        action: 'ai_draft_apply', target: sessionId,
        target_label: `${client?.name} - AI下書き反映`,
        details: `${approved.length}件を反映（観察${approved.filter(i => i.category === 'observation').length}, テスト${approved.filter(i => i.category === 'test').length}, 評価${approved.filter(i => i.category === 'evaluation').length}, 仮説${approved.filter(i => i.category === 'hypothesis').length}）`,
      });

      setPhase('done');
    } catch (err) {
      alert('反映エラー: ' + err.message);
    } finally {
      setApplying(false);
    }
  };

  // ─── Highlighted text ───
  const getHighlightedRawText = () => {
    if (!highlightExcerpt || !rawText) return rawText;
    return rawText; // actual highlighting done via CSS
  };

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>読み込み中...</div>;

  // ─── Done phase ───
  if (phase === 'done') {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: 'var(--space-2xl)' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 'var(--space-md)' }}>✓</div>
          <h2 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-text-primary)' }}>セッションデータに反映しました</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
            AI下書きから承認した項目がセッションの各画面に反映されています。
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
            <Link to={`/sessions/${sessionId}/observation`} className="btn btn-primary">観察画面を確認</Link>
            <Link to={`/sessions/${sessionId}/hypothesis`} className="btn btn-secondary">仮説画面を確認</Link>
            <button className="btn btn-ghost" onClick={() => { setPhase('input'); setDraftItems([]); setRawText(''); }}>
              別のテキストを解析
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Input phase ───
  if (phase === 'input') {
    return (
      <div className="ai-draft-page">
        <div className="page-header">
          <Link to={`/sessions/${sessionId}/observation`} className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-sm)' }}>← 観察画面に戻る</Link>
          <h1 className="page-title">AI下書き入力</h1>
          <p className="page-subtitle">{client?.name} ・ 第{session?.session_number}回セッション — テキストからセッション内容を自動構造化</p>
        </div>

        <div className="card" style={{ maxWidth: 800, margin: '0 auto' }}>
          <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>テキストを入力</h3>

          <div className="tab-bar" style={{ marginBottom: 'var(--space-md)' }}>
            {INPUT_TYPES.map(t => (
              <button key={t.value} className={`tab-item ${inputType === t.value ? 'active' : ''}`} onClick={() => setInputType(t.value)}>
                {t.label}
              </button>
            ))}
          </div>

          <textarea
            className="form-textarea"
            rows={12}
            placeholder={INPUT_TYPES.find(t => t.value === inputType)?.placeholder}
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.8 }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-md)' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              {rawText.length > 0 ? `${rawText.length}文字` : ''}
            </span>
            <button className="btn btn-primary" onClick={handleAnalyze} disabled={aiLoading || !rawText.trim()}>
              {aiLoading ? 'AI解析中...' : 'AIで構造化する'}
            </button>
          </div>

          <div className="ai-disclaimer" style={{ marginTop: 'var(--space-md)' }}>
            ⚠ AI抽出結果は自動反映されません。次の画面で内容を確認・修正してから反映してください。
          </div>
        </div>
      </div>
    );
  }

  // ─── Review phase ───
  return (
    <div className="ai-draft-page">
      <div className="draft-review-header">
        <div className="draft-review-header-left">
          <button className="btn btn-ghost btn-sm" onClick={() => setPhase('input')}>← テキスト入力に戻る</button>
          <h1 className="page-title">AI下書きレビュー</h1>
          <p className="page-subtitle">
            {draftItems.length}件抽出 ・ {approvedCount}件採用済 ・ {draftItems.filter(i => i.status === 'rejected').length}件削除
          </p>
        </div>
        <div className="draft-review-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={handleApproveAll}>全て採用</button>
          <button className="btn btn-ghost btn-sm" onClick={handleRejectAll}>全て削除</button>
          <button className="btn btn-primary" onClick={handleApplyToSession} disabled={applying || approvedCount === 0}>
            {applying ? '反映中...' : `セッションに反映 (${approvedCount}件)`}
          </button>
        </div>
      </div>

      <div className="draft-review-columns">
        {/* Left: Source text */}
        <div className="draft-review-source">
          <div className="draft-column-title">元テキスト</div>
          <div className="draft-source-text">
            {highlightExcerpt ? (
              <HighlightedText text={rawText} highlight={highlightExcerpt} />
            ) : (
              <pre className="draft-source-pre">{rawText}</pre>
            )}
          </div>
          {unclassified.length > 0 && (
            <div className="draft-unclassified">
              <div className="draft-column-subtitle">未分類テキスト</div>
              {unclassified.map((u, i) => (
                <div key={i} className="draft-unclassified-item">
                  <div className="draft-unclassified-text">"{u.text}"</div>
                  <div className="draft-unclassified-reason">{u.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Middle: Facts */}
        <div className="draft-review-facts">
          <div className="draft-column-title">
            <span className="draft-dot draft-dot--fact"></span>
            事実 ({factItems.length})
          </div>
          {FACT_CATEGORIES.map(cat => {
            const items = factItems.filter(i => i.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="draft-category-group">
                <div className="draft-category-label">{CATEGORY_LABELS[cat]}</div>
                {items.map(item => (
                  <DraftCard key={item.id} item={item} onUpdate={updateDraftItem} onRemove={removeDraftItem} onHighlightSource={handleHighlightSource} />
                ))}
              </div>
            );
          })}
          {factItems.length === 0 && <div className="draft-empty">事実項目なし</div>}
        </div>

        {/* Right: Interpretations */}
        <div className="draft-review-interp">
          <div className="draft-column-title">
            <span className="draft-dot draft-dot--interp"></span>
            解釈 ({interpItems.length})
          </div>
          {INTERP_CATEGORIES.map(cat => {
            const items = interpItems.filter(i => i.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="draft-category-group">
                <div className="draft-category-label">{CATEGORY_LABELS[cat]}</div>
                {items.map(item => (
                  <DraftCard key={item.id} item={item} onUpdate={updateDraftItem} onRemove={removeDraftItem} onHighlightSource={handleHighlightSource} />
                ))}
              </div>
            );
          })}
          {interpItems.length === 0 && <div className="draft-empty">解釈項目なし</div>}

          {/* Meta items */}
          {metaItems.length > 0 && (
            <>
              <div className="draft-column-title" style={{ marginTop: 'var(--space-lg)' }}>
                <span className="draft-dot draft-dot--meta"></span>
                その他 ({metaItems.length})
              </div>
              {metaItems.map(item => (
                <DraftCard key={item.id} item={item} onUpdate={updateDraftItem} onRemove={removeDraftItem} onHighlightSource={handleHighlightSource} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Highlighted text helper ───
function HighlightedText({ text, highlight }) {
  if (!highlight) return <pre className="draft-source-pre">{text}</pre>;
  const idx = text.indexOf(highlight);
  if (idx === -1) return <pre className="draft-source-pre">{text}</pre>;
  return (
    <pre className="draft-source-pre">
      {text.substring(0, idx)}
      <mark className="draft-highlight">{highlight}</mark>
      {text.substring(idx + highlight.length)}
    </pre>
  );
}
