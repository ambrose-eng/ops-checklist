// src/pages/ChecklistPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getChecklistItems, submitChecklist } from '../utils/firestoreService';
import { CHECKLIST_ITEMS } from '../seedData';

export default function ChecklistPage() {
  const { currentRole, userName, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!currentRole || !userName) { navigate('/'); return; }
    loadItems();
  }, [currentRole]);

  // Auto-save to localStorage
  useEffect(() => {
    if (Object.keys(responses).length > 0) {
      localStorage.setItem(`checklist_draft_${currentRole?.id}`, JSON.stringify(responses));
    }
  }, [responses]);

  async function loadItems() {
    setLoading(true);
    try {
      // Try Firestore first
      let fireItems = await getChecklistItems(currentRole.id);
      if (fireItems.length === 0) {
        // Fallback to local seed data
        const localItems = (CHECKLIST_ITEMS[currentRole.id] || []).map((task, i) => ({
          id: `${currentRole.id}_${i}`,
          task,
          order: i,
        }));
        fireItems = localItems;
      }
      setItems(fireItems);

      // Restore auto-saved draft
      const draft = localStorage.getItem(`checklist_draft_${currentRole.id}`);
      if (draft) {
        setResponses(JSON.parse(draft));
      }
    } catch (err) {
      // Offline fallback
      const localItems = (CHECKLIST_ITEMS[currentRole.id] || []).map((task, i) => ({
        id: `${currentRole.id}_${i}`,
        task,
        order: i,
      }));
      setItems(localItems);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (items.length === 0) return;
    const answered = items.filter(item => responses[item.id]?.status).length;
    setProgress(Math.round((answered / items.length) * 100));
  }, [responses, items]);

  function setStatus(itemId, status) {
    setResponses(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], status, comment: status === 'done' ? '' : (prev[itemId]?.comment || '') },
    }));
  }

  function setComment(itemId, comment) {
    const words = comment.trim().split(/\s+/).filter(Boolean);
    if (words.length > 30) return; // max 30 words
    setResponses(prev => ({ ...prev, [itemId]: { ...prev[itemId], comment } }));
  }

  function wordCount(text) {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  async function handleSubmit() {
    // Validate all items answered
    const unanswered = items.filter(item => !responses[item.id]?.status);
    if (unanswered.length > 0) {
      setError(`Please answer all ${unanswered.length} remaining item(s)`);
      // Scroll to first unanswered
      const el = document.getElementById(`item-${unanswered[0].id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Validate comments for "not done" items
    const missingComments = items.filter(item => {
      const r = responses[item.id];
      return r?.status === 'not_done' && (!r.comment || r.comment.trim() === '');
    });
    if (missingComments.length > 0) {
      setError(`Please add a comment for ${missingComments.length} "Not Done" item(s)`);
      const el = document.getElementById(`item-${missingComments[0].id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const formatted = items.map(item => ({
        item_id: item.id,
        task: item.task,
        status: responses[item.id]?.status,
        comment: responses[item.id]?.comment || '',
      }));

      await submitChecklist({
        roleId: currentRole.id,
        roleName: currentRole.name,
        userName,
        responses: formatted,
      });

      localStorage.removeItem(`checklist_draft_${currentRole.id}`);
      setSubmitted(true);
    } catch (err) {
      setError('Submission failed. Please check your connection and try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    const doneCount = items.filter(i => responses[i.id]?.status === 'done').length;
    const rate = Math.round((doneCount / items.length) * 100);
    return (
      <div style={styles.successContainer}>
        <div style={styles.successCard}>
          <div style={styles.successIcon}>✅</div>
          <h1 style={styles.successTitle}>Submitted!</h1>
          <p style={styles.successSub}>Great work, {userName}.</p>
          <div style={{ ...styles.rateCircle, borderColor: currentRole.color }}>
            <span style={{ ...styles.rateNum, color: currentRole.color }}>{rate}%</span>
            <span style={styles.rateLabel}>Done</span>
          </div>
          <p style={styles.successStats}>
            {doneCount} of {items.length} tasks completed
          </p>
          <p style={styles.successTime}>
            {new Date().toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
          <button
            style={{ ...styles.newBtn, backgroundColor: currentRole.color }}
            onClick={() => { logout(); navigate('/'); }}
          >
            Done — Back to Roles
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <p>Loading checklist...</p>
      </div>
    );
  }

  const answeredCount = items.filter(item => responses[item.id]?.status).length;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={{ ...styles.header, backgroundColor: currentRole.color }}>
        <div style={styles.headerTop}>
          <button style={styles.backBtn} onClick={() => navigate('/name')}>← Back</button>
          <div style={styles.userInfo}>
            <span style={styles.userName}>{userName}</span>
          </div>
        </div>
        <h1 style={styles.roleTitle}>{currentRole.name}</h1>
        <p style={styles.dateText}>
          {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>

        {/* Progress bar */}
        <div style={styles.progressWrap}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
          <span style={styles.progressText}>{answeredCount}/{items.length}</span>
        </div>
      </div>

      {/* Items */}
      <div style={styles.itemsWrap}>
        {items.map((item, idx) => {
          const resp = responses[item.id] || {};
          const isDone = resp.status === 'done';
          const isNotDone = resp.status === 'not_done';
          const wc = wordCount(resp.comment || '');

          return (
            <div
              key={item.id}
              id={`item-${item.id}`}
              style={{
                ...styles.itemCard,
                borderLeftColor: isDone ? '#22c55e' : isNotDone ? '#ef4444' : '#e2e8f0',
                borderLeftWidth: 4,
              }}
            >
              <div style={styles.itemTop}>
                <span style={styles.itemNum}>{idx + 1}</span>
                <p style={styles.itemTask}>{item.task}</p>
              </div>

              <div style={styles.btnRow}>
                <button
                  style={{
                    ...styles.statusBtn,
                    ...(isDone ? styles.doneActive : styles.doneInactive),
                  }}
                  onClick={() => setStatus(item.id, 'done')}
                >
                  ✓ Done
                </button>
                <button
                  style={{
                    ...styles.statusBtn,
                    ...(isNotDone ? styles.notDoneActive : styles.notDoneInactive),
                  }}
                  onClick={() => setStatus(item.id, 'not_done')}
                >
                  ✗ Not Done
                </button>
              </div>

              {isNotDone && (
                <div style={styles.commentWrap}>
                  <textarea
                    style={styles.commentInput}
                    placeholder="Why not done? (required, max 30 words)"
                    value={resp.comment || ''}
                    onChange={e => setComment(item.id, e.target.value)}
                    rows={2}
                  />
                  <span style={{ ...styles.wordCount, color: wc >= 28 ? '#ef4444' : '#94a3b8' }}>
                    {wc}/30 words
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit footer */}
      <div style={styles.footer}>
        {error && <p style={styles.error}>{error}</p>}
        <div style={styles.footerInfo}>
          <span>{answeredCount}/{items.length} answered</span>
          <span style={{ fontWeight: 700, color: currentRole.color }}>{progress}% complete</span>
        </div>
        <button
          style={{
            ...styles.submitBtn,
            backgroundColor: answeredCount === items.length ? currentRole.color : '#94a3b8',
          }}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : `Submit Checklist (${answeredCount}/${items.length})`}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    paddingBottom: 140,
  },
  header: {
    padding: '20px 16px 24px',
    color: 'white',
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    borderRadius: 10,
    padding: '8px 14px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  userInfo: { display: 'flex', alignItems: 'center', gap: 6 },
  userName: { fontSize: 14, fontWeight: 600, opacity: 0.9 },
  roleTitle: { fontSize: 26, fontWeight: 800, margin: '0 0 4px' },
  dateText: { fontSize: 13, opacity: 0.85, margin: '0 0 16px' },
  progressWrap: { display: 'flex', alignItems: 'center', gap: 10 },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  progressText: { fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' },
  itemsWrap: { padding: '12px 12px' },
  itemCard: {
    background: 'white',
    borderRadius: 14,
    padding: '16px 14px',
    marginBottom: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    borderLeft: '4px solid #e2e8f0',
  },
  itemTop: { display: 'flex', gap: 10, marginBottom: 12 },
  itemNum: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    color: '#64748b',
    flexShrink: 0,
  },
  itemTask: { fontSize: 15, color: '#1e293b', margin: 0, lineHeight: 1.5, fontWeight: 500 },
  btnRow: { display: 'flex', gap: 8 },
  statusBtn: {
    flex: 1,
    padding: '13px',
    border: '2px solid',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
  doneActive: { backgroundColor: '#22c55e', borderColor: '#22c55e', color: 'white' },
  doneInactive: { backgroundColor: 'white', borderColor: '#d1fae5', color: '#16a34a' },
  notDoneActive: { backgroundColor: '#ef4444', borderColor: '#ef4444', color: 'white' },
  notDoneInactive: { backgroundColor: 'white', borderColor: '#fee2e2', color: '#dc2626' },
  commentWrap: { marginTop: 10 },
  commentInput: {
    width: '100%',
    padding: '10px 12px',
    border: '2px solid #fca5a5',
    borderRadius: 10,
    fontSize: 14,
    boxSizing: 'border-box',
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
  },
  wordCount: { fontSize: 11, float: 'right', marginTop: 3 },
  footer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'white',
    padding: '12px 16px 24px',
    boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
  },
  footerInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  submitBtn: {
    width: '100%',
    padding: '16px',
    border: 'none',
    borderRadius: 14,
    color: 'white',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  error: { color: '#ef4444', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: 16,
    color: '#64748b',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  successContainer: {
    minHeight: '100vh',
    backgroundColor: '#f0fdf4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  successCard: {
    background: 'white',
    borderRadius: 24,
    padding: '40px 28px',
    maxWidth: 380,
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
  },
  successIcon: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 32, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' },
  successSub: { fontSize: 17, color: '#64748b', margin: '0 0 24px' },
  rateCircle: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    border: '6px solid',
    margin: '0 auto 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateNum: { fontSize: 28, fontWeight: 800, lineHeight: 1 },
  rateLabel: { fontSize: 12, color: '#94a3b8', fontWeight: 600 },
  successStats: { fontSize: 15, color: '#64748b', margin: '0 0 6px' },
  successTime: { fontSize: 13, color: '#94a3b8', margin: '0 0 28px' },
  newBtn: {
    width: '100%',
    padding: '16px',
    border: 'none',
    borderRadius: 14,
    color: 'white',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
  },
};
