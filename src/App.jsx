import React, { useState } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { useScheduleData } from './hooks/useScheduleData';
import { SetupPanel } from './components/SetupPanel';
import { CalendarGrid } from './components/CalendarGrid';

function App() {
  const {
    doctors,
    unavailability,
    targetMonth,
    schedule,
    addDoctor,
    editDoctor,
    removeDoctor,
    toggleUnavailability,
    setTargetMonth,
    setSchedule,
    handleDragEnd
  } = useScheduleData();

  // Track the currently selected doctor for editing their unavailability
  const [selectedDocId, setSelectedDocId] = useState(null);

  // We slightly modify SetupPanel's props to handle selection state here
  // Actually, SetupPanel manages its own selection state in the current code, but let's centralize if needed.
  // Oh, wait, I put `selectedDocId` inside SetupPanel state. Let me pass it up or keep it here.
  // Let's pass it from App since Calendar needs to know the selected doc to highlight/toggle blocked dates.

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="layout-container">
        <SetupPanel 
          doctors={doctors}
          unavailability={unavailability}
          targetMonth={targetMonth}
          addDoctor={addDoctor}
          editDoctor={editDoctor}
          removeDoctor={removeDoctor}
          toggleUnavailability={toggleUnavailability}
          setTargetMonth={setTargetMonth}
          schedule={schedule}
          setSchedule={setSchedule}
          selectedDocId={selectedDocId}
          setSelectedDocId={setSelectedDocId}
        />
        <div className="main-content">
          <CalendarGrid 
            targetMonth={targetMonth}
            schedule={schedule}
            unavailability={unavailability}
            selectedDocId={selectedDocId}
            toggleUnavailability={toggleUnavailability}
          />
        </div>
      </div>
    </DragDropContext>
  );
}

export default App;
