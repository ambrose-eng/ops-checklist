// src/pages/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAllSubmissions, getAuditLog, seedDatabase } from '../utils/firestoreService';
import { exportToExcel, exportToCSV } from '../utils/exportUtils';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, addMonths } from 'date-fns';
import { ROLES } from '../seedData';

const ROLE_COLORS = Object.fromEntries(ROLES.map(r => [r.id, r.color]));

export default function AdminDashboard() {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    loadData();
  }, [isAdmin]);

  async function loadData() {
    setLoading(true);
    try {
      const [subs, logs] = await Promise.all([getAllSubmissions(), getAuditLog()]);
      setSubmissions(subs);
      setAuditLog(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      await seedDatabase();
      setSeedMsg('✅ Database seeded successfully! Checklist items are now in Firestore.');
    } catch (err) {
      setSeedMsg('❌ Seed failed: ' + err.message);
    } finally {
      setSeeding(false);
    }
  }

  // ── Completion rates per role ─────────────────────────────────────────────
  const completionByRole = ROLES.map(role => {
    const roleSubs = submissions.filter(s => s.role_id === role.id);
    const avg = roleSubs.length
      ? Math.round(roleSubs.reduce((sum, s) => sum + (s.completion_rate || 0), 0) / roleSubs.length)
      : 0;
    return { role: role.name, id: role.id, avg, count: roleSubs.length, color: role.color };
  }).filter(r => r.count > 0).sort((a, b) => b.avg - a.avg);

  // ── Monthly trend (past 3 months) ─────────────────────────────────────────
  const now = new Date();
  const past3 = eachMonthOfInterval({ start: subMonths(now, 2), end: now });
  const next3 = eachMonthOfInterval({ start: addMonths(now, 1), end: addMonths(now, 3) });

  function avgForMonth(monthDate, roleId = null) {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const filtered = submissions.filter(s => {
      const ts = s.timestamp?.toDate ? s.timestamp.toDate() : new Date(s.date);
      return ts >= start && ts <= end && (!roleId || s.role_id === roleId);
    });
    if (!filtered.length) return null;
    return Math.round(filtered.reduce((sum, s) => sum + (s.completion_rate || 0), 0) / filtered.length);
  }

  const trendData = past3.map(m => ({
    month: format(m, 'MMM yy'),
    actual: avgForMonth(m),
  }));

  // Simple linear projection for next 3 months
  const vals = trendData.map(d => d.actual).filter(v => v !== null);
  const slope = vals.length >= 2
    ? (vals[vals.length - 1] - vals[0]) / (vals.length - 1)
    : 0;
  const lastVal = vals[vals.length - 1] || 80;

  const forecastData = [
    ...trendData.map(d => ({ ...d, forecast: null })),
    ...next3.map((m, i) => ({
      month: format(m, 'MMM yy'),
      actual: null,
      forecast: Math.min(100, Math.max(0, Math.round(lastVal + slope * (i + 1)))),
    })),
  ];

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalSubs = submissions.length;
  const overallAvg = totalSubs
    ? Math.round(submissions.reduce((s, sub) => s + (sub.completion_rate || 0), 0) / totalSubs)
    : 0;
  const todaySubs = submissions.filter(s => {
    const ts = s.timestamp?.toDate ? s.timestamp.toDate() : new Date(s.date);
    return format(ts, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
  }).length;

  if (loading) return <div style={styles.loading}><div style={styles.spinner} /><p>Loading dashboard...</p></div>;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Admin Dashboard</h1>
          <p style={styles.sub}>Operations Checklist Analytics</p>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.refreshBtn} onClick={loadData}>↻ Refresh</button>
          <button style={styles.logoutBtn} onClick={() => { logout(); navigate('/'); }}>Logout</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {['overview', 'trends', 'export', 'audit', 'setup'].map(t => (
          <button
            key={t}
            style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
            onClick={() => setTab(t)}
          >
            {{ overview: '📊 Overview', trends: '📈 Trends', export: '⬇️ Export', audit: '📋 Audit', setup: '⚙️ Setup' }[t]}
          </button>
        ))}
      </div>

      <div style={styles.content}>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <>
            <div style={styles.statsRow}>
              {[
                { label: 'Total Submissions', value: totalSubs, icon: '📝' },
                { label: 'Overall Avg', value: `${overallAvg}%`, icon: '📊' },
                { label: "Today's Submissions", value: todaySubs, icon: '📅' },
                { label: 'Active Roles', value: completionByRole.length, icon: '👥' },
              ].map(s => (
                <div key={s.label} style={styles.statCard}>
                  <span style={styles.statIcon}>{s.icon}</span>
                  <span style={styles.statValue}>{s.value}</span>
                  <span style={styles.statLabel}>{s.label}</span>
                </div>
              ))}
            </div>

            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Completion Rate by Role</h3>
              {completionByRole.length === 0 ? (
                <p style={styles.noData}>No submission data yet. Start submitting checklists!</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={completionByRole} margin={{ top: 10, right: 10, left: -10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="role" angle={-35} textAnchor="end" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={v => `${v}%`} />
                    <Bar dataKey="avg" name="Avg Completion" radius={[6, 6, 0, 0]}>
                      {completionByRole.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Role Performance Table</h3>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Role</th>
                      <th style={styles.th}>Submissions</th>
                      <th style={styles.th}>Avg Completion</th>
                      <th style={styles.th}>Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completionByRole.map(r => (
                      <tr key={r.id} style={styles.tr}>
                        <td style={styles.td}>
                          <span style={{ ...styles.roleDot, backgroundColor: r.color }} />
                          {r.role}
                        </td>
                        <td style={styles.td}>{r.count}</td>
                        <td style={styles.td}>
                          <div style={styles.barWrap}>
                            <div style={{ ...styles.barFill, width: `${r.avg}%`, backgroundColor: r.color }} />
                            <span>{r.avg}%</span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={{ color: r.avg >= 90 ? '#22c55e' : r.avg >= 70 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>
                            {r.avg >= 90 ? '🟢 Excellent' : r.avg >= 70 ? '🟡 Good' : '🔴 Needs Attention'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── TRENDS ── */}
        {tab === 'trends' && (
          <>
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>3-Month Trend + 3-Month Forecast</h3>
              <p style={styles.chartSub}>Solid line = actual • Dashed = projected</p>
              {forecastData.every(d => d.actual === null && d.forecast === null) ? (
                <p style={styles.noData}>Not enough data for trend analysis yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={forecastData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={v => v !== null ? `${v}%` : 'N/A'} />
                    <Legend />
                    <Line type="monotone" dataKey="actual" name="Actual" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} connectNulls />
                    <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 4 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Monthly Submissions Volume</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={past3.map(m => ({
                    month: format(m, 'MMM yy'),
                    count: submissions.filter(s => {
                      const ts = s.timestamp?.toDate ? s.timestamp.toDate() : new Date(s.date);
                      return ts >= startOfMonth(m) && ts <= endOfMonth(m);
                    }).length,
                  }))}
                  margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Submissions" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ── EXPORT ── */}
        {tab === 'export' && (
          <div style={styles.exportCard}>
            <div style={styles.exportIcon}>⬇️</div>
            <h2 style={styles.exportTitle}>Export Checklist Data</h2>
            <p style={styles.exportSub}>Download all {totalSubs} submissions with full item-level detail.</p>

            <div style={styles.exportBtns}>
              <button style={styles.xlsxBtn} onClick={() => exportToExcel(submissions)}>
                📊 Export as Excel (.xlsx)
              </button>
              <button style={styles.csvBtn} onClick={() => exportToCSV(submissions)}>
                📄 Export as CSV
              </button>
            </div>

            <div style={styles.exportInfo}>
              <h4 style={{ margin: '0 0 8px', color: '#374151' }}>Export includes:</h4>
              {['Date & Time', 'Role', 'User Name', 'Each checklist item', 'Done / Not Done status', 'Comments for Not Done items', 'Completion % per submission', 'Summary by Role tab (Excel only)'].map(item => (
                <div key={item} style={styles.exportInfoItem}>✓ {item}</div>
              ))}
            </div>
          </div>
        )}

        {/* ── AUDIT ── */}
        {tab === 'audit' && (
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Audit Log</h3>
            <p style={styles.chartSub}>Recent checklist submissions and admin actions</p>
            {auditLog.length === 0 ? (
              <p style={styles.noData}>No audit events yet.</p>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Time</th>
                      <th style={styles.th}>Action</th>
                      <th style={styles.th}>User</th>
                      <th style={styles.th}>Role</th>
                      <th style={styles.th}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog.slice(0, 50).map(log => (
                      <tr key={log.id} style={styles.tr}>
                        <td style={styles.td} title={log.timestamp?.toDate ? log.timestamp.toDate().toString() : ''}>
                          {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'dd MMM HH:mm') : '—'}
                        </td>
                        <td style={styles.td}>{log.action?.replace(/_/g, ' ')}</td>
                        <td style={styles.td}>{log.user_name || '—'}</td>
                        <td style={styles.td}>{log.role_id || '—'}</td>
                        <td style={styles.td}>
                          {log.completion_rate !== undefined ? (
                            <span style={{ color: log.completion_rate >= 90 ? '#22c55e' : log.completion_rate >= 70 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>
                              {log.completion_rate}%
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── SETUP ── */}
        {tab === 'setup' && (
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>⚙️ Database Setup</h3>
            <p style={styles.chartSub}>Run this once to populate Firestore with all roles and checklist items from the Excel file.</p>
            <button
              style={styles.seedBtn}
              onClick={handleSeed}
              disabled={seeding}
            >
              {seeding ? '⏳ Seeding...' : '🌱 Seed Firestore Database'}
            </button>
            {seedMsg && <p style={{ marginTop: 16, fontSize: 14, color: seedMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{seedMsg}</p>}

            <hr style={{ margin: '24px 0', borderColor: '#f1f5f9' }} />
            <h4 style={{ color: '#374151', marginBottom: 8 }}>Role Passwords (change in seedData.js)</h4>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>Role</th><th style={styles.th}>Password</th></tr></thead>
                <tbody>
                  {ROLES.map(r => (
                    <tr key={r.id} style={styles.tr}>
                      <td style={styles.td}><span style={{ ...styles.roleDot, backgroundColor: r.color }} />{r.name}</td>
                      <td style={styles.td}><code style={styles.code}>{r.password}</code></td>
                    </tr>
                  ))}
                  <tr style={styles.tr}>
                    <td style={styles.td}><span style={{ ...styles.roleDot, backgroundColor: '#1e293b' }} />Admin</td>
                    <td style={styles.td}><code style={styles.code}>admin@ops2024</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  header: { background: '#1e293b', color: 'white', padding: '20px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 22, fontWeight: 800, margin: '0 0 4px' },
  sub: { fontSize: 13, opacity: 0.7, margin: 0 },
  headerActions: { display: 'flex', gap: 8 },
  refreshBtn: { background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  logoutBtn: { background: '#ef4444', border: 'none', color: 'white', padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  tabs: { display: 'flex', gap: 2, padding: '0 12px', backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0', overflowX: 'auto' },
  tab: { padding: '12px 14px', border: 'none', backgroundColor: 'transparent', fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap', borderBottom: '3px solid transparent', marginBottom: -2 },
  tabActive: { color: '#3b82f6', borderBottomColor: '#3b82f6' },
  content: { padding: '16px 12px', maxWidth: 900, margin: '0 auto' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 },
  statCard: { background: 'white', borderRadius: 14, padding: '16px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  statIcon: { fontSize: 26, marginBottom: 6 },
  statValue: { fontSize: 26, fontWeight: 800, color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#64748b', textAlign: 'center', marginTop: 2 },
  chartCard: { background: 'white', borderRadius: 16, padding: '20px 16px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  chartTitle: { fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' },
  chartSub: { fontSize: 12, color: '#94a3b8', margin: '0 0 16px' },
  noData: { textAlign: 'center', color: '#94a3b8', padding: '24px 0', fontSize: 14 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 12px', backgroundColor: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: 12, borderBottom: '2px solid #f1f5f9' },
  tr: { borderBottom: '1px solid #f8fafc' },
  td: { padding: '10px 12px', color: '#374151', verticalAlign: 'middle', display: 'table-cell' },
  roleDot: { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 6 },
  barWrap: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 },
  barFill: { height: 8, borderRadius: 4, minWidth: 4, transition: 'width 0.5s' },
  exportCard: { background: 'white', borderRadius: 20, padding: '32px 24px', maxWidth: 440, margin: '0 auto', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
  exportIcon: { fontSize: 52, marginBottom: 12 },
  exportTitle: { fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' },
  exportSub: { fontSize: 14, color: '#64748b', margin: '0 0 24px' },
  exportBtns: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 },
  xlsxBtn: { padding: '15px', border: 'none', borderRadius: 12, backgroundColor: '#22c55e', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  csvBtn: { padding: '15px', border: '2px solid #e2e8f0', borderRadius: 12, backgroundColor: 'white', color: '#374151', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  exportInfo: { background: '#f8fafc', borderRadius: 12, padding: '16px', textAlign: 'left' },
  exportInfoItem: { fontSize: 13, color: '#374151', padding: '3px 0', color: '#16a34a' },
  seedBtn: { padding: '14px 28px', border: 'none', borderRadius: 12, backgroundColor: '#3b82f6', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  code: { backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace', color: '#1e293b' },
  loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, color: '#64748b' },
  spinner: { width: 40, height: 40, border: '4px solid #e2e8f0', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
};
