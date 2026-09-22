/**
 * A student name in the /access lists. When the row is linked to a student
 * record the name is tappable and opens the student card; otherwise it is plain
 * text (the payment has not been matched to a student yet).
 */
import React from 'react';

interface Props {
  name?: string | null;
  studentId?: string | null;
  onOpen: (studentId: string) => void;
  className?: string;
}

export const StudentNameButton: React.FC<Props> = ({ name, studentId, onOpen, className }) => {
  const label = name || '—';
  if (!studentId) return <span className={className}>{label}</span>;
  return (
    <button
      type="button"
      className={`text-left underline-offset-2 hover:underline text-primary ${className || ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(studentId);
      }}
      title="View student details"
    >
      {label}
    </button>
  );
};

export default StudentNameButton;
