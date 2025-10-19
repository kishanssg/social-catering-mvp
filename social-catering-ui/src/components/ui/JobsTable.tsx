import React from 'react';
import { StatusBadge } from './StatusBadge';

export interface Job {
  id: string;
  skills: string;
  venueLocation: string;
  shiftDate: string;
  shiftTime: string;
  staffing: string;
  status: 'shift-started' | 'starts-in-2h' | 'starts-in-1d' | 'upcoming';
  statusIcon?: React.ReactNode;
  statusText: string;
}

interface JobsTableProps {
  jobs: Job[];
  onJobClick?: (job: Job) => void;
  className?: string;
}

const statusIcons = {
  'shift-started': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M13.8352 2.47703C14.2494 2.47703 14.5852 2.81282 14.5852 3.22703V6.40901C14.5852 6.82322 14.2494 7.15901 13.8352 7.15901H10.6532C10.239 7.15901 9.90325 6.82322 9.90325 6.40901C9.90325 5.9948 10.239 5.65901 10.6532 5.65901H12.0246L11.1836 4.81802C9.42622 3.06066 6.57698 3.06066 4.81962 4.81802C4.53385 5.10379 4.2952 5.41752 4.10301 5.74996C3.89569 6.10855 3.43693 6.23119 3.07833 6.02388C2.71973 5.81656 2.59709 5.3578 2.8044 4.9992C3.06147 4.55455 3.37988 4.13644 3.75896 3.75736C6.1021 1.41421 9.90109 1.41421 12.2442 3.75736L13.0852 4.59835V3.22703C13.0852 2.81282 13.421 2.47703 13.8352 2.47703ZM12.9247 9.97662C13.2832 10.184 13.4058 10.6427 13.1985 11.0013C12.9415 11.4458 12.6232 11.8637 12.2442 12.2426C9.90109 14.5858 6.1021 14.5858 3.75896 12.2426L2.91797 11.4017V12.773C2.91797 13.1872 2.58218 13.523 2.16797 13.523C1.75376 13.523 1.41797 13.1872 1.41797 12.773L1.41797 9.59099C1.41797 9.17678 1.75376 8.84099 2.16797 8.84099H5.34995C5.76416 8.84099 6.09995 9.17678 6.09995 9.59099C6.09995 10.0052 5.76416 10.341 5.34995 10.341H3.97863L4.81962 11.182C6.57698 12.9393 9.42622 12.9393 11.1836 11.182C11.4692 10.8963 11.7078 10.5827 11.9 10.2504C12.1073 9.89186 12.5661 9.76927 12.9247 9.97662Z" fill="#45A735"/>
    </svg>
  ),
  'starts-in-2h': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M6.70013 2.25C7.27749 1.25 8.72086 1.25 9.29821 2.25L14.4944 11.25C15.0717 12.25 14.35 13.5 13.1953 13.5H2.80302C1.64832 13.5 0.926631 12.25 1.50398 11.25L6.70013 2.25ZM7.99917 4C8.41338 4 8.74917 4.33579 8.74917 4.75V7.75C8.74917 8.16421 8.41338 8.5 7.99917 8.5C7.58496 8.5 7.24917 8.16421 7.24917 7.75V4.75C7.24917 4.33579 7.58496 4 7.99917 4ZM7.99917 12C8.55146 12 8.99917 11.5523 8.99917 11C8.99917 10.4477 8.55146 10 7.99917 10C7.44689 10 6.99917 10.4477 6.99917 11C6.99917 11.5523 7.44689 12 7.99917 12Z" fill="#F8473C"/>
    </svg>
  ),
  'starts-in-1d': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1C4.13401 1 1 4.13401 1 8C1 11.866 4.13401 15 8 15ZM8 4C8.41421 4 8.75 4.33579 8.75 4.75V7.75C8.75 8.16421 8.41421 8.5 8 8.5C7.58579 8.5 7.25 8.16421 7.25 7.75V4.75C7.25 4.33579 7.58579 4 8 4ZM8 12C8.55228 12 9 11.5523 9 11C9 10.4477 8.55228 10 8 10C7.44772 10 7 10.4477 7 11C7 11.5523 7.44772 12 8 12Z" fill="#FF9800"/>
    </svg>
  ),
  'upcoming': null,
};

