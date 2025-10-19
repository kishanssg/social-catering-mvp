import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  totalItems, 
  itemsPerPage, 
  onPageChange,
  className = '' 
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div 
      className={`flex items-center justify-between px-4 py-3 border-t ${className}`}
      style={{ borderColor: 'rgba(41, 40, 38, 0.5)' }}
    >
      <div 
        className="font-manrope text-sm font-normal leading-[140%]"
        style={{ color: 'rgba(41, 40, 38, 0.5)' }}
      >
        Showing {startItem} to {endItem} of {totalItems} Jobs
      </div>
      
      <div 
        className="flex items-center rounded-lg border bg-white"
        style={{ borderColor: 'rgba(41, 40, 38, 0.5)' }}
      >
        
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`flex items-center justify-center w-9 h-9 font-manrope text-sm leading-[140%] transition-colors ${
              page === currentPage
                ? 'font-bold text-white'
                : 'font-normal border-r'
            }`}
            style={{
              backgroundColor: page === currentPage ? '#3A869D' : 'transparent',
              color: page === currentPage ? '#FFFFFF' : '#292826',
              borderRightColor: page !== currentPage ? '#EAEAEA' : 'transparent',
            }}
          >
            {page}
          </button>
        ))}
        
      </div>
    </div>
  );
}
