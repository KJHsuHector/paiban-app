import { useState, useEffect } from 'react';
import { format, startOfMonth } from 'date-fns';

const LS_KEY = 'paiban_app_data';

export const useScheduleData = () => {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error loading schedule data:", e);
    }
    // Default initial state
    return {
      doctors: [], // Array of objects: { id, name, role, targetWeekday: 0, targetWeekend: 0 }
      unavailability: {}, // map of docId -> [array of date strings YYYY-MM-DD]
      targetMonth: format(startOfMonth(new Date()), 'yyyy-MM'),
      // map of date YYYY-MM-DD -> { chief: docObj, delivery: docObj, ward: docObj }
      schedule: {}, 
    };
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }, [data]);

  const addDoctor = (name, role = 'PGY', targetWeekday = 0, targetWeekend = 0) => {
    if (!name.trim()) return;
    setData(prev => {
      // Prevent duplicates by name
      if (prev.doctors.some(d => d.name === name)) return prev;
      return {
        ...prev,
        doctors: [...prev.doctors, { 
          id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, 
          name, 
          role, 
          targetWeekday: parseInt(targetWeekday, 10) || 0, 
          targetWeekend: parseInt(targetWeekend, 10) || 0 
        }]
      };
    });
  };

  const removeDoctor = (id) => {
    setData(prev => {
      // Clean up unavailability related to this doctor
      const newUnavail = { ...prev.unavailability };
      delete newUnavail[id];
      
      // Clean up schedule (remove doc from any slot)
      const newSchedule = {};
      Object.keys(prev.schedule).forEach(date => {
        const daySlots = { ...prev.schedule[date] };
        if (daySlots.chief?.id === id) daySlots.chief = null;
        if (daySlots.delivery?.id === id) daySlots.delivery = null;
        if (daySlots.ward?.id === id) daySlots.ward = null;
        newSchedule[date] = daySlots;
      });

      return {
        ...prev,
        doctors: prev.doctors.filter(d => d.id !== id),
        unavailability: newUnavail,
        schedule: newSchedule
      };
    });
  };

  const toggleUnavailability = (docId, dateStr) => {
    setData(prev => {
      const currentBlocked = prev.unavailability[docId] || [];
      const newBlocked = currentBlocked.includes(dateStr)
        ? currentBlocked.filter(d => d !== dateStr) // remove
        : [...currentBlocked, dateStr]; // add
      
      return {
        ...prev,
        unavailability: { ...prev.unavailability, [docId]: newBlocked }
      };
    });
  };

  const setTargetMonth = (monthStr) => {
    setData(prev => ({ ...prev, targetMonth: monthStr }));
  };

  const setSchedule = (newSchedule) => {
    setData(prev => ({ ...prev, schedule: newSchedule }));
  };

  // Drag and Drop Update Logic
  const handleDragEnd = (result) => {
    if (!result.destination) return; 

    // source/dest format: "YYYY-MM-DD-slotName" or from an unscheduled list if we add one later
    const sourceString = result.source.droppableId;
    const destString = result.destination.droppableId;
    
    // Unchanged position
    if (sourceString === destString) return;

    // Parse the droppableId (e.g., "2026-03-05-chief")
    const [srcDateStr, srcSlotName] = sourceString.split('-'); // this won't work well if date has hyphens.
    // Let's use string split properly
    const srcParts = sourceString.split('_'); // using underscore: "2026-03-05_chief"
    const destParts = destString.split('_');

    if (srcParts.length !== 2 || destParts.length !== 2) return;

    const [srcDate, srcSlot] = srcParts;
    const [destDate, destSlot] = destParts;

    setData(prev => {
      const newSchedule = { ...prev.schedule };
      
      const sourceDay = newSchedule[srcDate] || { chief: null, delivery: null, ward: null };
      const destDay = newSchedule[destDate] || { chief: null, delivery: null, ward: null };
      
      const movedDoctor = sourceDay[srcSlot];
      if (!movedDoctor) return prev;

      // Swap logic: if destination is already occupied, the doctor there moves to the source
      const existingDestDoctor = destDay[destSlot];

      // Update source and destination days
      const updatedSourceDay = { ...sourceDay, [srcSlot]: existingDestDoctor || null };
      const updatedDestDay = { ...destDay, [destSlot]: movedDoctor };

      newSchedule[srcDate] = updatedSourceDay;
      newSchedule[destDate] = updatedDestDay;

      return { ...prev, schedule: newSchedule };
    });
  };

  return {
    ...data,
    addDoctor,
    removeDoctor,
    toggleUnavailability,
    setTargetMonth,
    setSchedule,
    handleDragEnd
  };
};
