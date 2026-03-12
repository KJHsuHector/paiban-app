import React from 'react';
import { eachDayOfInterval, startOfMonth, endOfMonth, endOfWeek, startOfWeek, format, isSameMonth, isToday } from 'date-fns';
import { Droppable } from '@hello-pangea/dnd';
import { DoctorTag } from './DoctorTag';
import { Ban, Stethoscope, Baby, Bed } from 'lucide-react';

// Reusable Slot Component to keep the grid clean
const DailySlot = ({ dateStr, slotId, label, Icon, doctor, unavailability }) => {
  const droppableId = `${dateStr}_${slotId}`;
  return (
    <Droppable droppableId={droppableId}>
      {(provided, snapshot) => {
        const isError = doctor && (unavailability[doctor.id] || []).includes(dateStr);
        return (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`daily-slot ${snapshot.isDraggingOver ? 'drag-over-slot' : ''}`}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '4px',
              padding: '4px',
              background: 'rgba(0,0,0,0.1)',
              borderRadius: '6px',
              minHeight: '40px'
            }}
          >
            <div className="text-muted" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Icon size={12} /> {label}
            </div>
            {doctor ? (
              <DoctorTag 
                doctor={doctor} 
                index={0} 
                isError={isError} 
                uniqueId={`${dateStr}_${slotId}_${doctor.id}`} 
              />
            ) : (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '4px' }}>Empty</div>
            )}
            {provided.placeholder}
          </div>
        );
      }}
    </Droppable>
  );
};

export const CalendarGrid = ({ targetMonth, schedule, unavailability, selectedDocId, toggleUnavailability }) => {
  const monthStart = startOfMonth(new Date(targetMonth + '-01'));
  const monthEnd = endOfMonth(monthStart);
  
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="glass-panel calendar-wrapper">
      <div className="calendar-header">
        {weekDays.map(day => <div key={day}>{day}</div>)}
      </div>
      
      <div className="calendar-grid">
        {calendarDays.map(date => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const isCurrentMonth = isSameMonth(date, monthStart);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const isCurrentToday = isToday(date);
          
          const daySchedule = schedule[dateStr] || { chief: null, delivery: null, ward: null };
          const isSelectedDocBlocked = selectedDocId && (unavailability[selectedDocId] || []).includes(dateStr);
          
          const classes = ['calendar-cell'];
          if (isWeekend) classes.push('weekend');
          if (isCurrentToday) classes.push('today');
          if (isSelectedDocBlocked) classes.push('error-state');

          return (
            <div
              key={dateStr}
              className={classes.join(' ')}
              style={{ opacity: isCurrentMonth ? 1 : 0.4, minHeight: '180px' }}
              onClick={() => {
                if (selectedDocId && isCurrentMonth) {
                  toggleUnavailability(selectedDocId, dateStr);
                }
              }}
            >
              <div className={`cell-date ${isCurrentMonth ? 'current-month' : ''}`} style={{ marginBottom: '4px' }}>
                <span>{format(date, 'd')}</span>
                {isSelectedDocBlocked && <Ban size={14} color="var(--error)" />}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexGrow: 1 }}>
                <DailySlot 
                  dateStr={dateStr} slotId="chief" label="總值班" 
                  Icon={Stethoscope} doctor={daySchedule.chief} unavailability={unavailability}
                />
                <DailySlot 
                  dateStr={dateStr} slotId="delivery" label="產房" 
                  Icon={Baby} doctor={daySchedule.delivery} unavailability={unavailability}
                />
                <DailySlot 
                  dateStr={dateStr} slotId="ward" label="病房" 
                  Icon={Bed} doctor={daySchedule.ward} unavailability={unavailability}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
