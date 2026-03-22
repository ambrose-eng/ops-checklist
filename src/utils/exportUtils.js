// src/utils/exportUtils.js
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

export function exportToExcel(submissions) {
  const rows = [];

  for (const sub of submissions) {
    const baseDate = sub.timestamp?.toDate
      ? format(sub.timestamp.toDate(), 'yyyy-MM-dd HH:mm')
      : sub.date || '';

    if (!sub.responses || sub.responses.length === 0) {
      rows.push({
        Date: baseDate,
        Role: sub.role_name || sub.role_id,
        User: sub.user_name,
        'Completion %': sub.completion_rate + '%',
        'Checklist Item': '(no items)',
        Status: '',
        Comment: '',
      });
    } else {
      for (const resp of sub.responses) {
        rows.push({
          Date: baseDate,
          Role: sub.role_name || sub.role_id,
          User: sub.user_name,
          'Completion %': sub.completion_rate + '%',
          'Checklist Item': resp.task,
          Status: resp.status === 'done' ? 'Done' : 'Not Done',
          Comment: resp.comment || '',
        });
      }
    }
  }

  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 20 }, // Date
    { wch: 22 }, // Role
    { wch: 20 }, // User
    { wch: 14 }, // Completion %
    { wch: 60 }, // Checklist Item
    { wch: 12 }, // Status
    { wch: 40 }, // Comment
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Submissions');

  // Summary sheet
  const roleMap = {};
  for (const sub of submissions) {
    const key = sub.role_name || sub.role_id;
    if (!roleMap[key]) roleMap[key] = { total: 0, sum: 0 };
    roleMap[key].total++;
    roleMap[key].sum += sub.completion_rate || 0;
  }
  const summaryRows = Object.entries(roleMap).map(([role, data]) => ({
    Role: role,
    'Total Submissions': data.total,
    'Avg Completion %': Math.round(data.sum / data.total) + '%',
  }));
  const ws2 = XLSX.utils.json_to_sheet(summaryRows);
  ws2['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary by Role');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/octet-stream' });
  saveAs(blob, `ops_checklist_export_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
}

export function exportToCSV(submissions) {
  const rows = [];
  for (const sub of submissions) {
    const baseDate = sub.timestamp?.toDate
      ? format(sub.timestamp.toDate(), 'yyyy-MM-dd HH:mm')
      : sub.date || '';
    for (const resp of (sub.responses || [])) {
      rows.push([
        baseDate,
        sub.role_name || sub.role_id,
        sub.user_name,
        sub.completion_rate + '%',
        resp.task,
        resp.status === 'done' ? 'Done' : 'Not Done',
        resp.comment || '',
      ]);
    }
  }
  const header = ['Date', 'Role', 'User', 'Completion %', 'Checklist Item', 'Status', 'Comment'];
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `ops_checklist_${format(new Date(), 'yyyyMMdd')}.csv`);
}
