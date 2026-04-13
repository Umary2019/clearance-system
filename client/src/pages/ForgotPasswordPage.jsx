import { useState } from 'react';
import { Link } from 'react-router-dom';
import http from '../api/http';
import AppShell from '../components/AppShell';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setResetToken('');

    try {
      const response = await http.post('/auth/forgot-password', { email });
      setMessage(response.data.message || 'Reset token generated.');
      setResetToken(response.data.resetToken || '');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to generate reset token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Recover Account" subtitle="Generate a password reset token for your workspace">
      <section className="card auth-card">
        <h2>Forgot Password</h2>
        <p>Enter your institutional email to generate a reset token.</p>

        <form className="form-grid" onSubmit={onSubmit}>
          <label className="field">
            <span>Email Address</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Generating...' : 'Generate Reset Token'}
          </button>
        </form>

        {message && <p className="message">{message}</p>}

        {resetToken && (
          <div className="card" style={{ marginTop: '1rem' }}>
            <p><strong>Reset Token:</strong></p>
            <p style={{ wordBreak: 'break-all' }}>{resetToken}</p>
            <p>
              Use it on the <Link to={`/reset-password/${resetToken}`}>reset password page</Link>.
            </p>
          </div>
        )}

        <p>
          Back to <Link to="/login">sign in</Link>
        </p>
      </section>
    </AppShell>
  );
};

export default ForgotPasswordPage;