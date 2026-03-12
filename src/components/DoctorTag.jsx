import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';

export const DoctorTag = ({ doctor, index, isError, uniqueId, isHighlighted }) => {
  return (
    <Draggable draggableId={uniqueId || doctor.id} index={index}>
      {(provided, snapshot) => {
        
        let roleGradient = '';
        switch (doctor.role) {
          case 'Fellow': roleGradient = 'linear-gradient(135deg, #ef4444, #b91c1c)'; break;
          case 'CR': roleGradient = 'linear-gradient(135deg, #f59e0b, #d97706)'; break;
          case 'R3': roleGradient = 'linear-gradient(135deg, #8b5cf6, #6d28d9)'; break;
          case 'R2': roleGradient = 'linear-gradient(135deg, #0ea5e9, #0369a1)'; break;
          case 'R1': roleGradient = 'linear-gradient(135deg, #3b82f6, #1d4ed8)'; break;
          case 'PGY': roleGradient = 'linear-gradient(135deg, #10b981, #059669)'; break;
          default: roleGradient = 'linear-gradient(135deg, #6b7280, #4b5563)';
        }

        return (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`doc-tag ${snapshot.isDragging ? 'is-dragging' : ''}`}
            style={{
              ...provided.draggableProps.style,
              background: isError ? 'var(--error)' : roleGradient,
              padding: '0.25rem 0.5rem',
              boxShadow: isHighlighted ? '0 0 0 2px white, 0 0 12px var(--accent-light)' : 'none',
              zIndex: isHighlighted ? 10 : 1,
              transition: 'box-shadow 0.2s ease',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <GripVertical size={14} opacity={0.5} style={{ marginLeft: '-4px' }}/>
              <span style={{ fontSize: '0.7rem', opacity: 0.9, fontWeight: 'normal', marginRight: '2px' }}>{doctor.role}</span>
              {doctor.name}
            </span>
          </div>
        )
      }}
    </Draggable>
  );
};
