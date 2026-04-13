import { useCallback, useEffect, useMemo, useState } from 'react';
import http from '../api/http';
import AppShell from '../components/AppShell';
import { useAuth } from '../context/AuthContext';

const staffRoles = ['department', 'library', 'hostel', 'bursary'];
const unitOptions = ['department', 'library', 'hostel', 'bursary'];
const statusOptions = ['all', 'pending', 'approved', 'rejected'];

const DashboardPage = () => {
  const { user, updateUser } = useAuth();

  const [request, setRequest] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [queueRequests, setQueueRequests] = useState([]);
  const [queuePagination, setQueuePagination] = useState({ page: 1, totalPages: 1 });
  const [queueFilters, setQueueFilters] = useState({ status: 'all', search: '', page: 1, limit: 8 });
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, totalPages: 1 });
  const [usersFilters, setUsersFilters] = useState({ role: 'all', search: '', page: 1, limit: 8 });
  const [message, setMessage] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'student' });
  const [reviewComments, setReviewComments] = useState({});
  const [adminUnitFilter, setAdminUnitFilter] = useState('department');
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);

  const isStudent = user?.role === 'student';
  const isStaff = staffRoles.includes(user?.role);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    setProfileForm({ name: user?.name || '', email: user?.email || '' });
  }, [user]);

  const refreshStudentData = useCallback(async () => {
    const [clearanceResponse, notifResponse] = await Promise.all([
      http.get('/clearance/my'),
      http.get('/notifications'),
    ]);
    setRequest(clearanceResponse.data.request || null);
    setNotifications(notifResponse.data.notifications || []);
  }, []);

  const refreshQueueData = useCallback(async () => {
    const params = new URLSearchParams({
      status: queueFilters.status,
      search: queueFilters.search,
      page: String(queueFilters.page),
      limit: String(queueFilters.limit),
    });

    if (isAdmin) {
      params.set('unit', adminUnitFilter);
    }

    const response = await http.get(`/clearance/unit?${params.toString()}`);
    setQueueRequests(response.data.requests || []);
    setQueuePagination(response.data.pagination || { page: 1, totalPages: 1 });
  }, [queueFilters, isAdmin, adminUnitFilter]);

  const refreshAdminData = useCallback(async () => {
    const [analyticsResponse, usersResponse] = await Promise.all([
      http.get('/admin/analytics'),
      http.get(
        `/admin/users?role=${encodeURIComponent(usersFilters.role)}&search=${encodeURIComponent(usersFilters.search)}&page=${usersFilters.page}&limit=${usersFilters.limit}`
      ),
    ]);

    setAnalytics(analyticsResponse.data);
    setUsers(usersResponse.data.users || []);
    setUsersPagination(usersResponse.data.pagination || { page: 1, totalPages: 1 });
  }, [usersFilters]);

  useEffect(() => {
    if (isStudent) refreshStudentData().catch(err => setMessage(err.response?.data?.message || 'Failed to load student data'));
  }, [isStudent, refreshStudentData]);

  useEffect(() => {
    if (isStaff || isAdmin) refreshQueueData().catch(err => setMessage(err.response?.data?.message || 'Failed to load queue'));
  }, [isStaff, isAdmin, refreshQueueData]);

  useEffect(() => {
    if (isAdmin) refreshAdminData().catch(err => setMessage(err.response?.data?.message || 'Failed to load admin data'));
  }, [isAdmin, refreshAdminData]);

  const startClearance = async () => {
    try {
      setBusy(true);
      await http.post('/clearance/request');
      setMessage('✓ Clearance request started successfully.');
      await refreshStudentData();
    } catch (error) {
      setMessage('⚠️ ' + (error.response?.data?.message || 'Unable to start clearance'));
    } finally {
      setBusy(false);
    }
  };

  const decideApproval = async (requestId, status) => {
    try {
      setBusy(true);
      const payload = { status, comment: reviewComments[requestId] || '' };
      if (isAdmin) payload.unit = adminUnitFilter;

      await http.patch(`/approvals/${requestId}`, payload);
      setMessage(`✓ Request updated as ${status}.`);
      setReviewComments(prev => ({ ...prev, [requestId]: '' }));
      await refreshQueueData();

      if (isStudent) await refreshStudentData();
      if (isAdmin) await refreshAdminData();
    } catch (error) {
      setMessage('⚠️ ' + (error.response?.data?.message || 'Unable to update request'));
    } finally {
      setBusy(false);
    }
  };

  const createUser = async (event) => {
    event.preventDefault();
    try {
      setBusy(true);
      await http.post('/admin/users', newUser);
      setMessage('✓ User created successfully.');
      setNewUser({ name: '', email: '', password: '', role: 'student' });
      await refreshAdminData();
    } catch (error) {
      setMessage('⚠️ ' + (error.response?.data?.message || 'Unable to create user'));
    } finally {
      setBusy(false);
    }
  };

  const removeUser = async (id) => {
    try {
      setBusy(true);
      await http.delete(`/admin/users/${id}`);
      setMessage('✓ User deleted successfully.');
      await refreshAdminData();
    } catch (error) {
      setMessage('⚠️ ' + (error.response?.data?.message || 'Unable to delete user'));
    } finally {
      setBusy(false);
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await http.patch(`/notifications/${id}/read`);
      await refreshStudentData();
    } catch (error) {
      setMessage('⚠️ ' + (error.response?.data?.message || 'Unable to update notification'));
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await http.patch('/notifications/read-all');
      await refreshStudentData();
    } catch (error) {
      setMessage('⚠️ ' + (error.response?.data?.message || 'Unable to mark notifications as read'));
    }
  };

  const updateProfile = async (event) => {
    event.preventDefault();
    try {
      setBusy(true);
      const response = await http.patch('/auth/profile', profileForm);
      updateUser(response.data.user);
      setMessage('✓ Profile updated successfully.');
    } catch (error) {
      setMessage('⚠️ ' + (error.response?.data?.message || 'Unable to update profile'));
    } finally {
      setBusy(false);
    }
  };

  const updatePassword = async (event) => {
    event.preventDefault();
    try {
      setBusy(true);
      await http.patch('/auth/password', passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '' });
      setMessage('✓ Password changed successfully.');
    } catch (error) {
      setMessage('⚠️ ' + (error.response?.data?.message || 'Unable to update password'));
    } finally {
      setBusy(false);
    }
  };

  const progress = useMemo(() => {
    if (!request?.approvals?.length) return 0;
    const approved = request.approvals.filter((entry) => entry.status === 'approved').length;
    return Math.round((approved / request.approvals.length) * 100);
  }, [request]);

  const unreadNotifications = useMemo(() => notifications.filter((item) => !item.readStatus).length, [notifications]);
  const pendingQueueCount = useMemo(() => queueRequests.filter((item) => item.status === 'pending').length, [queueRequests]);
  const historyItems = useMemo(
    () => [...(request?.approvalHistory || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [request]
  );

  return (
    <AppShell
      title="Operations Dashboard"
      subtitle="Manage your clearance workflow efficiently"
    >
      {message && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <p className={message.startsWith('✓') ? 'message' : 'error-message'}>
            {message}
          </p>
          <button 
            className="btn tiny"
            onClick={() => setMessage('')}
            style={{ marginTop: '0.5rem' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ===== STUDENT SECTION ===== */}
      {isStudent && (
        <>
          {/* Request Status Overview */}
          <section className="grid two-col">
            <article className="card" style={{ minHeight: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div className="section-head">
                  <h2 style={{ margin: 0 }}>📋 Clearance Status</h2>
                </div>
                <p style={{ marginBottom: '1rem', color: '#7a8d8e' }}>
                  Track your clearance request through all departments
                </p>
              </div>

              {!request && (
                <button
                  type="button"
                  className="btn"
                  onClick={startClearance}
                  disabled={busy}
                  style={{ width: '100%', marginTop: 'auto' }}
                >
                  ✨ Start Clearance Process
                </button>
              )}

              {request && (
                <div>
                  <div className="kpi-row">
                    <span className="mini-kpi">
                      <strong>{progress}%</strong>
                      <small>Progress</small>
                    </span>
                    <span className="mini-kpi">
                      <strong className={request.status === 'approved' ? '' : ''}>{request.status}</strong>
                      <small>Status</small>
                    </span>
                  </div>
                  <div className="meter">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  {request.status === 'approved' && (
                    <a
                      className="btn"
                      href={`/api/reports/slip/${request._id}`}
                      style={{ display: 'block', marginTop: '1rem', textAlign: 'center' }}
                    >
                      ⬇️ Download Clearance PDF
                    </a>
                  )}
                </div>
              )}
            </article>

            <article className="card">
              <div className="section-head">
                <h2 style={{ margin: 0 }}>🔔 Notifications</h2>
                {unreadNotifications > 0 && (
                  <button type="button" className="btn small ghost" onClick={markAllNotificationsRead}>
                    Mark All Read
                  </button>
                )}
              </div>

              {!notifications.length && (
                <p style={{ textAlign: 'center', color: '#7a8d8e', paddingTop: '2rem' }}>
                  No notifications yet
                </p>
              )}

              {notifications.length > 0 && (
                <ul className="stack-list">
                  {notifications.map((item) => (
                    <li key={item._id} className={item.readStatus ? 'read' : ''}>
                      <p style={{ marginBottom: '0.35rem' }}>{item.message}</p>
                      <small>{new Date(item.createdAt).toLocaleString()}</small>
                      {!item.readStatus && (
                        <button
                          type="button"
                          className="btn tiny"
                          onClick={() => markNotificationRead(item._id)}
                          style={{ marginTop: '0.5rem' }}
                        >
                          Mark as Read
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>

          {/* Approval Details */}
          {request && (
            <section className="card">
              <h2>📊 Department Approvals</h2>
              <p style={{ color: '#7a8d8e', marginBottom: '1rem' }}>
                See the status of your clearance at each department
              </p>

              <div className="approval-list">
                {request.approvals.map((entry) => (
                  <div key={entry.unit} className="approval-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
                      <div>
                        <h4>{entry.unit.toUpperCase()}</h4>
                        <p style={{ color: '#7a8d8e', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                          {entry.comment || 'No comment provided'}
                        </p>
                      </div>
                      <span className={`status-pill ${entry.status}`}>{entry.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              {historyItems.length > 0 && (
                <details style={{ marginTop: '1.5rem' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: '600', color: '#15696e', marginBottom: '0.75rem' }}>
                    📝 Activity Timeline
                  </summary>
                  <ul className="history-list">
                    {historyItems.map((item, index) => (
                      <li key={`${item.unit}-${index}`}>
                        <div>
                          <strong>{item.unit.toUpperCase()}</strong>
                          <span className={`status-pill ${item.status}`}>{item.status}</span>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: '#7a8d8e' }}>
                          By {item.actor?.name || 'System'} • {new Date(item.createdAt).toLocaleString()}
                        </p>
                        {item.comment && (
                          <p style={{ fontStyle: 'italic', color: '#5a6d6e', marginTop: '0.35rem' }}>
                            "{item.comment}"
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          )}
        </>
      )}

      {/* ===== STAFF / ADMIN QUEUE SECTION ===== */}
      {(isStaff || isAdmin) && (
        <section className="card">
          <div className="section-head">
            <h2 style={{ margin: 0 }}>📋 {isAdmin ? 'Admin Desk' : `${user.role.toUpperCase()} Queue`}</h2>
          </div>
          <p style={{ color: '#7a8d8e', marginBottom: '1.25rem' }}>
            Review and process clearance requests with detailed comments
          </p>

          {/* Filters */}
          <div className="inline-controls stackable" style={{ marginBottom: '1.25rem' }}>
            {isAdmin && (
              <select
                value={adminUnitFilter}
                onChange={(event) => setAdminUnitFilter(event.target.value)}
                style={{ padding: '0.75rem' }}
              >
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit.charAt(0).toUpperCase() + unit.slice(1)}
                  </option>
                ))}
              </select>
            )}

            <select
              value={queueFilters.status}
              onChange={(event) =>
                setQueueFilters((prev) => ({ ...prev, status: event.target.value, page: 1 }))
              }
              style={{ padding: '0.75rem' }}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>

            <input
              type="search"
              placeholder="Search by name or email..."
              value={queueFilters.search}
              onChange={(event) =>
                setQueueFilters((prev) => ({ ...prev, search: event.target.value, page: 1 }))
              }
              style={{ padding: '0.75rem' }}
            />
          </div>

          {/* Quick Stats */}
          <div className="kpi-row compact" style={{ marginBottom: '1.25rem' }}>
            <span className="mini-kpi">
              <strong>{pendingQueueCount}</strong>
              <small>Pending</small>
            </span>
            <span className="mini-kpi">
              <strong>{queueRequests.length}</strong>
              <small>In This View</small>
            </span>
          </div>

          {/* Queue Table */}
          {!queueRequests.length ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: '#7a8d8e' }}>
              No requests match your filters
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Comment</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queueRequests.map((item) => (
                    <tr key={item._id}>
                      <td style={{ fontWeight: '500' }}>{item.student?.name}</td>
                      <td>{item.student?.email}</td>
                      <td>
                        <span className={`status-pill ${item.status}`}>{item.status}</span>
                      </td>
                      <td style={{ maxWidth: '200px' }}>
                        <textarea
                          rows="2"
                          placeholder="Add your decision note..."
                          value={reviewComments[item._id] || ''}
                          onChange={(event) =>
                            setReviewComments((prev) => ({ ...prev, [item._id]: event.target.value }))
                          }
                          style={{ width: '100%', padding: '0.5rem' }}
                        />
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn small"
                            onClick={() => decideApproval(item._id, 'approved')}
                            disabled={busy}
                          >
                            ✓ Approve
                          </button>
                          <button
                            type="button"
                            className="btn small danger"
                            onClick={() => decideApproval(item._id, 'rejected')}
                            disabled={busy}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="pagination-row">
            <button
              type="button"
              className="btn small ghost"
              disabled={queueFilters.page <= 1}
              onClick={() => setQueueFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
            >
              ← Previous
            </button>
            <span>
              Page {queuePagination.page || 1} of {queuePagination.totalPages || 1}
            </span>
            <button
              type="button"
              className="btn small ghost"
              disabled={(queuePagination.page || 1) >= (queuePagination.totalPages || 1)}
              onClick={() => setQueueFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
            >
              Next →
            </button>
          </div>
        </section>
      )}

      {/* ===== ADMIN SECTION ===== */}
      {isAdmin && (
        <>
          {/* Analytics & User Creation */}
          <section className="grid two-col">
            <article className="card">
              <h2>📊 System Analytics</h2>
              {analytics ? (
                <>
                  <ul className="stats-grid">
                    <li>
                      <span>Total Users</span>
                      <strong>{analytics.totalUsers}</strong>
                    </li>
                    <li>
                      <span>Total Requests</span>
                      <strong>{analytics.totalRequests}</strong>
                    </li>
                    <li>
                      <span>Pending</span>
                      <strong>{analytics.pending}</strong>
                    </li>
                    <li>
                      <span>Approved</span>
                      <strong>{analytics.approved}</strong>
                    </li>
                    <li className="col-span">
                      <span>Rejected</span>
                      <strong>{analytics.rejected}</strong>
                    </li>
                  </ul>

                  {analytics.roleSummary && (
                    <div style={{ marginTop: '1.5rem' }}>
                      <h4 style={{ marginBottom: '0.75rem' }}>Users by Role</h4>
                      <div className="role-grid">
                        {Object.entries(analytics.roleSummary).map(([role, count]) => (
                          <span key={role} className="role-chip">
                            {role.charAt(0).toUpperCase() + role.slice(1)}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ color: '#7a8d8e' }}>Loading analytics...</p>
              )}
            </article>

            <article className="card">
              <h2>➕ Create User</h2>
              <form className="form-grid" onSubmit={createUser}>
                <label className="field">
                  <span>Full Name</span>
                  <input
                    placeholder="Enter name"
                    value={newUser.name}
                    onChange={(event) =>
                      setNewUser((prev) => ({ ...prev, name: event.target.value }))
                    }
                    required
                    disabled={busy}
                  />
                </label>

                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    placeholder="user@school.edu"
                    value={newUser.email}
                    onChange={(event) =>
                      setNewUser((prev) => ({ ...prev, email: event.target.value }))
                    }
                    required
                    disabled={busy}
                  />
                </label>

                <label className="field">
                  <span>Password</span>
                  <input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={newUser.password}
                    onChange={(event) =>
                      setNewUser((prev) => ({ ...prev, password: event.target.value }))
                    }
                    required
                    disabled={busy}
                  />
                </label>

                <label className="field">
                  <span>Role</span>
                  <select
                    value={newUser.role}
                    onChange={(event) =>
                      setNewUser((prev) => ({ ...prev, role: event.target.value }))
                    }
                    disabled={busy}
                  >
                    <option value="student">Student</option>
                    <option value="department">Department Officer</option>
                    <option value="library">Library Staff</option>
                    <option value="hostel">Hostel Officer</option>
                    <option value="bursary">Bursary Officer</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>

                <button type="submit" className="btn" disabled={busy} style={{ width: '100%' }}>
                  {busy ? '⏳ Creating...' : '✓ Add User'}
                </button>
              </form>
            </article>
          </section>

          {/* User Management */}
          <section className="card">
            <h2>👥 Manage Users</h2>
            <p style={{ color: '#7a8d8e', marginBottom: '1.25rem' }}>
              View, filter, and manage all system users
            </p>

            <div className="inline-controls stackable" style={{ marginBottom: '1.25rem' }}>
              <select
                value={usersFilters.role}
                onChange={(event) =>
                  setUsersFilters((prev) => ({ ...prev, role: event.target.value, page: 1 }))
                }
                style={{ padding: '0.75rem' }}
              >
                <option value="all">All Roles</option>
                <option value="student">Student</option>
                <option value="department">Department</option>
                <option value="library">Library</option>
                <option value="hostel">Hostel</option>
                <option value="bursary">Bursary</option>
                <option value="admin">Admin</option>
              </select>

              <input
                type="search"
                placeholder="Search by name or email..."
                value={usersFilters.search}
                onChange={(event) =>
                  setUsersFilters((prev) => ({ ...prev, search: event.target.value, page: 1 }))
                }
                style={{ padding: '0.75rem' }}
              />
            </div>

            {!users.length ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#7a8d8e' }}>
                No users found for this filter
              </p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((item) => (
                      <tr key={item._id}>
                        <td style={{ fontWeight: '500' }}>{item.name}</td>
                        <td>{item.email}</td>
                        <td>
                          <span className="role-chip">
                            {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn small danger"
                            onClick={() => removeUser(item._id)}
                            disabled={busy}
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pagination-row">
              <button
                type="button"
                className="btn small ghost"
                disabled={usersFilters.page <= 1}
                onClick={() => setUsersFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                ← Previous
              </button>
              <span>
                Page {usersPagination.page || 1} of {usersPagination.totalPages || 1}
              </span>
              <button
                type="button"
                className="btn small ghost"
                disabled={(usersPagination.page || 1) >= (usersPagination.totalPages || 1)}
                onClick={() => setUsersFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Next →
              </button>
            </div>
          </section>
        </>
      )}

      {/* ===== ACCOUNT SETTINGS ===== */}
      <section className="card">
        <h2>⚙️ Account Settings</h2>
        <p style={{ color: '#7a8d8e', marginBottom: '1.5rem' }}>
          Manage your profile and security settings
        </p>

        <div className="grid two-col">
          <form className="form-grid" onSubmit={updateProfile}>
            <h3>👤 Profile Information</h3>

            <label className="field">
              <span>Full Name</span>
              <input
                type="text"
                placeholder="Your full name"
                value={profileForm.name}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
                disabled={busy}
              />
            </label>

            <label className="field">
              <span>Email Address</span>
              <input
                type="email"
                placeholder="your.email@school.edu"
                value={profileForm.email}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, email: event.target.value }))
                }
                required
                disabled={busy}
              />
            </label>

            <button type="submit" className="btn" disabled={busy} style={{ width: '100%' }}>
              {busy ? '⏳ Saving...' : '✓ Save Profile'}
            </button>
          </form>

          <form className="form-grid" onSubmit={updatePassword}>
            <h3>🔐 Security</h3>

            <label className="field">
              <span>Current Password</span>
              <input
                type="password"
                placeholder="Enter current password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                }
                required
                disabled={busy}
              />
            </label>

            <label className="field">
              <span>New Password</span>
              <input
                type="password"
                placeholder="Minimum 6 characters"
                minLength={6}
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                }
                required
                disabled={busy}
              />
            </label>

            <button type="submit" className="btn" disabled={busy} style={{ width: '100%' }}>
              {busy ? '⏳ Changing...' : '✓ Change Password'}
            </button>
          </form>
        </div>
      </section>
    </AppShell>
  );
};

export default DashboardPage;
