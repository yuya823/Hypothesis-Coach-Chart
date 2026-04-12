/**
 * Export Service — PDF / JSON エクスポート
 */
import * as db from '../lib/database';

// ─── Collect all session data ───
export async function collectSessionData(sessionId) {
  const session = await db.getSessionById(sessionId);
  const client = await db.getClientById(session.client_id);
  let intake = null;
  try { intake = await db.getIntakeByClientId(session.client_id); } catch {}
  const hypotheses = await db.getHypothesesBySessionId(sessionId);
  const interventions = await db.getInterventionsBySessionId(sessionId);

  const obsData = session.observations || {};
  const observations = obsData.observations || [];
  const tests = obsData.tests || [];
  const evaluations = obsData.evaluations || [];

  return { session, client, intake, hypotheses, interventions, observations, tests, evaluations };
}

// ─── JSON Export ───
export function generateJSON(data, exportedBy) {
  const { session, client, intake, hypotheses, interventions, observations, tests, evaluations } = data;

  const json = {
    export_version: '1.0',
    exported_at: new Date().toISOString(),
    exported_by: exportedBy,
    client: {
      name: client.name,
      age: client.age,
      gender: client.gender,
    },
    session: {
      id: session.id,
      number: session.session_number,
      type: session.session_type,
      date: session.date,
      status: session.status,
    },
    intake_summary: intake ? {
      chief_complaint: intake.chief_complaint,
      goal: intake.goal,
      concerns: intake.concerns,
    } : null,
    observations: observations.map(o => ({
      category: o.category, name: o.name, severity: o.severity,
      laterality: o.laterality, comment: o.comment, source: o.source || 'manual',
    })),
    tests: tests.map(t => ({
      category: t.category, name: t.name, result: t.result,
      score: t.score, comment: t.comment,
      linked_observations: (t.linkedObservationIds || []).map(id => observations.find(o => o.id === id)?.name).filter(Boolean),
    })),
    evaluations: evaluations.map(e => ({
      category: e.category, title: e.title, interpretation: e.interpretation,
      type: e.type, priority: e.priority,
      linked_observations: (e.linkedObservationIds || []).map(id => observations.find(o => o.id === id)?.name).filter(Boolean),
      linked_tests: (e.linkedTestIds || []).map(id => tests.find(t => t.id === id)?.name).filter(Boolean),
    })),
    hypotheses: hypotheses.map(h => ({
      category: h.category, description: h.description, status: h.status,
      source: h.source, rationale: h.rationale, priority: h.priority,
    })),
    interventions: interventions.map(iv => ({
      name: iv.name, intent: iv.intent,
      reaction: iv.immediate_reaction,
      reevaluation_results: iv.reevaluation_results || {},
      source: iv.source,
    })),
    next_plan: session.next_plan || '',
    homework: session.homework || '',
    homework_intent: session.homework_intent || '',
    free_note: session.free_note || '',
  };

  return json;
}

