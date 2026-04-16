import { useState } from 'react';
import { collectSessionData, generateJSON, downloadJSON, openPrintPDF } from '../services/exportService';
import { promptF_ClientSummary } from '../services/aiService';

const EXPORT_TYPES = [
  { value: 'detail', label: '詳細版', desc: '内部記録用 — 全項目を含む完全な記録', icon: '📋' },
  { value: 'client', label: 'クライアント共有版', desc: '平易な説明でクライアントに共有', icon: '💬' },
  { value: 'review', label: 'ケースレビュー版', desc: '教育・レビュー用の要約', icon: '📝' },
];

const FORMAT_OPTIONS = [
  { value: 'pdf', label: 'PDF', desc: '印刷・共有用' },
  { value: 'json', label: 'JSON', desc: 'バックアップ・連携用' },
];

export default function ExportModal({ sessionId, clientName, sessionNumber, onClose }) {
  const [exportType, setExportType] = useState('detail');
  const [format, setFormat] = useState('pdf');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await collectSessionData(sessionId);

      if (format === 'json') {
        const json = generateJSON(data, clientName);
        const filename = `session_${clientName}_${sessionNumber}_${new Date().toISOString().split('T')[0]}.json`;
        downloadJSON(json, filename);
        onClose();
      } else {
        // PDF
        let clientSummary = null;
        if (exportType === 'client') {
          // Generate client-friendly summary via AI
          try {
            const json = generateJSON(data, clientName);
            const result = await promptF_ClientSummary(json);
            if (result.success) clientSummary = result.data;
          } catch (aiErr) {
            console.warn('AI要約生成失敗、デフォルトテンプレートで出力:', aiErr);
          }
        }
        openPrintPDF(data, exportType, clientSummary);
        // Delay close for mobile fallback download to complete
        setTimeout(() => onClose(), 300);
      }
    } catch (err) {
      setError('エクスポートに失敗しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="export-modal-overlay" onClick={onClose}>
      <div className="export-modal" onClick={e => e.stopPropagation()}>
        <div className="export-modal-header">
          <h2 className="export-modal-title">セッション記録エクスポート</h2>
          <button className="export-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="export-modal-body">
          {/* Export type */}
          <div className="export-section">
            <div className="export-section-title">出力種別</div>
            <div className="export-type-grid">
              {EXPORT_TYPES.map(t => (
                <button
                  key={t.value}
                  className={`export-type-card ${exportType === t.value ? 'active' : ''}`}
                  onClick={() => setExportType(t.value)}
                >
                  <div className="export-type-icon">{t.icon}</div>
                  <div className="export-type-label">{t.label}</div>
                  <div className="export-type-desc">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div className="export-section">
            <div className="export-section-title">出力形式</div>
            <div className="export-format-grid">
              {FORMAT_OPTIONS.map(f => (
                <button
                  key={f.value}
                  className={`export-format-card ${format === f.value ? 'active' : ''}`}
                  onClick={() => setFormat(f.value)}
                >
                  <div className="export-format-label">{f.label}</div>
                  <div className="export-format-desc">{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {exportType === 'client' && format === 'pdf' && (
            <div className="ai-disclaimer" style={{ marginTop: 'var(--space-sm)' }}>
              ⚠ クライアント共有版はAIで平易な文章に変換します。内容を必ず確認してください。
            </div>
          )}

          {error && <div style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-sm)' }}>{error}</div>}
        </div>

        <div className="export-modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" onClick={handleExport} disabled={loading}>
            {loading ? '生成中...' : 'エクスポート'}
          </button>
        </div>
      </div>
    </div>
  );
}
