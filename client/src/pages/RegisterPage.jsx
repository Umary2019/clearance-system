import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import http from '../api/http';
import AppShell from '../components/AppShell';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await http.post('/auth/register', form);
      navigate('/login', { state: { message: 'Account created! Please sign in.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to register. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const roleDescriptions = {
    student: 'Submit clearance requests and track approvals',
    department: 'Review and approve department clearances',
    library: 'Manage library clearance requirements',
    hostel: 'Handle hostel check-out clearances',
    bursary: 'Process bursary/financial clearances',
    admin: 'Manage system settings and users',
  };

  return (
    <AppShell title="Create Your Account" subtitle="Register to access the institutional clearance platform">
      <section className="card auth-card">
        <h2>Register Account</h2>
        <p>Set up your account to begin or manage clearance workflows.</p>

        {error && (
          <div className="error-message">
            <strong>Registration failed</strong> {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="form-grid">
          <label className="field">
            <span>Full Name <span className="required"></span></span>
            <input
              type="text"
              placeholder="Your legal name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
              disabled={submitting}
              aria-label="Full name"
            />
          </label>

          <label className="field">
            <span>Email Address <span className="required"></span></span>
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
            <span>Password <span className="required"></span></span>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              minLength={6}
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              required
              disabled={submitting}
              aria-label="Password"
            />
          </label>

          <label className="field">
            <span>Select Your Role <span className="required"></span></span>
            <select
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
              disabled={submitting}
              aria-label="User role"
            >
              <option value="student">Student</option>
              <option value="department">Department Officer</option>
              <option value="library">Library Staff</option>
              <option value="hostel">Hostel Officer</option>
              <option value="bursary">Bursary Officer</option>
              <option value="admin">Administrator</option>
            </select>
            <small style={{ color: '#7a8d8e', marginTop: '0.35rem', display: 'block' }}>
              {roleDescriptions[form.role]}
            </small>
          </label>

          <button 
            className="btn" 
            type="submit" 
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p>
          Already registered? <Link to="/login">Sign in here</Link>
        </p>
      </section>
    </AppShell>
  );
};

export default RegisterPage;
