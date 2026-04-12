import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as db from '../lib/database';
import { useAuth } from '../App';
import {
  OBSERVATION_CATEGORIES,
  TEST_CATEGORIES,
  EVALUATION_CATEGORIES,
  EVAL_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
  DEMO_DATA,
  migrateObservations,
  createObservation,
  createTest,
  createEvaluation,
} from '../data/observationPresets';
import {
  suggestObservationsFromIntake,
  suggestTestsFromObservations,
  suggestEvaluationsFromFindings,
} from '../services/aiService';
import ObservationPanel from '../components/observation/ObservationPanel';
import TestPanel from '../components/test/TestPanel';
import EvaluationPanel from '../components/evaluation/EvaluationPanel';
import { IconSearch, IconFlask, IconPuzzle, IconLink as IconLinkSvg } from '../components/Icons';
import KBSuggestionPanel from '../components/kb/KBSuggestionPanel';

export default function ObservationTestEvalPage() {
  const { id: sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [client, setClient] = useState(null);
  const [intake, setIntake] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [observations, setObservations] = useState([]);
  const [tests, setTests] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [freeNote, setFreeNote] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [pendingTestRequest, setPendingTestRequest] = useState(null);
  const [showRelationView, setShowRelationView] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [mobileTab, setMobileTab] = useState('observation');

  // AI loading states
  const [aiObsLoading, setAiObsLoading] = useState(false);
  const [aiTestLoading, setAiTestLoading] = useState(false);
  const [aiEvalLoading, setAiEvalLoading] = useState(false);

  useEffect(() => { loadData(); }, [sessionId]);

  async function loadData() {
    try {
      const s = await db.getSessionById(sessionId);
      setSession(s);
      const c = await db.getClientById(s.client_id);
      setClient(c);

      // Load intake data for AI suggestions
      try {
        const i = await db.getIntakeByClientId(s.client_id);
        setIntake(i);
      } catch (e) { /* no intake yet */ }

      if (s.observations && Object.keys(s.observations).length > 0) {
        const migrated = migrateObservations(s.observations);
        setObservations(migrated.observations || []);
        setTests(migrated.tests || []);
        setEvaluations(migrated.evaluations || []);
        setFreeNote(migrated.freeNote || s.free_note || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ─── Save ───
  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { observations, tests, evaluations, freeNote };
      await db.updateSession(sessionId, { observations: data, free_note: freeNote });
      await db.createAuditLog({ user_id: user.id, user_name: user.name, action: 'observation_save', target: sessionId, target_label: `${client?.name} - 観察・テスト・評価`, details: `観察${observations.length}件、テスト${tests.length}件、評価${evaluations.length}件を保存` });
      alert('保存しました');
    } catch (err) {
      alert('保存に失敗: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadDemo = () => {
    if (observations.length > 0 || tests.length > 0 || evaluations.length > 0) {
      if (!confirm('現在のデータを上書きしてデモデータを読み込みますか？')) return;
    }
    setObservations([...DEMO_DATA.observations]);
    setTests([...DEMO_DATA.tests]);
    setEvaluations([...DEMO_DATA.evaluations]);
    setFreeNote(DEMO_DATA.freeNote);
  };

  // ─── AI Suggestions ───
  const handleAISuggestObservations = async () => {
    if (!intake) {
      alert('問診データがありません。先にインテーク情報を入力してください。');
      return;
    }
    setAiObsLoading(true);
    try {
      const result = await suggestObservationsFromIntake(intake);
      if (result.success && result.data.suggestions) {
        const newObs = result.data.suggestions
          .filter(s => !observations.some(o => o.name === s.name))
          .map(s => {
            const obs = createObservation(s.category || 'dynamic', s.name, false);
            obs.comment = s.reason || '';
            obs.source = 'ai';
            return obs;
          });
        if (newObs.length > 0) {
          setObservations(prev => [...prev, ...newObs]);
        } else {
          alert('新しい提案はありません（すべて既に追加済みです）');
        }
      } else {
        alert('AI提案エラー: ' + (result.error || '不明なエラー'));
      }
    } catch (err) {
      alert('AI提案エラー: ' + err.message);
    } finally {
      setAiObsLoading(false);
    }
  };

  const handleAISuggestTests = async () => {
    if (observations.length === 0) {
      alert('先に観察所見を追加してください。');
      return;
    }
    setAiTestLoading(true);
    try {
      const obsNames = observations.map(o => o.name);
      const result = await suggestTestsFromObservations(obsNames);
      if (result.success && result.data.suggestions) {
        const newTests = result.data.suggestions
          .filter(s => !tests.some(t => t.name === s.name))
          .map(s => {
            const test = createTest(s.category || 'mobility', s.name, false);
            test.comment = s.reason || '';
            test.source = 'ai';
            // Auto-link to observation if for_observation matches
            if (s.for_observation) {
              const linkedObs = observations.find(o => o.name === s.for_observation);
              if (linkedObs) test.linkedObservationIds = [linkedObs.id];
            }
            return test;
          });
        if (newTests.length > 0) {
          setTests(prev => [...prev, ...newTests]);
        } else {
          alert('新しい提案はありません');
        }
      } else {
        alert('AI提案エラー: ' + (result.error || '不明なエラー'));
      }
    } catch (err) {
      alert('AI提案エラー: ' + err.message);
    } finally {
      setAiTestLoading(false);
    }
  };

  const handleAISuggestEvaluations = async () => {
    if (observations.length === 0 && tests.length === 0) {
      alert('先に観察所見やテスト結果を追加してください。');
      return;
    }
    setAiEvalLoading(true);
    try {
      const obsNames = observations.map(o => o.name);
      const testResults = tests.map(t => ({ name: t.name, result: t.result || '', score: t.score || '' }));
      const result = await suggestEvaluationsFromFindings(obsNames, testResults);
      if (result.success && result.data.suggestions) {
        const newEvals = result.data.suggestions
          .filter(s => !evaluations.some(e => e.title === s.title))
          .map(s => {
            const ev = createEvaluation(s.category || 'structure_mobility');
            ev.title = s.title;
            ev.interpretation = s.interpretation || '';
            ev.type = s.type || 'primary_factor';
            ev.priority = s.priority === 'high' ? 'high' : s.priority === 'low' ? 'low' : 'medium';
            ev.source = 'ai';
            // Auto-link observations and tests
            if (s.linked_observations) {
              ev.linkedObservationIds = s.linked_observations
                .map(name => observations.find(o => o.name === name)?.id)
                .filter(Boolean);
            }
            if (s.linked_tests) {
              ev.linkedTestIds = s.linked_tests
                .map(name => tests.find(t => t.name === name)?.id)
                .filter(Boolean);
            }
            return ev;
          });
        if (newEvals.length > 0) {
          setEvaluations(prev => [...prev, ...newEvals]);
        } else {
          alert('新しい提案はありません');
        }
      } else {
        alert('AI提案エラー: ' + (result.error || '不明なエラー'));
      }
    } catch (err) {
      alert('AI提案エラー: ' + err.message);
    } finally {
      setAiEvalLoading(false);
    }
  };

  // ─── CRUD handlers ───
  const addObservation = useCallback((obs) => setObservations(prev => [...prev, obs]), []);
  const updateObservation = useCallback((id, updates) => setObservations(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o)), []);
  const removeObservation = useCallback((id) => {
    setObservations(prev => prev.filter(o => o.id !== id));
    setTests(prev => prev.map(t => ({ ...t, linkedObservationIds: (t.linkedObservationIds || []).filter(oid => oid !== id) })));
    setEvaluations(prev => prev.map(e => ({ ...e, linkedObservationIds: (e.linkedObservationIds || []).filter(oid => oid !== id) })));
  }, []);

  const addTest = useCallback((test) => setTests(prev => [...prev, test]), []);
  const updateTest = useCallback((id, updates) => setTests(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t)), []);
  const removeTest = useCallback((id) => {
    setTests(prev => prev.filter(t => t.id !== id));
    setEvaluations(prev => prev.map(e => ({ ...e, linkedTestIds: (e.linkedTestIds || []).filter(tid => tid !== id) })));
  }, []);

  const addEvaluation = useCallback((evalItem) => setEvaluations(prev => [...prev, evalItem]), []);
  const updateEvaluation = useCallback((id, updates) => setEvaluations(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e)), []);
  const removeEvaluation = useCallback((id) => setEvaluations(prev => prev.filter(e => e.id !== id)), []);

  // ─── Selection & highlighting ───
  const handleSelect = useCallback((id, type) => {
    if (selectedId === id) { setSelectedId(null); setSelectedType(null); }
    else { setSelectedId(id); setSelectedType(type); }
  }, [selectedId]);

  const getHighlightedIds = useCallback(() => {
    if (!selectedId || !selectedType) return [];
    const ids = [selectedId];
    if (selectedType === 'observation') {
      tests.forEach(t => { if ((t.linkedObservationIds || []).includes(selectedId)) ids.push(t.id); });
      evaluations.forEach(e => { if ((e.linkedObservationIds || []).includes(selectedId)) ids.push(e.id); });
    } else if (selectedType === 'test') {
      const test = tests.find(t => t.id === selectedId);
      if (test) (test.linkedObservationIds || []).forEach(id => ids.push(id));
      evaluations.forEach(e => { if ((e.linkedTestIds || []).includes(selectedId)) ids.push(e.id); });
    } else if (selectedType === 'evaluation') {
      const ev = evaluations.find(e => e.id === selectedId);
      if (ev) { (ev.linkedObservationIds || []).forEach(id => ids.push(id)); (ev.linkedTestIds || []).forEach(id => ids.push(id)); }
    }
    return ids;
  }, [selectedId, selectedType, tests, evaluations]);

  const highlightedIds = getHighlightedIds();
  const handleRequestTest = useCallback((obs) => { setPendingTestRequest(obs); setMobileTab('test'); }, []);

  // ─── Send to hypothesis ───
  const handleSendToHypothesis = async () => {
    const selectedEvals = evaluations.filter(e => e.sendToHypothesis);
    if (selectedEvals.length === 0) {
      alert('仮説へ送る評価カードを選択してください');
      return;
    }
    await handleSave();
    navigate(`/sessions/${sessionId}/hypothesis`, {
      state: {
        fromEvaluations: selectedEvals.map(e => ({
          title: e.title,
          interpretation: e.interpretation,
          category: e.category,
          type: e.type,
          priority: e.priority,
          linkedObservations: (e.linkedObservationIds || []).map(id => observations.find(o => o.id === id)?.name).filter(Boolean),
          linkedTests: (e.linkedTestIds || []).map(id => tests.find(t => t.id === id)?.name).filter(Boolean),
          nextCheck: e.nextCheck,
        })),
      },
    });
  };

  const getRelationData = () => {
    const relations = [];
    tests.forEach(test => {
      (test.linkedObservationIds || []).forEach(obsId => {
        const obs = observations.find(o => o.id === obsId);
        if (obs) relations.push({ from: obs.name, fromType: 'obs', to: test.name, toType: 'test' });
      });
    });
    evaluations.forEach(ev => {
      (ev.linkedObservationIds || []).forEach(obsId => {
        const obs = observations.find(o => o.id === obsId);
        if (obs) relations.push({ from: obs.name, fromType: 'obs', to: ev.title, toType: 'eval' });
      });
      (ev.linkedTestIds || []).forEach(testId => {
        const test = tests.find(t => t.id === testId);
        if (test) relations.push({ from: test.name, fromType: 'test', to: ev.title, toType: 'eval' });
      });
    });
    return relations;
  };

  const getExportData = () => {
    const selectedEvals = evaluations.filter(e => e.sendToHypothesis);
    const primaryFactors = selectedEvals.filter(e => e.type === 'primary_factor');
    const modifyingFactors = selectedEvals.filter(e => e.type === 'modifying_factor');
    const resultingFindings = selectedEvals.filter(e => e.type === 'resulting_finding');
    const allLinkedObsIds = [...new Set(selectedEvals.flatMap(e => e.linkedObservationIds || []))];
    const relatedObs = allLinkedObsIds.map(id => observations.find(o => o.id === id)).filter(Boolean);
    return { selectedEvals, primaryFactors, modifyingFactors, resultingFindings, relatedObs };
  };

  if (loading) {
    return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>読み込み中...</div>;
  }

  const selectedCount = evaluations.filter(e => e.sendToHypothesis).length;

  return (
    <div className="ote-page">
      <div className="ote-header">
        <div className="ote-header-left">
          <Link to={`/clients/${client?.id}`} className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-sm)' }}>← 戻る</Link>
          <h1 className="page-title">観察・テスト・評価</h1>
          <p className="page-subtitle">
            {client?.name} ・ 第{session?.session_number}回セッション (
            <input
              type="date"
              className="form-input"
              value={session?.date || ''}
              onChange={async (e) => {
                const newDate = e.target.value;
                try {
                  await db.updateSession(sessionId, { date: newDate });
                  setSession(prev => ({ ...prev, date: newDate }));
                } catch (err) {
                  alert('日付の更新に失敗: ' + err.message);
                }
              }}
              style={{ width: 140, fontSize: 'var(--font-size-xs)', padding: '2px 6px', display: 'inline', border: '1px solid transparent', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'inherit', cursor: 'pointer' }}
              onFocus={e => e.target.style.border = '1px solid var(--color-accent)'}
              onBlur={e => e.target.style.border = '1px solid transparent'}
            />)
          </p>
        </div>
        <div className="ote-header-actions">
          <Link to={`/sessions/${sessionId}/ai-draft`} className="btn btn-ghost btn-sm">📝 AI下書き入力</Link>
          <button className="btn btn-ghost btn-sm" onClick={handleLoadDemo}>デモデータ</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowRelationView(!showRelationView)}>
            {showRelationView ? '関係ビュー ▲' : '関係ビュー ▼'}
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </button>
          <Link to={`/sessions/${sessionId}/hypothesis`} className="btn btn-secondary">仮説へ →</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="ote-stats">
        <div className="ote-stat ote-stat--obs"><IconSearch s={16} /><span className="ote-stat-count">{observations.length}</span><span className="ote-stat-label">観察所見</span></div>
        <div className="ote-stat ote-stat--test"><IconFlask s={16} /><span className="ote-stat-count">{tests.length}</span><span className="ote-stat-label">テスト</span></div>
        <div className="ote-stat ote-stat--eval"><IconPuzzle s={16} /><span className="ote-stat-count">{evaluations.length}</span><span className="ote-stat-label">評価解釈</span></div>
        <div className="ote-stat ote-stat--link"><IconLinkSvg s={16} /><span className="ote-stat-count">{getRelationData().length}</span><span className="ote-stat-label">関係リンク</span></div>
      </div>

      {/* Mobile tabs */}
      <div className="ote-mobile-tabs">
        <button className={`ote-mobile-tab ${mobileTab === 'observation' ? 'active' : ''}`} onClick={() => setMobileTab('observation')}>観察 ({observations.length})</button>
        <button className={`ote-mobile-tab ${mobileTab === 'test' ? 'active' : ''}`} onClick={() => setMobileTab('test')}>テスト ({tests.length})</button>
        <button className={`ote-mobile-tab ${mobileTab === 'eval' ? 'active' : ''}`} onClick={() => setMobileTab('eval')}>評価 ({evaluations.length})</button>
      </div>

      {/* 3-column layout */}
      <div className="ote-columns">
        <div className={`ote-column ote-column--obs ${mobileTab === 'observation' ? 'mobile-active' : ''}`}>
          <ObservationPanel
            observations={observations} onAdd={addObservation} onUpdate={updateObservation} onRemove={removeObservation}
            onRequestTest={handleRequestTest} highlightedIds={highlightedIds} onSelect={handleSelect}
            onAISuggest={handleAISuggestObservations} aiLoading={aiObsLoading}
          />
          {/* KB: 観察→テスト提案 */}
          {observations.length > 0 && (
            <KBSuggestionPanel
              queryText={observations.map(o => o.name).join('、')}
              linkType="observation_to_test"
              context={{ body_region: intake?.chief_complaint }}
              onAdopt={(s) => {
                const t = createTest(s.item.movement_theme || 'custom', s.item.title, false);
                t.comment = s.item.content || '';
                t.source = 'kb';
                addTest(t);
              }}
            />
          )}
        </div>
        <div className={`ote-column ote-column--test ${mobileTab === 'test' ? 'mobile-active' : ''}`}>
          <TestPanel
            tests={tests} observations={observations} onAdd={addTest} onUpdate={updateTest} onRemove={removeTest}
            highlightedIds={highlightedIds} onSelect={handleSelect}
            pendingTestRequest={pendingTestRequest} onClearTestRequest={() => setPendingTestRequest(null)}
            onAISuggest={handleAISuggestTests} aiLoading={aiTestLoading}
          />
          {/* KB: テスト→評価提案 */}
          {tests.length > 0 && (
            <KBSuggestionPanel
              queryText={tests.map(t => t.name).join('、')}
              linkType="test_to_evaluation"
              context={{ body_region: intake?.chief_complaint }}
              onAdopt={(s) => {
                const e = createEvaluation(s.item.body_region ? 'structure_mobility' : 'motor_control');
                e.title = s.item.title;
                e.interpretation = s.item.content || '';
                e.source = 'kb';
                addEvaluation(e);
              }}
            />
          )}
        </div>
        <div className={`ote-column ote-column--eval ${mobileTab === 'eval' ? 'mobile-active' : ''}`}>
          <EvaluationPanel
            evaluations={evaluations} observations={observations} tests={tests}
            onAdd={addEvaluation} onUpdate={updateEvaluation} onRemove={removeEvaluation}
            highlightedIds={highlightedIds} onSelect={handleSelect} onSendToHypothesis={handleSendToHypothesis}
            onAISuggest={handleAISuggestEvaluations} aiLoading={aiEvalLoading}
          />
          {/* KB: 評価→介入提案 */}
          {evaluations.length > 0 && (
            <KBSuggestionPanel
              queryText={evaluations.map(e => e.title).filter(Boolean).join('、')}
              linkType="evaluation_to_intervention"
              context={{ body_region: intake?.chief_complaint }}
            />
          )}
        </div>
      </div>

      {/* Relation view */}
      {showRelationView && (
        <div className="ote-relation-view">
          <h3 className="ote-relation-title">関係ビュー</h3>
          {selectedId ? (
            <div className="ote-relation-content">
              {getRelationData()
                .filter(r => {
                  const selItem = (selectedType === 'observation' ? observations : selectedType === 'test' ? tests : evaluations).find(i => i.id === selectedId);
                  if (!selItem) return true;
                  const selName = selItem.name || selItem.title;
                  return r.from === selName || r.to === selName;
                })
                .map((rel, i) => (
                  <div key={i} className="ote-relation-line">
                    <span className={`ote-relation-node ote-relation-${rel.fromType}`}>
                      <span className={`ote-relation-dot ote-relation-dot--${rel.fromType}`}></span> {rel.from}
                    </span>
                    <span className="ote-relation-arrow">→</span>
                    <span className={`ote-relation-node ote-relation-${rel.toType}`}>
                      <span className={`ote-relation-dot ote-relation-dot--${rel.toType}`}></span> {rel.to}
                    </span>
                  </div>
                ))}
              {getRelationData().filter(r => {
                const selItem = (selectedType === 'observation' ? observations : selectedType === 'test' ? tests : evaluations).find(i => i.id === selectedId);
                if (!selItem) return false;
                const selName = selItem.name || selItem.title;
                return r.from === selName || r.to === selName;
              }).length === 0 && (
                <div className="ote-relation-empty">このアイテムにはリンクがありません</div>
              )}
            </div>
          ) : (
            <div className="ote-relation-hint">観察・テスト・評価をクリックすると関係が表示されます</div>
          )}
        </div>
      )}

      {/* Free note */}
      <div className="ote-free-note">
        <div className="ote-free-note-header">自由メモ</div>
        <textarea className="form-textarea" rows={3} placeholder="セッション中の気づき、特記事項などを自由に記録..." value={freeNote} onChange={e => setFreeNote(e.target.value)} />
      </div>

      {/* Export section */}
      <div className="ote-export-section">
        <button className="ote-export-toggle" onClick={() => setShowExportPanel(!showExportPanel)}>
          問題リストへ送る（{selectedCount}件選択中）
          <span className={`ote-chevron-wrap ${showExportPanel ? 'open' : ''}`}>▾</span>
        </button>

        {showExportPanel && (() => {
          const data = getExportData();
          return (
            <div className="ote-export-panel">
              {data.selectedEvals.length === 0 ? (
                <div className="ote-export-empty">評価カードの「仮説へ送る」ボタンで送る評価を選択してください</div>
              ) : (
                <>
                  {data.primaryFactors.length > 0 && (
                    <div className="ote-export-group">
                      <h4 className="ote-export-group-title" style={{ color: '#c0392b' }}>主要因候補</h4>
                      {data.primaryFactors.map(e => <div key={e.id} className="ote-export-item ote-export-item--primary">{e.title}</div>)}
                    </div>
                  )}
                  {data.modifyingFactors.length > 0 && (
                    <div className="ote-export-group">
                      <h4 className="ote-export-group-title" style={{ color: '#b8860b' }}>修飾因子候補</h4>
                      {data.modifyingFactors.map(e => <div key={e.id} className="ote-export-item ote-export-item--modifier">{e.title}</div>)}
                    </div>
                  )}
                  {data.resultingFindings.length > 0 && (
                    <div className="ote-export-group">
                      <h4 className="ote-export-group-title" style={{ color: '#555e6e' }}>結果として見えている所見</h4>
                      {data.resultingFindings.map(e => <div key={e.id} className="ote-export-item ote-export-item--result">{e.title}</div>)}
                    </div>
                  )}
                  {data.relatedObs.length > 0 && (
                    <div className="ote-export-group">
                      <h4 className="ote-export-group-title" style={{ color: '#4a6fa5' }}>関連所見</h4>
                      {data.relatedObs.map(o => <div key={o.id} className="ote-export-item ote-export-item--obs">{o.name}</div>)}
                    </div>
                  )}
                  <button className="btn btn-primary" style={{ marginTop: 'var(--space-md)', width: '100%' }} onClick={handleSendToHypothesis}>
                    問題リスト（仮説画面）へ送る →
                  </button>
                </>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
