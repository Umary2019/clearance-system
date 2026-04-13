import { Link, Navigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AppShell title="Campus Clearance Operations" subtitle="A structured digital workflow for student, department, and administrative clearance">
      {/* Premium Hero Section */}
      <section className="hero-premium card">
        <div className="hero-content">
          <span className="chip">Enterprise-Ready Workflow</span>
          <h2 className="hero-headline">Replace fragmented paper processes with transparent digital operations.</h2>
          
          <p className="hero-description">
            Students open one request. All departments review in parallel queues. Every decision is tracked, visible, and exportable through a verified final clearance document.
          </p>

          <div className="hero-cta">
            <Link to="/register" className="btn btn-primary">
              <span>Create Your Account</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Sign In
            </Link>
          </div>
        </div>

        <aside className="hero-stats">
          <div className="stat-item">
            <div className="stat-number">100%</div>
            <div className="stat-label">Audit Trail</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">80%</div>
            <div className="stat-label">Time Saved</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">∞</div>
            <div className="stat-label">Scalable</div>
          </div>
        </aside>
      </section>

      {/* Social Proof Section */}
      <section className="proof-section">
        <div className="proof-card card">
          <p className="proof-text">
            "Clearance requests that used to take 3 weeks now process in 4 days. Department staff see their workload decrease by 60%."
          </p>
          <div className="proof-author">
            <strong>Dean of Student Affairs</strong>
            <small>Higher Education Institution</small>
          </div>
        </div>
      </section>

      {/* Feature Grid - 3 Column with Enhanced Design */}
      <section className="features-showcase">
        <h3 className="section-title">Core Capabilities</h3>
        <div className="three-col grid">
          <article className="feature-card card feature-card--primary">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <h4>Student Self-Service</h4>
            <p>Submit clearance requests, track real-time progress, and download your official verification slip instantly.</p>
            <ul className="feature-list-compact">
              <li>One-click request submission</li>
              <li>Live approval tracking</li>
              <li>Instant PDF generation</li>
            </ul>
          </article>

          <article className="feature-card card feature-card--accent">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11H3v2h6v-2zm0-4H3v2h6V7zm6 0v2h6V7h-6zm0 4v2h6v-2h-6zM9 3H3v2h6V3zm6 0v2h6V3h-6z"/>
              </svg>
            </div>
            <h4>Department Desk</h4>
            <p>Work through assigned queues efficiently with audit trails and permanent decision records.</p>
            <ul className="feature-list-compact">
              <li>Priority queue system</li>
              <li>Batch approvals</li>
              <li>Complete audit logs</li>
            </ul>
          </article>

          <article className="feature-card card feature-card--success">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="2" x2="12" y2="22"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <h4>Administrative Control</h4>
            <p>Manage users, monitor metrics, track throughput, and resolve escalations from one dashboard.</p>
            <ul className="feature-list-compact">
              <li>Real-time analytics</li>
              <li>User management</li>
              <li>Performance insights</li>
            </ul>
          </article>
        </div>
      </section>

      {/* Advanced Process Flow */}
      <section className="card flow-section">
        <h3>How It Works – Efficient Architecture</h3>
        <div className="flow-visualization">
          <div className="flow-stages">
            <div className="flow-stage">
              <div className="flow-number">1</div>
              <h4>Submit</h4>
              <p>Student initiates one request</p>
            </div>
            <div className="flow-arrow">→</div>
            <div className="flow-stage">
              <div className="flow-number">2</div>
              <h4>Parallel Review</h4>
              <p>All departments review simultaneously</p>
            </div>
            <div className="flow-arrow">→</div>
            <div className="flow-stage">
              <div className="flow-number">3</div>
              <h4>Real-time Updates</h4>
              <p>Live notifications & tracking</p>
            </div>
            <div className="flow-arrow">→</div>
            <div className="flow-stage">
              <div className="flow-number">4</div>
              <h4>Verified Slip</h4>
              <p>Automated PDF generation</p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="comparison-section">
        <h3 className="section-title">Why Choose Digital Workflow?</h3>
        <div className="comparison-grid">
          <div className="comparison-card card">
            <h4>Traditional Paper Process</h4>
            <ul className="comparison-list">
              <li className="item-bad">
                <span>✗</span>
                <span>Sequential desk routing (weeks)</span>
              </li>
              <li className="item-bad">
                <span>✗</span>
                <span>Lost or misplaced documents</span>
              </li>
              <li className="item-bad">
                <span>✗</span>
                <span>No visibility into status</span>
              </li>
              <li className="item-bad">
                <span>✗</span>
                <span>Manual record keeping</span>
              </li>
              <li className="item-bad">
                <span>✗</span>
                <span>No audit trail or history</span>
              </li>
            </ul>
          </div>

          <div className="comparison-card card comparison-card--highlight">
            <h4>Campus Clearance System</h4>
            <ul className="comparison-list">
              <li className="item-good">
                <span>✓</span>
                <span>Parallel processing (days)</span>
              </li>
              <li className="item-good">
                <span>✓</span>
                <span>Secure digital records</span>
              </li>
              <li className="item-good">
                <span>✓</span>
                <span>Real-time progress tracking</span>
              </li>
              <li className="item-good">
                <span>✓</span>
                <span>Automated workflows</span>
              </li>
              <li className="item-good">
                <span>✓</span>
                <span>Complete audit history</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="value-section grid two-col">
        <article className="value-card card">
          <h3>⚡ Speed & Efficiency</h3>
          <p className="value-highlight">Process requests 70% faster</p>
          <p>Parallel review routes eliminate sequential delays. Students get clearance in days, not weeks. Departments work without bottlenecks or manual handoffs.</p>
        </article>

        <article className="value-card card">
          <h3>🔍 Complete Transparency</h3>
          <p className="value-highlight">100% visibility at all times</p>
          <p>Every action is logged. Students see exactly where their request is. Admins can audit all decisions instantly. No more lost requests or unclear statuses.</p>
        </article>
      </section>

      {/* Final CTA Section */}
      <section className="card final-cta">
        <div className="cta-content">
          <h3>Ready to Transform Your Clearance Process?</h3>
          <p>Join institutions already using digital clearance workflows.</p>
          <Link to="/register" className="btn btn-primary btn-large">
            Get Started Today
          </Link>
        </div>
      </section>
    </AppShell>
  );
};

export default LandingPage;