export function JobsTable({ jobs, onJobClick, className = '' }: JobsTableProps) {
  return (
    <div className={`bg-white rounded-lg ${className}`}>
      {/* Header */}
      <div 
        className="grid grid-cols-[200px_1fr_160px_160px_80px_140px_20px] gap-4 pr-3 border-b"
        style={{ borderColor: '#EAEAEA' }}
      >
        <div className="flex items-center px-4 py-3">
          <span 
            className="font-manrope text-sm font-bold leading-[140%] tracking-[0.28px]"
            style={{ color: '#292826' }}
          >
            Skills
          </span>
        </div>
        <div className="flex items-center px-4 py-3">
          <span 
            className="font-manrope text-sm font-bold leading-[140%] tracking-[0.28px]"
            style={{ color: '#292826' }}
          >
            Venue Location
          </span>
        </div>
        <div className="flex items-center px-4 py-3">
          <span
            className="font-manrope text-sm font-bold leading-[140%] tracking-[0.28px]"
            style={{ color: '#292826' }}
          >
            Shift Date
          </span>
        </div>
        <div className="flex items-center px-4 py-3">
          <span
            className="font-manrope text-sm font-bold leading-[140%] tracking-[0.28px]"
            style={{ color: '#292826' }}
          >
            Shift Time
          </span>
        </div>
        <div className="flex items-center justify-end px-4 py-3">
          <span 
            className="font-manrope text-sm font-bold leading-[140%] tracking-[0.28px]"
            style={{ color: '#292826' }}
          >
            Staffing
          </span>
        </div>
        <div className="flex items-center justify-end px-4 py-3">
          <span 
            className="font-manrope text-sm font-bold leading-[140%] tracking-[0.28px]"
            style={{ color: '#292826' }}
          >
            Status
          </span>
        </div>
        <div className="flex items-center justify-center px-2 py-3" />
      </div>

      {/* Scroll container */}
      <div className="flex flex-col">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="grid grid-cols-[200px_1fr_160px_160px_80px_140px_20px] gap-4 pr-3 border-b cursor-pointer hover:bg-gray-50 transition-colors"
            style={{ borderColor: '#F3F3F3', height: '68px' }}
            onClick={() => onJobClick?.(job)}
          >
            {/* Skills */}
            <div className="flex items-center px-4 py-3">
              <span 
                className="font-manrope text-base font-normal leading-[140%]"
                style={{ color: '#2F2C26' }}
              >
                {job.skills}
              </span>
            </div>

            {/* Venue Location */}
            <div className="flex items-center px-4 py-3">
              <span 
                className="font-manrope text-base font-normal leading-[140%]"
                style={{ color: '#2F2C26' }}
              >
                {job.venueLocation}
              </span>
            </div>

            {/* Shift Date */}
            <div className="flex items-center px-4 py-3">
              <span 
                className="font-manrope text-base font-normal leading-[140%]"
                style={{ color: '#2F2C26' }}
              >
                {job.shiftDate}
              </span>
            </div>

            {/* Shift Time */}
            <div className="flex items-center px-4 py-3">
              <span 
                className="font-manrope text-base font-normal leading-[140%]"
                style={{ color: '#2F2C26' }}
              >
                {job.shiftTime}
              </span>
            </div>

            {/* Staffing */}
            <div className="flex justify-end items-center px-4 py-3">
              <span 
                className="font-manrope text-base font-normal leading-[140%]"
                style={{ color: '#2F2C26' }}
              >
                {job.staffing}
              </span>
            </div>

            {/* Status */}
            <div className="flex justify-end items-center px-4 py-3">
              {statusIcons[job.status] && statusIcons[job.status]}
              <StatusBadge status={job.status}>
                {job.statusText}
              </StatusBadge>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center px-2 py-3">
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 20 20" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0"
              >
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M8.21967 5.21967C8.51256 4.92678 8.98744 4.92678 9.28033 5.21967L13.5303 9.46967C13.8232 9.76256 13.8232 10.2374 13.5303 10.5303L9.28033 14.7803C8.98744 15.0732 8.51256 15.0732 8.21967 14.7803C7.92678 14.4874 7.92678 14.0126 8.21967 13.7197L11.9393 10L8.21967 6.28033C7.92678 5.98744 7.92678 5.51256 8.21967 5.21967Z" 
                  fill="#292826"
                />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