export function downloadJSON(json, filename) {
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF Export (print-based) ───

const SEVERITY_LABELS = { mild: '軽度', moderate: '中等度', severe: '重度' };
const LATERALITY_LABELS = { left: '左', right: '右', both: '両側' };
const RESULT_LABELS = { positive: '陽性', negative: '陰性', partial: '部分的' };
const STATUS_LABELS = { adopted: '採用', pending: '保留', excluded: '除外' };
const REACTION_LABELS = { improved: '改善', slightly_improved: 'やや改善', unchanged: '変化なし', slightly_worse: 'やや悪化', worse: '悪化' };

export function openPrintPDF(data, type = 'detail', clientSummary = null) {
  const { session, client, intake, hypotheses, interventions, observations, tests, evaluations } = data;

  let html = '';

  if (type === 'detail') {
    html = buildDetailHTML(data);
  } else if (type === 'client') {
    html = buildClientHTML(data, clientSummary);
  } else if (type === 'review') {
    html = buildReviewHTML(data);
  }

  // Try window.open first (works on desktop)
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      try { printWindow.print(); } catch (e) { /* User can print manually */ }
    }, 500);
    return;
  }

  // Fallback for mobile: download as HTML file
  // User can open the downloaded file and print/share from there
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  const typeLabel = type === 'detail' ? '詳細' : type === 'client' ? '共有' : 'レビュー';
  a.download = `${client.name}_第${session.session_number}回_${typeLabel}_${dateStr}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildDetailHTML(data) {
  const { session, client, intake, hypotheses, interventions, observations, tests, evaluations } = data;
  const adoptedH = hypotheses.filter(h => h.status === 'adopted');
  const pendingH = hypotheses.filter(h => h.status === 'pending');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>セッション記録 — ${client.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif; color:#1a1a2e; line-height:1.7; padding:40px; max-width:800px; margin:0 auto; font-size:13px; }
  h1 { font-size:18px; margin-bottom:8px; color:#1a1a2e; border-bottom:2px solid #4a6fa5; padding-bottom:6px; }
  h2 { font-size:14px; font-weight:600; color:#4a6fa5; margin:20px 0 8px; border-left:3px solid #4a6fa5; padding-left:8px; }
  .meta { font-size:11px; color:#888; margin-bottom:4px; }
  .section { margin-bottom:16px; padding:12px; border:1px solid #e8e8e8; border-radius:6px; }
  .item { padding:4px 0; border-bottom:1px solid #f0f0f0; font-size:12px; }
  .item:last-child { border-bottom:none; }
  .badge { display:inline-block; padding:1px 6px; border-radius:3px; font-size:10px; font-weight:600; margin-right:4px; }
  .badge-ai { background:#e8eef6; color:#4a6fa5; }
  .badge-manual { background:#f0f0f0; color:#666; }
  .badge-adopted { background:#e8f5e9; color:#3a8a6a; }
  .badge-pending { background:#fff8e1; color:#b8860b; }
  .badge-excluded { background:#f5f5f5; color:#999; }
  .footer { margin-top:30px; padding-top:12px; border-top:1px solid #e8e8e8; font-size:10px; color:#aaa; }
  @media print { body { padding:20px; } }
</style></head><body>
<h1>セッション記録</h1>
<div class="meta">${client.name} · ${client.age}歳 ${client.gender || ''} · 第${session.session_number}回 (${session.date}) · ${session.session_type === 'initial' ? '初回' : '継続'}</div>
<div class="meta">担当: ${session.trainer_id ? '—' : '—'} · 出力: ${new Date().toLocaleDateString('ja-JP')}</div>

${intake ? `<h2>主訴・目標</h2><div class="section">
  <div class="item"><strong>主訴:</strong> ${intake.chief_complaint || '—'}</div>
  <div class="item"><strong>目標:</strong> ${intake.goal || '—'}</div>
  ${intake.concerns ? `<div class="item"><strong>困りごと:</strong> ${intake.concerns}</div>` : ''}
</div>` : ''}

${observations.length > 0 ? `<h2>観察所見</h2><div class="section">
  ${observations.map(o => `<div class="item">
    <span class="badge ${o.source === 'ai' || o.source === 'ai_draft' ? 'badge-ai' : 'badge-manual'}">${o.source === 'ai' || o.source === 'ai_draft' ? 'AI' : '手動'}</span>
    ${o.name}${o.severity ? ` [${SEVERITY_LABELS[o.severity] || o.severity}]` : ''}${o.laterality && o.laterality !== 'none' ? ` [${LATERALITY_LABELS[o.laterality] || o.laterality}]` : ''}
    ${o.comment ? `<br><span style="color:#888;font-size:11px;margin-left:20px">${o.comment}</span>` : ''}
  </div>`).join('')}
</div>` : ''}

${tests.length > 0 ? `<h2>テスト結果</h2><div class="section">
  ${tests.map(t => `<div class="item">
    ${t.name}${t.result ? ` → ${RESULT_LABELS[t.result] || t.result}` : ''}${t.score ? ` (${t.score})` : ''}
    ${t.comment ? `<br><span style="color:#888;font-size:11px;margin-left:20px">${t.comment}</span>` : ''}
  </div>`).join('')}
</div>` : ''}

${evaluations.length > 0 ? `<h2>評価解釈</h2><div class="section">
  ${evaluations.map(e => `<div class="item">
    <strong>${e.title || '—'}</strong> ${e.type ? `[${e.type === 'primary_factor' ? '主要因候補' : e.type === 'modifying_factor' ? '修飾因子' : '結果所見'}]` : ''}
    ${e.interpretation ? `<br><span style="color:#555;margin-left:8px">${e.interpretation}</span>` : ''}
  </div>`).join('')}
