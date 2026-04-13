import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import http from '../api/http';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [mfaCode, setMfaCode] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await http.post('/auth/login', form);
      if (response.data.mfaRequired) {
        setMfaRequired(true);
        setChallengeToken(response.data.challengeToken);
        setError(response.data.message || 'Multi-factor authentication required');
        return;
      }

      login(response.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to login. Check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyMfa = async () => {
    setSubmitting(true);
    setError('');

    try {
      const response = await http.post('/auth/login/mfa', { challengeToken, code: mfaCode });
      login(response.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to verify MFA code');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Welcome Back" subtitle="Sign in to your clearance operations workspace">
      <section className="card auth-card">
        <h2>Sign In</h2>
        <p>Enter your institutional credentials to continue.</p>
        
        {error && (
          <div className="error-message">
            <strong>Sign-in failed</strong> {error}
          </div>
        )}

        <form onSubmit={mfaRequired ? (event) => { event.preventDefault(); verifyMfa(); } : onSubmit} className="form-grid">
          <label className="field">
            <span>Institution Email</span>
            <input
              type="email"
              placeholder="your.email@school.edu"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              required
              disabled={submitting}
              aria-label="Email address"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              required
              disabled={submitting}
              aria-label="Password"
            />
          </label>

          {mfaRequired && (
            <label className="field">
              <span>MFA Code</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="6-digit code"
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                required
                disabled={submitting}
                aria-label="Multi-factor authentication code"
              />
            </label>
          )}

          <button className="btn" type="submit" disabled={submitting} aria-busy={submitting}>
            {submitting ? 'Signing in...' : mfaRequired ? 'Verify & Access Workspace' : 'Access Workspace'}
          </button>
        </form>

        <p>
          Don't have an account? <Link to="/register">Create one now</Link>
        </p>
        <p>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
      </section>
    </AppShell>
  );
};

export default LoginPage;
