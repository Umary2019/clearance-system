import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import http from '../api/http';
import AppShell from '../components/AppShell';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await http.post(`/auth/reset-password/${token}`, { password });
      setMessage(response.data.message || 'Password reset successfully.');
      setPassword('');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Reset Password" subtitle="Create a new workspace password">
      <section className="card auth-card">
        <h2>Reset Password</h2>
        <p>Enter a new password for your account.</p>

        <form className="form-grid" onSubmit={onSubmit}>
          <label className="field">
            <span>New Password</span>
            <input type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Reset Password'}
          </button>
        </form>

        {message && <p className="message">{message}</p>}

        <p>
          Return to <Link to="/login">sign in</Link>
        </p>
      </section>
    </AppShell>
  );
};

export default ResetPasswordPage;