</div>` : ''}

${hypotheses.length > 0 ? `<h2>仮説</h2><div class="section">
  ${hypotheses.map(h => `<div class="item">
    <span class="badge badge-${h.status}">${STATUS_LABELS[h.status] || h.status}</span>
    <span class="badge ${h.source === 'ai' ? 'badge-ai' : 'badge-manual'}">${h.source === 'ai' ? 'AI' : '手動'}</span>
    <strong>${h.category}</strong>: ${h.description.substring(0, 100)}
    ${h.rationale ? `<br><span style="color:#888;font-size:11px;margin-left:20px">根拠: ${h.rationale}</span>` : ''}
  </div>`).join('')}
</div>` : ''}

${interventions.length > 0 ? `<h2>介入</h2><div class="section">
  ${interventions.map(iv => {
    const reResults = typeof iv.reevaluation_results === 'string' ? JSON.parse(iv.reevaluation_results || '{}') : (iv.reevaluation_results || {});
    const reItems = typeof iv.reevaluation_items === 'string' ? JSON.parse(iv.reevaluation_items || '[]') : (iv.reevaluation_items || []);
    return `<div class="item">
      <strong>${iv.name}</strong>${iv.source === 'ai' ? ' <span class="badge badge-ai">AI</span>' : ''}
      ${iv.intent ? `<br><span style="color:#555">意図: ${iv.intent}</span>` : ''}
      ${iv.immediate_reaction ? `<br>反応: ${REACTION_LABELS[iv.immediate_reaction] || iv.immediate_reaction}` : ''}
      ${reItems.map((item, j) => {
        const r = reResults[`item_${j}`] || {};
        if (r.before && r.after) return `<br><span style="font-size:11px;color:#3a8a6a">再評価: ${item} Before:${r.before} → After:${r.after}</span>`;
        if (r.grade) return `<br><span style="font-size:11px;color:#3a8a6a">再評価: ${item} → ${r.grade}</span>`;
        if (r.finding) return `<br><span style="font-size:11px;color:#3a8a6a">再評価: ${item} → ${r.finding}</span>`;
        return '';
      }).join('')}
    </div>`;
  }).join('')}
</div>` : ''}

${session.homework ? `<h2>ホームワーク</h2><div class="section"><div class="item">${session.homework}</div>${session.homework_intent ? `<div class="item" style="color:#888">意図: ${session.homework_intent}</div>` : ''}</div>` : ''}
${session.next_plan ? `<h2>次回方針</h2><div class="section"><div class="item">${session.next_plan}</div></div>` : ''}

<div class="footer">Hypothesis Session Tool · 出力日: ${new Date().toLocaleString('ja-JP')} · ⚠ AI生成項目は[AI]マーク付き</div>
</body></html>`;
}

