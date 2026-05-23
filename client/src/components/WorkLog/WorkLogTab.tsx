import { useState } from 'react';
import { useWorkLogs, useCreateWorkLog, useUpdateWorkLog, useDeleteWorkLog } from '@/hooks/useWorkLogs';
import { useAuthStore } from '@/stores/auth.store';
import type { WorkLogDto } from '@shared/types/api.types';

function isWeekend(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
}

function today() { return new Date().toISOString().slice(0, 10); }

function fmtMins(m: number) {
  const h = Math.floor(m / 60); const min = m % 60;
  return min ? `${h}h ${min}m` : `${h}h`;
}

interface Props { ticketId: string; }

export default function WorkLogTab({ ticketId }: Props) {
  const { user } = useAuthStore();
  const { data: logs = [] } = useWorkLogs(ticketId);
  const createLog = useCreateWorkLog(ticketId);
  const updateLog = useUpdateWorkLog(ticketId);
  const deleteLog = useDeleteWorkLog(ticketId);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<WorkLogDto | null>(null);
  const [logDate, setLogDate] = useState(today());
  const [hours, setHours] = useState('1');
  const [note, setNote] = useState('');
  const [dateErr, setDateErr] = useState('');

  function openCreate() { setEditing(null); setLogDate(today()); setHours('1'); setNote(''); setDateErr(''); setShowModal(true); }
  function openEdit(l: WorkLogDto) {
    setEditing(l);
    setLogDate(typeof l.logDate === 'string' ? l.logDate.slice(0, 10) : today());
    setHours(String((l.minutesLogged / 60).toFixed(1)));
    setNote(l.note ?? '');
    setDateErr('');
    setShowModal(true);
  }

  function handleDateChange(v: string) {
    setLogDate(v);
    setDateErr(isWeekend(v) ? 'Weekends are not allowed for work logging.' : '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isWeekend(logDate)) { setDateErr('Weekends are not allowed.'); return; }
    const mins = Math.round(parseFloat(hours) * 60);
    if (mins < 30 || mins > 480) { alert('Hours must be between 0.5 and 8.'); return; }
    if (editing) {
      await updateLog.mutateAsync({ id: editing.id, data: { minutesLogged: mins, logDate, note: note || null } });
    } else {
      await createLog.mutateAsync({ ticketId, minutesLogged: mins, logDate, note: note || null });
    }
    setShowModal(false);
  }

  const totalMins = logs.reduce((s, l) => s + l.minutesLogged, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="font-semibold text-text-primary">Work Log</span>
          {totalMins > 0 && <span className="ml-2 text-xs text-text-secondary">Total: {fmtMins(totalMins)}</span>}
        </div>
        <button onClick={openCreate} className="px-3 py-1.5 bg-primary text-white rounded text-sm font-medium hover:bg-primary-hover">
          + Log Work
        </button>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-text-secondary">No work logged yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-secondary text-left">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Logged by</th>
              <th className="pb-2 font-medium">Time</th>
              <th className="pb-2 font-medium">Note</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => {
              const canEdit = l.userId === user?.id || user?.role === 'admin';
              return (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4">{typeof l.logDate === 'string' ? l.logDate.slice(0, 10) : String(l.logDate)}</td>
                  <td className="py-2 pr-4 text-text-secondary">{l.userName}</td>
                  <td className="py-2 pr-4 font-medium">{fmtMins(l.minutesLogged)}</td>
                  <td className="py-2 pr-4 text-text-secondary">{l.note ?? '—'}</td>
                  <td className="py-2 text-right">
                    {canEdit && (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEdit(l)} className="text-xs text-primary hover:underline">Edit</button>
                        <button onClick={() => deleteLog.mutate(l.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit Work Log' : 'Log Work'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Date <span className="text-xs font-normal">(weekdays only)</span></label>
                <input type="date" value={logDate} onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 text-sm" required />
                {dateErr && <p className="text-xs text-red-500 mt-1">{dateErr}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Hours spent <span className="text-xs font-normal">(0.5–8, in 0.5 increments)</span></label>
                <input type="number" value={hours} onChange={(e) => setHours(e.target.value)} min="0.5" max="8" step="0.5"
                  className="w-full border border-border rounded px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Description <span className="text-xs font-normal">(optional)</span></label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                  className="w-full border border-border rounded px-3 py-2 text-sm resize-none" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-border rounded hover:bg-surface-hover">Cancel</button>
                <button type="submit" disabled={createLog.isPending || updateLog.isPending} className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50">
                  {editing ? 'Save' : 'Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
