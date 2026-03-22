// src/utils/firestoreService.js
import {
  collection, doc, setDoc, getDocs, addDoc,
  query, where, orderBy, Timestamp, getDoc, writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { ROLES, CHECKLIST_ITEMS } from '../seedData';

// ─── Seed ────────────────────────────────────────────────────────────────────
export async function seedDatabase() {
  const batch = writeBatch(db);

  // Seed roles
  for (const role of ROLES) {
    const ref = doc(db, 'roles', role.id);
    batch.set(ref, { name: role.name, color: role.color, active: true });
  }

  // Seed checklist items
  for (const [roleId, items] of Object.entries(CHECKLIST_ITEMS)) {
    for (let i = 0; i < items.length; i++) {
      const ref = doc(db, 'checklist_items', `${roleId}_${i}`);
      batch.set(ref, { role_id: roleId, order: i, task: items[i], active: true });
    }
  }

  await batch.commit();
  return { success: true };
}

// ─── Roles ────────────────────────────────────────────────────────────────────
export async function getRoles() {
  const snap = await getDocs(collection(db, 'roles'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── Checklist Items ──────────────────────────────────────────────────────────
export async function getChecklistItems(roleId) {
  const q = query(
    collection(db, 'checklist_items'),
    where('role_id', '==', roleId),
    where('active', '==', true),
    orderBy('order')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── Submissions ──────────────────────────────────────────────────────────────
export async function submitChecklist({ roleId, roleName, userName, responses }) {
  const now = new Date();
  const doneCount = responses.filter(r => r.status === 'done').length;
  const completionRate = Math.round((doneCount / responses.length) * 100);

  const submission = {
    role_id: roleId,
    role_name: roleName,
    user_name: userName,
    timestamp: Timestamp.fromDate(now),
    date: now.toISOString().split('T')[0],
    time: now.toTimeString().split(' ')[0],
    responses,
    completion_rate: completionRate,
    total_items: responses.length,
    done_count: doneCount,
  };

  const ref = await addDoc(collection(db, 'submissions'), submission);

  // Audit log
  await addDoc(collection(db, 'audit_log'), {
    action: 'checklist_submitted',
    submission_id: ref.id,
    role_id: roleId,
    user_name: userName,
    timestamp: Timestamp.fromDate(now),
    completion_rate: completionRate,
  });

  return ref.id;
}

export async function getAllSubmissions() {
  const q = query(collection(db, 'submissions'), orderBy('timestamp', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getSubmissionsByDateRange(startDate, endDate) {
  const q = query(
    collection(db, 'submissions'),
    where('timestamp', '>=', Timestamp.fromDate(startDate)),
    where('timestamp', '<=', Timestamp.fromDate(endDate)),
    orderBy('timestamp', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── Audit Log ────────────────────────────────────────────────────────────────
export async function getAuditLog() {
  const q = query(collection(db, 'audit_log'), orderBy('timestamp', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