function buildClientHTML(data, summary) {
  const { session, client } = data;
  const s = summary || {};

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>セッションまとめ — ${client.name}さま</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif; color:#333; line-height:1.9; padding:40px; max-width:640px; margin:0 auto; font-size:14px; }
  h1 { font-size:20px; text-align:center; margin-bottom:6px; color:#1a1a2e; }
  .date { text-align:center; color:#888; font-size:12px; margin-bottom:24px; }
  h2 { font-size:14px; font-weight:600; color:#4a6fa5; margin:20px 0 8px; }
  .section { margin-bottom:16px; padding:14px 16px; background:#f8f9fc; border-radius:8px; }
  .hw-item { padding:6px 0; border-bottom:1px solid #e8e8e8; }
  .hw-item:last-child { border-bottom:none; }
  .hw-task { font-weight:500; }
  .hw-freq { color:#888; font-size:12px; }
  .msg { margin-top:24px; padding:16px; background:#e8f5e9; border-radius:8px; text-align:center; color:#3a8a6a; font-weight:500; }
  .footer { margin-top:30px; text-align:center; font-size:10px; color:#ccc; }
  @media print { body { padding:20px; } }
</style></head><body>
<h1>セッションまとめ</h1>
<div class="date">${client.name}さま · ${session.date} · 第${session.session_number}回</div>

<h2>■ 今日確認したこと</h2>
<div class="section">${s.today_checked || 'セッション内容を確認しました。'}</div>

<h2>■ 今日見つかったポイント</h2>
<div class="section">${s.today_findings || '—'}</div>

<h2>■ 今日行ったこと</h2>
<div class="section">${s.today_intervention || '—'}</div>

${s.changes ? `<h2>■ 変化したこと</h2><div class="section">${s.changes}</div>` : ''}

${s.homework && s.homework.length > 0 ? `<h2>■ お家でやっていただきたいこと</h2>
<div class="section">
  ${s.homework.map(h => `<div class="hw-item"><div class="hw-task">${h.task}</div><div class="hw-freq">${h.frequency || ''} ${h.purpose ? `— ${h.purpose}` : ''}</div></div>`).join('')}
</div>` : (data.session.homework ? `<h2>■ お家でやっていただきたいこと</h2><div class="section">${data.session.homework}</div>` : '')}

<h2>■ 次回確認すること</h2>
<div class="section">${s.next_check || data.session.next_plan || '次回のセッションで確認します。'}</div>

${s.encouragement ? `<div class="msg">${s.encouragement}</div>` : ''}

<div class="footer">Hypothesis Session Tool</div>
</body></html>`;
}

function buildReviewHTML(data) {
  const { session, client, observations, tests, evaluations, hypotheses, interventions } = data;
  const adopted = hypotheses.filter(h => h.status === 'adopted');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>ケースレビュー — ${client.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif; color:#1a1a2e; line-height:1.7; padding:40px; max-width:800px; margin:0 auto; font-size:13px; }
  h1 { font-size:16px; border-bottom:2px solid #4a6fa5; padding-bottom:4px; margin-bottom:16px; }
  h2 { font-size:13px; font-weight:600; color:#4a6fa5; margin:16px 0 6px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; }
  .box { padding:10px 12px; border:1px solid #e0e0e0; border-radius:6px; font-size:12px; }
  .item { padding:3px 0; font-size:12px; }
  .comment-area { margin-top:20px; border:1px solid #ccc; border-radius:6px; min-height:80px; padding:12px; font-size:12px; color:#888; }
  @media print { body { padding:20px; } .comment-area { min-height:100px; } }
</style></head><body>
<h1>ケースレビュー</h1>
<div style="font-size:11px;color:#888;margin-bottom:16px">${client.name} · ${client.age}歳 · 第${session.session_number}回 (${session.date})</div>

<div class="grid">
  <div><h2>主訴</h2><div class="box">${data.intake?.chief_complaint || client.latest_chief_complaint || '—'}</div></div>
  <div><h2>目標</h2><div class="box">${data.intake?.goal || client.latest_goal || '—'}</div></div>
</div>

<div class="grid">
  <div>
    <h2>観察</h2><div class="box">${observations.map(o => `<div class="item">▸ ${o.name}</div>`).join('') || '—'}</div>
    <h2>テスト</h2><div class="box">${tests.map(t => `<div class="item">▸ ${t.name} ${t.result ? `→ ${RESULT_LABELS[t.result] || t.result}` : ''}</div>`).join('') || '—'}</div>
  </div>
  <div>
    <h2>評価</h2><div class="box">${evaluations.map(e => `<div class="item">▸ ${e.title || '—'}</div>`).join('') || '—'}</div>
    <h2>採用仮説</h2><div class="box">${adopted.map(h => `<div class="item">▸ ${h.category}: ${h.description.substring(0, 60)}</div>`).join('') || '—'}</div>
  </div>
</div>

<h2>実施介入・再評価</h2>
<div class="box">${interventions.map(iv => `<div class="item"><strong>${iv.name}</strong> ${iv.immediate_reaction ? `→ ${REACTION_LABELS[iv.immediate_reaction] || iv.immediate_reaction}` : ''}</div>`).join('') || '—'}</div>

<h2>指導意図の要約</h2>
<div class="box">${interventions.map(iv => iv.intent).filter(Boolean).join('。') || '—'}</div>

<h2>コメント</h2>
<div class="comment-area">（レビューコメントを記入）</div>
</body></html>`;
}
