import { useCallback, useEffect, useMemo, useState } from 'react';
import http from '../api/http';
import AppShell from '../components/AppShell';
import { useAuth } from '../context/AuthContext';

const staffRoles = ['department', 'library', 'hostel', 'bursary'];
const unitOptions = ['department', 'library', 'hostel', 'bursary'];
const statusOptions = ['all', 'pending', 'approved', 'rejected'];

const DashboardPage = () => {
  const { user, updateUser } = useAuth();
  const reportBaseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

  const [request, setRequest] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [queueRequests, setQueueRequests] = useState([]);
  const [queuePagination, setQueuePagination] = useState({ page: 1, totalPages: 1 });
  const [queueFilters, setQueueFilters] = useState({
    status: 'all',
    search: '',
    page: 1,
    limit: 8,
  });
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
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [routeForm, setRouteForm] = useState({ assignedTo: '', escalatedTo: '', priority: 'normal', note: '' });
  const [auditItems, setAuditItems] = useState([]);
  const [savedViews, setSavedViews] = useState([]);
  const [mfaSetup, setMfaSetup] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const isStudent = user?.role === 'student';
  const isStaff = staffRoles.includes(user?.role);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    setProfileForm({ name: user?.name || '', email: user?.email || '' });
  }, [user]);

  const refreshStudentData = useCallback(async () => {
    const [clearanceResponse, notifResponse] = await Promise.all([http.get('/clearance/my'), http.get('/notifications')]);
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

  const refreshAuditData = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    setLoadingAudit(true);
    try {
      const [auditResponse, viewsResponse] = await Promise.all([http.get('/admin/audit'), http.get('/admin/views')]);
      setAuditItems(auditResponse.data.audit || []);
      setSavedViews(viewsResponse.data.views || []);
    } finally {
      setLoadingAudit(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    const load = async () => {
      try {
        if (isStudent) {
          await refreshStudentData();
        }
      } catch (error) {
        setMessage(error.response?.data?.message || 'Failed to load student data');
      }
    };

    load();
  }, [isStudent, refreshStudentData]);

  useEffect(() => {
    const load = async () => {
      try {
        if (isStaff || isAdmin) {
          await refreshQueueData();
        }
      } catch (error) {
        setMessage(error.response?.data?.message || 'Failed to load unit queue');
      }
    };

    load();
  }, [isStaff, isAdmin, refreshQueueData]);

  useEffect(() => {
    const load = async () => {
      try {
        if (isAdmin) {
          await refreshAdminData();
        }
      } catch (error) {
        setMessage(error.response?.data?.message || 'Failed to load admin data');
      }
    };

    load();
  }, [isAdmin, refreshAdminData]);

  useEffect(() => {
    if (isAdmin) {
      refreshAuditData().catch((error) => setMessage(error.response?.data?.message || 'Failed to load audit data'));
    }
  }, [isAdmin, refreshAuditData]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isStudent) {
        refreshStudentData().catch(() => {});
      }
      if (isStaff || isAdmin) {
        refreshQueueData().catch(() => {});
      }
      if (isAdmin) {
        refreshAdminData().catch(() => {});
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isStudent, isStaff, isAdmin, refreshStudentData, refreshQueueData, refreshAdminData]);

  const startClearance = async () => {
    try {
      setBusy(true);
      await http.post('/clearance/request');
      setMessage('Clearance request started successfully.');
      await refreshStudentData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to start clearance');
    } finally {
      setBusy(false);
    }
  };

  const decideApproval = async (requestId, status) => {
    try {
      setBusy(true);
      const payload = {
        status,
        comment: reviewComments[requestId] || '',
      };

      if (isAdmin) {
        payload.unit = adminUnitFilter;
      }

      await http.patch(`/approvals/${requestId}`, payload);
      setMessage(`Request updated as ${status}.`);
      setReviewComments((prev) => ({ ...prev, [requestId]: '' }));
      await refreshQueueData();

      if (isStudent) {
        await refreshStudentData();
      }

      if (isAdmin) {
        await refreshAdminData();
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to update request');
    } finally {
      setBusy(false);
    }
  };

  const createUser = async (event) => {
    event.preventDefault();

    try {
      setBusy(true);
      await http.post('/admin/users', newUser);
      setMessage('User created successfully.');
      setNewUser({ name: '', email: '', password: '', role: 'student' });
      await refreshAdminData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to create user');
    } finally {
      setBusy(false);
    }
  };

  const removeUser = async (id) => {
    const confirmed = window.confirm('Delete this user account? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      setBusy(true);
      await http.delete(`/admin/users/${id}`);
      setMessage('User deleted successfully.');
      await refreshAdminData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to delete user');
    } finally {
      setBusy(false);
    }
  };

  const markNotificationRead = async (id) => {
    try {
      setBusy(true);
      await http.patch(`/notifications/${id}/read`);
      await refreshStudentData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to update notification');
    } finally {
      setBusy(false);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      setBusy(true);
      await http.patch('/notifications/read-all');
      await refreshStudentData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to mark notifications as read');
    } finally {
      setBusy(false);
    }
  };

  const updateProfile = async (event) => {
    event.preventDefault();

    try {
      setBusy(true);
      const response = await http.patch('/auth/profile', profileForm);
      updateUser(response.data.user);
      setMessage('Profile updated successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to update profile');
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
      setMessage('Password changed successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to update password');
    } finally {
      setBusy(false);
    }
  };

  const uploadAttachments = async (event) => {
    event.preventDefault();

    if (!request?._id || !attachmentFiles.length) {
      setMessage('Select at least one file to upload.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      attachmentFiles.forEach((file) => formData.append('files', file));
      await http.post(`/clearance/${request._id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAttachmentFiles([]);
      setMessage('✓ Documents uploaded successfully.');
      await refreshStudentData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to upload documents');
    } finally {
      setUploading(false);
    }
  };

  const routeRequest = async (requestId) => {
    try {
      setBusy(true);
      await http.post(`/clearance/${requestId}/route`, {
        assignedTo: routeForm.assignedTo || null,
        escalatedTo: routeForm.escalatedTo || null,
        priority: routeForm.priority,
        note: routeForm.note,
      });
      setMessage('✓ Request routed successfully.');
      setRouteForm({ assignedTo: '', escalatedTo: '', priority: 'normal', note: '' });
      await refreshQueueData();
      await refreshAuditData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to route request');
    } finally {
      setBusy(false);
    }
  };

  const exportReports = () => {
    window.open(`${reportBaseUrl}/reports/export`, '_blank', 'noopener,noreferrer');
  };

  const setupMfa = async () => {
    try {
      setBusy(true);
      const response = await http.post('/auth/mfa/setup');
      setMfaSetup(response.data);
      setMessage('MFA setup created. Enter the code to enable it.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to start MFA setup');
    } finally {
      setBusy(false);
    }
  };

  const enableMfa = async () => {
    try {
      setBusy(true);
      await http.post('/auth/mfa/enable', { code: mfaCode });
      setMessage('✓ MFA enabled successfully.');
      setMfaCode('');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to enable MFA');
    } finally {
      setBusy(false);
    }
  };

  const progress = useMemo(() => {
    if (!request?.approvals?.length) {
      return 0;
    }

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
    <AppShell title="Operations Dashboard" subtitle="Manage requests, approvals, users, and account security in one command center">
      {message && <p className="card message">{message}</p>}

      {isStudent && (
        <section className="grid two-col">
          <article className="card">
            <h2>Student Workspace</h2>
            <p>Open your request, track progress, and export the final clearance slip when approved.</p>

            {!!request && (
              <div className="kpi-row">
                <span className="mini-kpi">
                  <strong>{progress}%</strong>
                  <small>Completion</small>
                </span>
                <span className="mini-kpi">
                  <strong>{request.status.toUpperCase()}</strong>
                  <small>Current Status</small>
                </span>
                <span className="mini-kpi">
                  <strong>{unreadNotifications}</strong>
                  <small>Unread Alerts</small>
                </span>
              </div>
            )}

            {!request && (
              <button type="button" className="btn" onClick={startClearance} disabled={busy}>
                Start Clearance Process
              </button>
            )}

            {request && (
              <>
                <p>
                  Current status: <strong>{request.status}</strong>
                </p>
                <div className="meter">
                  <span style={{ width: `${progress}%` }} />
                </div>
                <p>Completion: {progress}%</p>

                <div className="approval-list">
                  {request.approvals.map((entry) => (
                    <div key={entry.unit} className="approval-item">
                      <h3>{entry.unit.toUpperCase()}</h3>
                      <p>
                        Status: <span className={`status-pill ${entry.status}`}>{entry.status}</span>
                      </p>
                      <p>Comment: {entry.comment || 'No comment yet'}</p>
                    </div>
                  ))}
                </div>

                {request.status === 'approved' && (
                  <a className="btn" href={`${reportBaseUrl}/reports/slip/${request._id}`}>
                    Download Final Clearance PDF
                  </a>
                )}

                <form className="form-grid upload-card" onSubmit={uploadAttachments}>
                  <h3>Upload supporting documents</h3>
                  <input
                    type="file"
                    multiple
                    onChange={(event) => setAttachmentFiles(Array.from(event.target.files || []))}
                  />
                  <button type="submit" className="btn small" disabled={uploading || busy}>
                    {uploading ? 'Uploading...' : 'Upload Files'}
                  </button>
                </form>
              </>
            )}
          </article>

          <article className="card">
            <div className="section-head">
              <h2>Notifications</h2>
              {!!unreadNotifications && (
                <button type="button" className="btn tiny" onClick={markAllNotificationsRead} disabled={busy}>
                  Mark All Read
                </button>
              )}
            </div>

            {!notifications.length && <p>No notifications yet.</p>}
            {!!notifications.length && (
              <ul className="stack-list">
                {notifications.map((item) => (
                  <li key={item._id} className={item.readStatus ? 'read' : ''}>
                    <p>{item.message}</p>
                    <small>{new Date(item.createdAt).toLocaleString()}</small>
                    {!item.readStatus && (
                      <button type="button" className="btn tiny" onClick={() => markNotificationRead(item._id)} disabled={busy}>
                        Mark as Read
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="card col-span">
            <h2>Approval Timeline</h2>
            {!historyItems.length && <p>No decision history yet.</p>}
            {!!historyItems.length && (
              <ul className="history-list">
                {historyItems.map((item, index) => (
                  <li key={`${item.unit}-${index}`}>
                    <div>
                      <strong>{item.unit.toUpperCase()}</strong>
                      <span className={`status-pill ${item.status}`}>{item.status}</span>
                    </div>
                    <p>
                      Previous: {item.previousStatus} | Officer: {item.actor?.name || 'N/A'}
                    </p>
                    <p>{item.comment || 'No comment provided.'}</p>
                    <small>{new Date(item.createdAt).toLocaleString()}</small>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      )}

      {(isStaff || isAdmin) && (
        <section className="card">
          <h2>{isAdmin ? 'Admin Unit Desk' : `${user.role.toUpperCase()} Approval Desk`}</h2>
          <p>Search, filter, and process unit queue requests with comments and recorded actions.</p>

          <div className="inline-controls stackable">
            <select value={routeForm.priority} onChange={(event) => setRouteForm((prev) => ({ ...prev, priority: event.target.value }))}>
              <option value="low">LOW PRIORITY</option>
              <option value="normal">NORMAL PRIORITY</option>
              <option value="high">HIGH PRIORITY</option>
            </select>
            <input
              type="text"
              placeholder="Assign to officer email"
              value={routeForm.assignedTo}
              onChange={(event) => setRouteForm((prev) => ({ ...prev, assignedTo: event.target.value }))}
            />
            <input
              type="text"
              placeholder="Escalate to admin email"
              value={routeForm.escalatedTo}
              onChange={(event) => setRouteForm((prev) => ({ ...prev, escalatedTo: event.target.value }))}
            />
          </div>

          <textarea
            rows="3"
            placeholder="Routing note"
            value={routeForm.note}
            onChange={(event) => setRouteForm((prev) => ({ ...prev, note: event.target.value }))}
          />

          <div className="inline-controls stackable">
            {isAdmin && (
              <select value={adminUnitFilter} onChange={(event) => setAdminUnitFilter(event.target.value)}>
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit.toUpperCase()}
                  </option>
                ))}
              </select>
            )}

            <select
              value={queueFilters.status}
              onChange={(event) => setQueueFilters((prev) => ({ ...prev, status: event.target.value, page: 1 }))}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status.toUpperCase()}
                </option>
              ))}
            </select>

            <input
              type="search"
              placeholder="Search by name or email"
              value={queueFilters.search}
              onChange={(event) => setQueueFilters((prev) => ({ ...prev, search: event.target.value, page: 1 }))}
            />
          </div>

          <div className="kpi-row compact">
            <span className="mini-kpi">
              <strong>{queuePagination.totalPages || 1}</strong>
              <small>Page Count</small>
            </span>
            <span className="mini-kpi">
              <strong>{pendingQueueCount}</strong>
              <small>Pending in View</small>
            </span>
          </div>

          {!queueRequests.length && <p>No queue items found for your current filters.</p>}
          {!!queueRequests.length && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Comment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queueRequests.map((item) => (
                    <tr key={item._id}>
                      <td>{item.student?.name}</td>
                      <td>{item.student?.email}</td>
                      <td>{item.status}</td>
                      <td>
                        <textarea
                          rows="2"
                          placeholder="Add decision note"
                          value={reviewComments[item._id] || ''}
                          disabled={busy}
                          onChange={(event) => setReviewComments((prev) => ({ ...prev, [item._id]: event.target.value }))}
                        />
                      </td>
                      <td className="table-actions">
                        <button type="button" className="btn small" onClick={() => decideApproval(item._id, 'approved')} disabled={busy}>
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn small danger"
                          onClick={() => decideApproval(item._id, 'rejected')}
                          disabled={busy}
                        >
                          Reject
                        </button>
                        <button type="button" className="btn small ghost" onClick={() => routeRequest(item._id)} disabled={busy}>
                          Route
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
              disabled={queueFilters.page <= 1}
              onClick={() => setQueueFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
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
              Next
            </button>
          </div>
        </section>
      )}

      {isAdmin && (
        <section className="grid two-col">
          <article className="card">
            <h2>System Analytics</h2>
            <div className="section-head">
              <p>Overview, bottlenecks, and report export in one place.</p>
              <button type="button" className="btn tiny" onClick={exportReports}>
                Export CSV
              </button>
            </div>
            {analytics && (
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
                <li>
                  <span>Rejected</span>
                  <strong>{analytics.rejected}</strong>
                </li>
              </ul>
            )}

            {!!analytics?.roleSummary && (
              <div className="role-grid">
                {Object.entries(analytics.roleSummary).map(([role, count]) => (
                  <span key={role} className="role-chip">
                    {role}: {count}
                  </span>
                ))}
              </div>
            )}

            {!!analytics?.trend && (
              <div className="chart-stack">
                {analytics.trend.map((item) => (
                  <div key={item.label} className="chart-row">
                    <span>{item.label}</span>
                    <div className="meter slim">
                      <span style={{ width: `${item.value}%` }} />
                    </div>
                    <strong>{item.value}%</strong>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="card">
            <h2>Create User</h2>
            <form className="form-grid" onSubmit={createUser}>
              <input
                placeholder="Name"
                value={newUser.name}
                onChange={(event) => setNewUser((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={newUser.email}
                onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={newUser.password}
                onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
                required
              />
              <select
                value={newUser.role}
                onChange={(event) => setNewUser((prev) => ({ ...prev, role: event.target.value }))}
              >
                <option value="student">Student</option>
                <option value="department">Department Officer</option>
                <option value="library">Library Staff</option>
                <option value="hostel">Hostel Officer</option>
                <option value="bursary">Bursary Officer</option>
                <option value="admin">Admin</option>
              </select>
              <button type="submit" className="btn" disabled={busy}>
                Add User
              </button>
            </form>
          </article>

          <article className="card">
            <h2>Security Controls</h2>
            <p>Protect account access with MFA and recovery flows.</p>
            <div className="form-grid">
              {!mfaSetup && (
                <button type="button" className="btn" onClick={setupMfa} disabled={busy}>
                  Start MFA Setup
                </button>
              )}
              {mfaSetup && (
                <>
                  <p className="code-block">{mfaSetup.secret}</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter MFA code"
                    value={mfaCode}
                    onChange={(event) => setMfaCode(event.target.value)}
                  />
                  <button type="button" className="btn" onClick={enableMfa} disabled={busy || !mfaCode}>
                    Enable MFA
                  </button>
                </>
              )}
            </div>
          </article>

          <article className="card col-span">
            <h2>Manage Users</h2>
            <div className="inline-controls stackable">
              <select
                value={usersFilters.role}
                onChange={(event) => setUsersFilters((prev) => ({ ...prev, role: event.target.value, page: 1 }))}
              >
                <option value="all">ALL ROLES</option>
                <option value="student">STUDENT</option>
                <option value="department">DEPARTMENT</option>
                <option value="library">LIBRARY</option>
                <option value="hostel">HOSTEL</option>
                <option value="bursary">BURSARY</option>
                <option value="admin">ADMIN</option>
              </select>
              <input
                type="search"
                placeholder="Search by user name or email"
                value={usersFilters.search}
                onChange={(event) => setUsersFilters((prev) => ({ ...prev, search: event.target.value, page: 1 }))}
              />
            </div>

            {!users.length && <p>No users found for this filter.</p>}
            {!!users.length && (
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
                        <td>{item.name}</td>
                        <td>{item.email}</td>
                        <td>{item.role}</td>
                        <td>
                          <button type="button" className="btn small danger" onClick={() => removeUser(item._id)} disabled={busy}>
                            Delete
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
                Previous
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
                Next
              </button>
            </div>
          </article>

          <article className="card col-span">
            <div className="section-head">
              <h2>Audit Feed</h2>
              {loadingAudit && <small>Refreshing...</small>}
            </div>
            {!auditItems.length && <p>No audit entries available yet.</p>}
            {!!auditItems.length && (
              <ul className="stack-list">
                {auditItems.map((item) => (
                  <li key={item._id}>
                    <strong>{item.action}</strong>
                    <p>{item.details}</p>
                    <small>{new Date(item.createdAt).toLocaleString()}</small>
                  </li>
                ))}
              </ul>
            )}
            {!!savedViews.length && (
              <div className="role-grid">
                {savedViews.map((view) => (
                  <span key={view.name} className="role-chip">
                    {view.name}
                  </span>
                ))}
              </div>
            )}
          </article>
        </section>
      )}

      <section className="card account-card">
        <h2>Account Settings</h2>
        <div className="grid two-col">
          <form className="form-grid" onSubmit={updateProfile}>
            <h3>Profile</h3>
            <input
              type="text"
              placeholder="Full name"
              value={profileForm.name}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <input
              type="email"
              placeholder="Email address"
              value={profileForm.email}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
            <button type="submit" className="btn" disabled={busy}>
              Save Profile
            </button>
          </form>

          <form className="form-grid" onSubmit={updatePassword}>
            <h3>Security</h3>
            <input
              type="password"
              placeholder="Current password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
              required
            />
            <input
              type="password"
              placeholder="New password"
              minLength={6}
              value={passwordForm.newPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
              required
            />
            <button type="submit" className="btn" disabled={busy}>
              Change Password
            </button>
          </form>
        </div>
      </section>
    </AppShell>
  );
};

export default DashboardPage;
