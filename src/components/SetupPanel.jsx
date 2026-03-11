import React, { useState } from 'react';
import { format } from 'date-fns';
import { Plus, X, Calendar as CalendarIcon, Wand2 } from 'lucide-react';
import { generateSchedule } from '../utils/schedulerLogic';

export const SetupPanel = ({
  doctors,
  unavailability,
  targetMonth,
  addDoctor,
  removeDoctor,
  toggleUnavailability,
  setTargetMonth,
  setSchedule,
  selectedDocId,
  setSelectedDocId
}) => {
  const [newDocName, setNewDocName] = useState('');
  const [newDocRole, setNewDocRole] = useState('PGY');
  const [targetWd, setTargetWd] = useState(0);
  const [targetWe, setTargetWe] = useState(0);

  const handleAddDoctor = (e) => {
    e.preventDefault();
    if (newDocName.trim()) {
      addDoctor(newDocName.trim(), newDocRole, targetWd, targetWe);
      setNewDocName('');
      setTargetWd(0);
      setTargetWe(0);
      // Keep role same for rapid entry
    }
  };

  const handleAutoSchedule = () => {
    const newSchedule = generateSchedule(doctors, unavailability, targetMonth);
    setSchedule(newSchedule);
  };

  return (
    <div className="glass sidebar">
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 className="title-gradient" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Paiban Pro</h2>
        <p className="text-muted" style={{ fontSize: '0.875rem' }}>Hospital Shift Scheduler</p>
      </div>

      {/* Target Month */}
      <div className="glass-panel" style={{ padding: '1rem' }}>
        <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CalendarIcon size={16} /> Schedule Month
        </label>
        <input 
          type="month" 
          className="glass-input" 
          style={{ width: '100%' }}
          value={targetMonth}
          onChange={(e) => setTargetMonth(e.target.value)}
        />
      </div>

      {/* Doctor List */}
      <div className="glass-panel" style={{ padding: '1rem', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <label className="input-label">Add Doctor</label>
        <form onSubmit={handleAddDoctor} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              className="glass-input" 
              placeholder="Name (e.g. 陳)" 
              maxLength={3}
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              style={{ flexGrow: 1 }}
              required
            />
            <select 
              className="glass-input" 
              value={newDocRole} 
              onChange={(e) => setNewDocRole(e.target.value)}
              style={{ minWidth: '80px', padding: '0.5rem' }}
            >
              <option value="PGY">PGY</option>
              <option value="R">R</option>
              <option value="CR">CR</option>
              <option value="Fellow">Fellow</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label className="text-muted" style={{ fontSize: '0.8rem', width: '60px' }}>Target</label>
            <input 
              type="number" 
              min="0"
              className="glass-input" 
              placeholder="Wd" 
              title="Weekday Shifts"
              value={targetWd}
              onChange={(e) => setTargetWd(e.target.value)}
              style={{ width: '40%' }}
            />
            <input 
              type="number" 
              min="0"
              className="glass-input" 
              placeholder="We" 
              title="Weekend Shifts"
              value={targetWe}
              onChange={(e) => setTargetWe(e.target.value)}
              style={{ width: '40%' }}
            />
            <button type="submit" className="btn" style={{ padding: '0.5rem' }} disabled={!newDocName.trim()}>
              <Plus size={20} />
            </button>
          </div>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1, overflowY: 'auto' }}>
          {doctors.map(doc => (
            <div 
              key={doc.id} 
              className={`calendar-cell ${selectedDocId === doc.id ? 'drag-over' : ''}`}
              style={{ minHeight: 'auto', padding: '0.75rem', cursor: 'pointer', flexDirection: 'column', gap: '0.25rem' }}
              onClick={() => setSelectedDocId(selectedDocId === doc.id ? null : doc.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className={`role-badge role-${doc.role.toLowerCase()}`}>{doc.role}</div>
                  <span style={{ fontWeight: '600' }}>{doc.name}</span>
                </div>
                <button 
                  className="btn-danger" 
                  style={{ padding: '0.25rem', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); removeDoctor(doc.id); }}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="text-muted" style={{ fontSize: '0.8rem', display: 'flex', gap: '1rem' }}>
                <span>Wd: {doc.targetWeekday}</span>
                <span>We: {doc.targetWeekend}</span>
              </div>
            </div>
          ))}
          {doctors.length === 0 && (
            <div className="text-muted" style={{ fontSize: '0.85rem', textAlign: 'center', marginTop: '1rem' }}>
              Add a doctor to start scheduling.
            </div>
          )}
        </div>
      </div>

      {selectedDocId && (
        <div className="glass-panel" style={{ padding: '1rem', border: '1px solid var(--accent)' }}>
          <label className="input-label" style={{ color: 'var(--accent-light)' }}>
            Editing Unavailability: {doctors.find(d => d.id === selectedDocId)?.name}
          </label>
          <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Click on the calendar days on the right to toggle blocked dates.
          </p>
        </div>
      )}

      <button 
        className="btn" 
        style={{ width: '100%', padding: '1rem' }}
        onClick={handleAutoSchedule}
        disabled={doctors.length === 0}
      >
        <Wand2 size={20} /> Generate Schedule
      </button>
    </div>
  );
};
