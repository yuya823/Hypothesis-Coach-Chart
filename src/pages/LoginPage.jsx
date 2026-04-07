import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../App';

export default function LoginPage() {
  const { user, login, signup } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          setError('名前を入力してください');
          setSubmitting(false);
          return;
        }
        const result = await signup(email, password, name);
        if (!result.success) {
          setError(result.error);
        } else {
          setSuccess('登録完了しました。メールを確認してください。');
        }
      } else {
        const result = await login(email, password);
        if (!result.success) {
          setError(result.error === 'Invalid login credentials'
            ? 'メールアドレスまたはパスワードが正しくありません'
            : result.error
          );
        }
      }
    } catch (err) {
      setError('予期せぬエラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card fade-in">
        <div className="login-brand">
          <div className="login-brand-icon">H</div>
          <h1>Hypothesis Session Tool</h1>
          <p>仮説思考支援セッションツール</p>
        </div>

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="form-group">
              <label className="form-label">名前</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 田中 健太"
                required={isSignUp}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">メールアドレス</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">パスワード</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6文字以上"
              minLength={6}
              required
            />
          </div>

          {error && (
            <div style={{
              color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)',
              marginBottom: 'var(--space-md)', padding: '8px 12px',
              background: 'rgba(192, 57, 43, 0.06)', borderRadius: 'var(--radius-sm)',
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              color: 'var(--color-success)', fontSize: 'var(--font-size-sm)',
              marginBottom: 'var(--space-md)', padding: '8px 12px',
              background: 'rgba(58, 138, 106, 0.06)', borderRadius: 'var(--radius-sm)',
            }}>
              {success}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={submitting}
          >
            {submitting ? '処理中...' : isSignUp ? '新規登録' : 'ログイン'}
          </button>

          <div style={{
            textAlign: 'center', marginTop: 'var(--space-lg)',
            fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)',
          }}>
            {isSignUp ? (
              <>
                既にアカウントをお持ちですか？{' '}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setError(''); setSuccess(''); }}
                  style={{
                    background: 'none', border: 'none', color: 'var(--color-accent)',
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit',
                    textDecoration: 'underline',
                  }}
                >
                  ログイン
                </button>
              </>
            ) : (
              <>
                アカウントをお持ちでないですか？{' '}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setError(''); setSuccess(''); }}
                  style={{
                    background: 'none', border: 'none', color: 'var(--color-accent)',
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit',
                    textDecoration: 'underline',
                  }}
                >
                  新規登録
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
