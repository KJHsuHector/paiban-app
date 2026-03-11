import { eachDayOfInterval, startOfMonth, endOfMonth, format, differenceInDays } from 'date-fns';

/**
 * Auto-generates a schedule for the given month with advanced hierarchy.
 * Target: 3 slots per day (chief, delivery, ward).
 * Roles priorities:
 * - chief (總值): Fellow -> CR
 * - delivery (產房): R -> CR
 * - ward (病房): PGY -> R
 */
export const generateSchedule = (doctors, unavailability, targetMonth) => {
  if (!doctors || doctors.length === 0) return {};

  const monthStart = startOfMonth(new Date(targetMonth + '-01'));
  const monthEnd = endOfMonth(monthStart);
  
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd }).map(date => {
    return {
      dateStr: format(date, 'yyyy-MM-dd'),
      isWeekend: date.getDay() === 0 || date.getDay() === 6
    };
  });
  
  const newSchedule = {};
  
  // Initialize tracking
  const shiftsCount = { wd: {}, we: {} };
  const lastShiftDate = {};
  doctors.forEach(doc => {
    shiftsCount.wd[doc.id] = 0;
    shiftsCount.we[doc.id] = 0;
    lastShiftDate[doc.id] = null;
  });

  // Calculate score for picking a candidate
  const getCandidateScore = (doc, dateStr, isWeekend) => {
    const currentCount = isWeekend ? shiftsCount.we[doc.id] : shiftsCount.wd[doc.id];
    const target = isWeekend ? doc.targetWeekend : doc.targetWeekday;
    
    // Base score based on how far they are from target (negative = good, need shifts)
    let score = (currentCount - target) * 100;
    
    if (lastShiftDate[doc.id]) {
      const daysSinceLastShift = differenceInDays(new Date(dateStr), new Date(lastShiftDate[doc.id]));
      
      if (daysSinceLastShift === 1) {
        score += 10000; // Heavily penalize consecutive days
      } else if (daysSinceLastShift === 2) {
        score += 500;  // Penalize 1 day gap
      } else {
        score -= daysSinceLastShift * 5; // Reward larger gaps
      }
    } else {
      score -= 50; // Never worked this month, early priority
    }
    
    return score;
  };

  const getCandidatesForSlot = (dateStr, isWeekend, allowedRoles, assignedIdsOfDay) => {
    const availableDocs = doctors.filter(doc => {
      // Must be allowed role
      if (!allowedRoles.includes(doc.role)) return false;
      // Must not be already assigned today
      if (assignedIdsOfDay.has(doc.id)) return false;
      // Must not be explicitly unavailable
      const blockedDays = unavailability[doc.id] || [];
      if (blockedDays.includes(dateStr)) return false;
      
      return true;
    });

    // Score and sort
    availableDocs.sort((a, b) => getCandidateScore(a, dateStr, isWeekend) - getCandidateScore(b, dateStr, isWeekend));
    return availableDocs;
  };

  daysInMonth.forEach(({ dateStr, isWeekend }) => {
    const daySchedule = { chief: null, delivery: null, ward: null };
    const assignedIds = new Set();

    const assignSlot = (slotName, allowedRoles) => {
      const candidates = getCandidatesForSlot(dateStr, isWeekend, allowedRoles, assignedIds);
      if (candidates.length > 0) {
        const picked = candidates[0];
        daySchedule[slotName] = { ...picked };
        assignedIds.add(picked.id);
        
        if (isWeekend) shiftsCount.we[picked.id]++;
        else shiftsCount.wd[picked.id]++;
        
        lastShiftDate[picked.id] = dateStr;
      }
    };

    // 1. Chief Slot (Fellow -> CR)
    assignSlot('chief', ['Fellow', 'CR']);
    
    // 2. Delivery Slot (R -> CR)
    assignSlot('delivery', ['R', 'CR']);
    
    // 3. Ward Slot (PGY -> R)
    assignSlot('ward', ['PGY', 'R']);

    newSchedule[dateStr] = daySchedule;
  });

  return newSchedule;
};
