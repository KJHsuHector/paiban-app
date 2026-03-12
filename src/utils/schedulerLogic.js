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
      dateObj: date,
      dateStr: format(date, 'yyyy-MM-dd'),
      isWeekend: date.getDay() === 0 || date.getDay() === 6
    };
  });
  
  // Rule: Every R or CR gets one weekend (Fri, Sat, Sun) off.
  // We identify all Friday-Sunday blocks in the month.
  const weekendBlocks = [];
  let currentBlock = [];
  daysInMonth.forEach(({ dateObj, dateStr }) => {
    const day = dateObj.getDay();
    if (day === 5 || day === 6 || day === 0) {
      currentBlock.push(dateStr);
      if (day === 0 || dateObj.getTime() === monthEnd.getTime()) {
        weekendBlocks.push([...currentBlock]);
        currentBlock = [];
      }
    } else {
      if (currentBlock.length > 0) {
        weekendBlocks.push([...currentBlock]);
        currentBlock = [];
      }
    }
  });

  // Deep copy unavailability so we can inject our forced weekend offs
  const tempUnavailability = JSON.parse(JSON.stringify(unavailability));
  
  const rAndCrDocs = doctors.filter(doc => ['R1', 'R2', 'R3', 'CR'].includes(doc.role));
  if (weekendBlocks.length > 0 && rAndCrDocs.length > 0) {
    // Sort predictability
    rAndCrDocs.sort((a, b) => a.id.localeCompare(b.id));
    
    // Distribute weekends evenly
    rAndCrDocs.forEach((doc, index) => {
      const blockIndex = index % weekendBlocks.length;
      const datesToBlock = weekendBlocks[blockIndex];
      
      if (!tempUnavailability[doc.id]) {
        tempUnavailability[doc.id] = [];
      }
      
      datesToBlock.forEach(dateStr => {
        if (!tempUnavailability[doc.id].includes(dateStr)) {
          tempUnavailability[doc.id].push(dateStr);
        }
      });
    });
  }

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
    let score = (currentCount - target) * 1000;
    
    if (lastShiftDate[doc.id]) {
      const daysGap = differenceInDays(new Date(dateStr), new Date(lastShiftDate[doc.id]));
      if (daysGap === 2) {
         score += 100; // Slight penalty for 2 day gap compared to > 2 days
      } else {
         score -= daysGap * 10;
      }
    } else {
      score -= 500; // Never worked this month, early priority
    }
    
    return score;
  };

  const getCandidatesForSlot = (dateStr, isWeekend, allowedRoles, assignedIdsOfDay) => {
    const availableDocs = doctors.filter(doc => {
      if (!allowedRoles.includes(doc.role)) return false;
      
      if (assignedIdsOfDay.has(doc.id)) return false;
      
      // MUST: Blocked dates must be honored
      const blockedDays = tempUnavailability[doc.id] || [];
      if (blockedDays.includes(dateStr)) return false;
      
      // MUST: Strict Quotas
      const currentCount = isWeekend ? shiftsCount.we[doc.id] : shiftsCount.wd[doc.id];
      const target = isWeekend ? doc.targetWeekend : doc.targetWeekday;
      if (currentCount >= target) return false;
      
      // MUST: No consecutive shifts (at least 1 day apart)
      if (lastShiftDate[doc.id]) {
        const daysGap = differenceInDays(new Date(dateStr), new Date(lastShiftDate[doc.id]));
        if (daysGap <= 1) return false;
      }
      
      return true;
    });

    // Score and sort
    availableDocs.sort((a, b) => getCandidateScore(a, dateStr, isWeekend) - getCandidateScore(b, dateStr, isWeekend));
    return availableDocs;
  };

  daysInMonth.forEach(({ dateStr, isWeekend }) => {
    const daySchedule = { chief: null, delivery: null, ward: null };
    const assignedIds = new Set();

    const assignSlot = (slotName, primaryRoles, fallbackRoles = []) => {
      let candidates = getCandidatesForSlot(dateStr, isWeekend, primaryRoles, assignedIds);
      
      if (candidates.length === 0 && fallbackRoles.length > 0) {
        candidates = getCandidatesForSlot(dateStr, isWeekend, fallbackRoles, assignedIds);
      }
      
      if (candidates.length > 0) {
        let picked = candidates[0];
        daySchedule[slotName] = { ...picked };
        
        assignedIds.add(picked.id);
        if (isWeekend) shiftsCount.we[picked.id]++;
        else shiftsCount.wd[picked.id]++;
        lastShiftDate[picked.id] = dateStr;
      }
    };

    // 1. Chief Slot: Fellow -> CR
    assignSlot('chief', ['Fellow'], ['CR']);
    
    // 2. Delivery Slot: R1/R2/R3 -> CR
    assignSlot('delivery', ['R1', 'R2', 'R3'], ['CR']);
    
    // 3. Ward Slot: PGY -> R1
    // MUST: Dual Coverage override. If delivery is R2 or R3, they concurrently cover ward.
    if (daySchedule.delivery && ['R2', 'R3'].includes(daySchedule.delivery.role)) {
      daySchedule.ward = { ...daySchedule.delivery };
      // Does not increment shiftsCount again
    } else {
      assignSlot('ward', ['PGY'], ['R1']);
    }

    newSchedule[dateStr] = daySchedule;
  });

  return newSchedule;
};
