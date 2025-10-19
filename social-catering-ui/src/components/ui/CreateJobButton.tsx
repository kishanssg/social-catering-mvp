import React from 'react';

interface CreateJobButtonProps {
  onClick: () => void;
  className?: string;
}

export function CreateJobButton({ onClick, className = '' }: CreateJobButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2.5 px-3 py-2 rounded-lg font-manrope text-sm font-bold leading-[140%] text-white transition-colors hover:opacity-90 ${className}`}
      style={{ backgroundColor: '#3A869D' }}
    >
      Create New Job
    </button>
  );
}
