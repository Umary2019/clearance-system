import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AppShell = ({ title, subtitle = '', children, layout = 'default' }) => {
  const { user, logout } = useAuth();

  const roleLabel = user?.role ? user.role.replace(/^./, (char) => char.toUpperCase()) : '';

  if (layout === 'dashboard' && user) {
    return (
      <div className="surface-bg">
        <div className="shape shape-a" />
        <div className="shape shape-b" />
        <div className="shape shape-c" />

        <div className="app-bg app-shell-dashboard">
          <aside className="dashboard-sidebar card">
            <div className="sidebar-brand">
              <p className="kicker">Higher Institution Workflow Suite</p>
              <h2>{title}</h2>
              {subtitle && <p className="subtitle sidebar-subtitle">{subtitle}</p>}
            </div>

            <nav className="sidebar-nav" aria-label="Dashboard navigation">
              <Link to="/dashboard" className="sidebar-link active">Overview</Link>
              <Link to="/dashboard" className="sidebar-link">Requests</Link>
              <Link to="/dashboard" className="sidebar-link">Approvals</Link>
              <Link to="/dashboard" className="sidebar-link">Reports</Link>
              <Link to="/dashboard" className="sidebar-link">Settings</Link>
            </nav>
          </aside>

          <div className="dashboard-main">
            <header className="dashboard-topbar card">
              <div className="topbar-search">
                <input type="search" placeholder="Search requests, users, reports..." aria-label="Search dashboard" />
              </div>

              <div className="dashboard-topbar-actions">
                <button type="button" className="btn ghost small">Quick Actions</button>
                {user && (
                  <span className="identity-tag">
                    <strong>{user.name}</strong>
                    <small>{roleLabel}</small>
                  </span>
                )}
                <button type="button" className="btn ghost" onClick={logout}>Logout</button>
              </div>
            </header>

            <main>{children}</main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-bg">
      <div className="shape shape-a" />
      <div className="shape shape-b" />
      <div className="shape shape-c" />

      <div className="app-bg">
        <header className="topbar card">
          <div>
            <p className="kicker">Higher Institution Workflow Suite</p>
            <h1>{title}</h1>
            {subtitle && <p className="subtitle">{subtitle}</p>}
          </div>

          <div className="topbar-right">
            <nav className="nav-links" aria-label="Primary">
              <Link to="/">Home</Link>
              {!user && <Link to="/register">Create Account</Link>}
              {!user && <Link to="/login">Sign In</Link>}
              {user && <Link to="/dashboard">Workspace</Link>}
            </nav>

            {user && (
              <>
                <span className="identity-tag">
                  <strong>{user.name}</strong>
                  <small>{roleLabel}</small>
                </span>
                <button type="button" className="btn ghost" onClick={logout}>
                  Logout
                </button>
              </>
            )}
          </div>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
