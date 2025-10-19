import React from 'react';

export interface StatusBadgeProps {
  status: 'shift-started' | 'starts-in-2h' | 'starts-in-1d' | 'upcoming';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const statusStyles = {
  'shift-started': {
    bg: '#E7F4E6',
    border: '#C9E8C5',
    text: '#39982D',
  },
  'starts-in-2h': {
    bg: '#FFEAEC',
    border: '#FFCACD',
    text: '#DC1515',
  },
  'starts-in-1d': {
    bg: '#FFF3E0',
    border: '#FFE0B2',
    text: '#EF6C00',
  },
  'upcoming': {
    bg: '#E4F2FF',
    border: '#BFDEFF',
    text: '#4784FF',
  },
};

export function StatusBadge({ status, icon, children }: StatusBadgeProps) {
  const styles = statusStyles[status];

  return (
    <div
      className="inline-flex items-center gap-2 px-2 py-1 rounded-lg border text-xs font-bold leading-[140%]"
      style={{
        backgroundColor: styles.bg,
        borderColor: styles.border,
        color: styles.text,
      }}
    >
      {icon}
      {children}
    </div>
  );
}
