import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pagination } from '../../components/ui/Pagination';

interface Job {
  id: string;
  skills: string;
  venueLocation: string;
  shiftDate: string;
  shiftTime: string;
  staffing: string;
  status: 'shift-started' | 'starts-in-2h' | 'starts-in-1d' | 'upcoming';
  statusText: string;
}

const mockJobs: Job[] = [
  {
    id: '1',
    skills: 'Bartender',
    venueLocation: 'Capital City Country Club',
    shiftDate: 'Tue, Jul 15, 2025',
    shiftTime: '9:00 AM - 6:00 PM',
    staffing: '8 of 8',
    status: 'shift-started',
    statusText: 'Shift Started',
  },
  {
    id: '2',
    skills: 'Banquet Server/Runner',
    venueLocation: 'Capital City Country Club',
    shiftDate: 'Sat, Jul 19, 2025',
    shiftTime: '9:00 AM - 6:00 PM',
    staffing: '3 of 4',
    status: 'starts-in-2h',
    statusText: 'Starts in 2h',
  },
  {
    id: '3',
    skills: 'Banquet Server/Runner',
    venueLocation: 'AC Mariott Hotel',
    shiftDate: 'Fri, Jul 25, 2025',
    shiftTime: '9:00 AM - 6:00 PM',
    staffing: '2 of 5',
    status: 'starts-in-1d',
    statusText: 'Starts in 1d',
  },
  {
    id: '4',
    skills: 'Bartender',
    venueLocation: 'For The Table Private Spaces',
    shiftDate: 'Sun, Jul 28, 2025',
    shiftTime: '10:00 AM - 4:00 PM',
    staffing: '2 of 3',
    status: 'upcoming',
    statusText: 'Upcoming',
  },
  {
    id: '5',
    skills: 'Banquet Server/Runner',
    venueLocation: 'For The Table Private Spaces',
    shiftDate: 'Mon, Aug 01, 2025',
    shiftTime: '10:00 AM - 4:00 PM',
    staffing: '0 of 8',
    status: 'upcoming',
    statusText: 'Upcoming',
  },
  {
    id: '6',
    skills: 'Banquet Server/Runner',
    venueLocation: 'AC Mariott Hotel',
    shiftDate: 'Wed, Aug 05, 2025',
    shiftTime: '12 :00 PM - 11:00 PM',
    staffing: '0 of 4',
    status: 'upcoming',
    statusText: 'Upcoming',
  },
  {
    id: '7',
    skills: 'Bartender',
    venueLocation: 'Capital City Country Club',
    shiftDate: 'Thu, Aug 15, 2025',
    shiftTime: '9:00 AM - 6:00 PM',
    staffing: '4 of 12',
    status: 'upcoming',
    statusText: 'Upcoming',
  },
  {
    id: '8',
    skills: 'Banquet Server/Runner',
    venueLocation: 'AC Mariott Hotel',
    shiftDate: 'Sat, Aug 22, 2025',
    shiftTime: '9:00 AM - 6:00 PM',
    staffing: '1 of 3',
    status: 'upcoming',
    statusText: 'Upcoming',
  },
  {
    id: '9',
    skills: 'Banquet Server/Runner',
    venueLocation: 'Capital City Country Club',
    shiftDate: 'Fri, Aug 29, 2025',
    shiftTime: '10:00 AM - 4:00 PM',
    staffing: '0 of 1',
    status: 'upcoming',
    statusText: 'Upcoming',
  },
  {
    id: '10',
    skills: 'Bartender',
    venueLocation: 'For The Table Private Spaces',
    shiftDate: 'Tue, Aug 31, 2025',
    shiftTime: '9:00 AM - 6:00 PM',
    staffing: '0 of 6',
    status: 'upcoming',
    statusText: 'Upcoming',
  },
];

export default function JobsPageRefined() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ongoing');
  const [searchValue, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalItems = mockJobs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handleCreateNewJob = () => {
    navigate('/jobs/create');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'shift-started':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              fillRule="evenodd" 
              clipRule="evenodd" 
              d="M13.8352 2.47703C14.2494 2.47703 14.5852 2.81282 14.5852 3.22703V6.40901C14.5852 6.82322 14.2494 7.15901 13.8352 7.15901H10.6532C10.239 7.15901 9.90325 6.82322 9.90325 6.40901C9.90325 5.9948 10.239 5.65901 10.6532 5.65901H12.0246L11.1836 4.81802C9.42622 3.06066 6.57698 3.06066 4.81962 4.81802C4.53385 5.10379 4.2952 5.41752 4.10301 5.74996C3.89569 6.10855 3.43693 6.23119 3.07833 6.02388C2.71973 5.81656 2.59709 5.3578 2.8044 4.9992C3.06147 4.55455 3.37988 4.13644 3.75896 3.75736C6.1021 1.41421 9.90109 1.41421 12.2442 3.75736L13.0852 4.59835V3.22703C13.0852 2.81282 13.421 2.47703 13.8352 2.47703ZM12.9247 9.97662C13.2832 10.184 13.4058 10.6427 13.1985 11.0013C12.9415 11.4458 12.6232 11.8637 12.2442 12.2426C9.90109 14.5858 6.1021 14.5858 3.75896 12.2426L2.91797 11.4017V12.773C2.91797 13.1872 2.58218 13.523 2.16797 13.523C1.75376 13.523 1.41797 13.1872 1.41797 12.773L1.41797 9.59099C1.41797 9.17678 1.75376 8.84099 2.16797 8.84099H5.34995C5.76416 8.84099 6.09995 9.17678 6.09995 9.59099C6.09995 10.0052 5.76416 10.341 5.34995 10.341H3.97863L4.81962 11.182C6.57698 12.9393 9.42622 12.9393 11.1836 11.182C11.4692 10.8963 11.7078 10.5827 11.9 10.2504C12.1073 9.89186 12.5661 9.76927 12.9247 9.97662Z" 
              fill="#45A735"
            />
          </svg>
        );
      case 'starts-in-2h':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              fillRule="evenodd" 
              clipRule="evenodd" 
              d="M6.70013 2.25C7.27749 1.25 8.72086 1.25 9.29821 2.25L14.4944 11.25C15.0717 12.25 14.35 13.5 13.1953 13.5H2.80302C1.64832 13.5 0.926631 12.25 1.50398 11.25L6.70013 2.25ZM7.99917 4C8.41338 4 8.74917 4.33579 8.74917 4.75V7.75C8.74917 8.16421 8.41338 8.5 7.99917 8.5C7.58496 8.5 7.24917 8.16421 7.24917 7.75V4.75C7.24917 4.33579 7.58496 4 7.99917 4ZM7.99917 12C8.55146 12 8.99917 11.5523 8.99917 11C8.99917 10.4477 8.55146 10 7.99917 10C7.44689 10 6.99917 10.4477 6.99917 11C6.99917 11.5523 7.44689 12 7.99917 12Z" 
              fill="#F8473C"
            />
          </svg>
        );
      case 'starts-in-1d':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              fillRule="evenodd" 
              clipRule="evenodd" 
              d="M8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1C4.13401 1 1 4.13401 1 8C1 11.866 4.13401 15 8 15ZM8 4C8.41421 4 8.75 4.33579 8.75 4.75V7.75C8.75 8.16421 8.41421 8.5 8 8.5C7.58579 8.5 7.25 8.16421 7.25 7.75V4.75C7.25 4.33579 7.58579 4 8 4ZM8 12C8.55228 12 9 11.5523 9 11C9 10.4477 8.55228 10 8 10C7.44772 10 7 10.4477 7 11C7 11.5523 7.44772 12 8 12Z" 
              fill="#FF9800"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string, text: string) => {
    const baseClass = "flex items-center justify-center gap-2 px-2 py-1 rounded-lg border text-xs font-semibold font-manrope leading-[140%]";
    
    switch (status) {
      case 'shift-started':
        return (
          <div className={`${baseClass} border-primary-green-100 bg-primary-green-50 text-primary-green-600`}>
            {getStatusIcon(status)}
            <span>{text}</span>
          </div>
        );
      case 'starts-in-2h':
        return (
          <div className={`${baseClass} border-secondary-red-100 bg-secondary-red-50 text-secondary-red-700`}>
            {getStatusIcon(status)}
            <span>{text}</span>
          </div>
        );
      case 'starts-in-1d':
        return (
          <div className={`${baseClass} border-secondary-yellow-100 bg-secondary-yellow-50 text-secondary-yellow-800`}>
            {getStatusIcon(status)}
            <span>{text}</span>
          </div>
        );
      case 'upcoming':
        return (
          <div className={`${baseClass} border-secondary-blue-100 bg-secondary-blue-50 text-secondary-blue-600`}>
            <span>{text}</span>
          </div>
        );
      default:
        return <span>{text}</span>;
    }
  };

  return (
    <div className="flex h-screen bg-neutral-white">
      {/* Sidebar Navigation */}
      <div className="flex flex-col w-[261px] h-full border-r border-primary-color/10 bg-secondary-color" style={{ padding: '32px 24px', gap: '70px' }}>
        {/* Logo */}
        <div className="flex flex-col items-center gap-2.5 self-stretch">
          <img 
            src="https://api.builder.io/api/v1/image/assets/TEMP/d8ae28adfafcd027c6a2af6793beae5a60e94de9?width=297" 
            alt="Social Catering Logo" 
            className="w-[148.515px] h-10"
          />
        </div>

        {/* Active State Indicator */}
        <div className="w-1 h-7 bg-primary-color rounded-sm absolute left-0" style={{ top: '196px' }} />

        {/* Navigation Pages */}
        <div className="flex flex-col items-start gap-2 flex-1 self-stretch">
          {/* Dashboard */}
          <div className="flex items-center gap-3 px-0 py-2 self-stretch rounded-xl">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M3.75 6C3.75 4.75736 4.75736 3.75 6 3.75H8.25C9.49264 3.75 10.5 4.75736 10.5 6V8.25C10.5 9.49264 9.49264 10.5 8.25 10.5H6C4.75736 10.5 3.75 9.49264 3.75 8.25V6Z" 
                stroke="#292826" 
                strokeOpacity="0.5" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M3.75 15.75C3.75 14.5074 4.75736 13.5 6 13.5H8.25C9.49264 13.5 10.5 14.5074 10.5 15.75V18C10.5 19.2426 9.49264 20.25 8.25 20.25H6C4.75736 20.25 3.75 19.2426 3.75 18V15.75Z" 
                stroke="#292826" 
                strokeOpacity="0.5" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M13.5 6C13.5 4.75736 14.5074 3.75 15.75 3.75H18C19.2426 3.75 20.25 4.75736 20.25 6V8.25C20.25 9.49264 19.2426 10.5 18 10.5H15.75C14.5074 10.5 13.5 9.49264 13.5 8.25V6Z" 
                stroke="#292826" 
                strokeOpacity="0.5" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M13.5 15.75C13.5 14.5074 14.5074 13.5 15.75 13.5H18C19.2426 13.5 20.25 14.5074 20.25 15.75V18C20.25 19.2426 19.2426 20.25 18 20.25H15.75C14.5074 20.25 13.5 19.2426 13.5 18V15.75Z" 
                stroke="#292826" 
                strokeOpacity="0.5" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">Dashboard</span>
          </div>

          {/* Jobs - Active */}
          <div className="flex items-center gap-3 px-0 py-2 self-stretch">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                fillRule="evenodd" 
                clipRule="evenodd" 
                d="M7.5 5.25C7.5 3.59315 8.84315 2.25 10.5 2.25H13.5C15.1569 2.25 16.5 3.59315 16.5 5.25V5.45498C17.4325 5.54034 18.3574 5.65196 19.274 5.78912C20.7281 6.00668 21.75 7.27163 21.75 8.70569V11.7389C21.75 12.95 21.0164 14.0913 19.8137 14.4911C17.3566 15.308 14.7292 15.75 12 15.75C9.27087 15.75 6.64342 15.308 4.18627 14.4911C2.98364 14.0912 2.25 12.95 2.25 11.7389V8.70569C2.25 7.27163 3.27191 6.00668 4.72596 5.78912C5.6426 5.65196 6.56753 5.54034 7.5 5.45498V5.25ZM15 5.25V5.34082C14.0077 5.28056 13.0074 5.25 12 5.25C10.9927 5.25 9.99235 5.28056 9 5.34082V5.25C9 4.42157 9.67157 3.75 10.5 3.75H13.5C14.3284 3.75 15 4.42157 15 5.25ZM12 13.5C12.4142 13.5 12.75 13.1642 12.75 12.75C12.75 12.3358 12.4142 12 12 12C11.5858 12 11.25 12.3358 11.25 12.75C11.25 13.1642 11.5858 13.5 12 13.5Z" 
                fill="#292826"
              />
              <path 
                d="M3 18.4V15.6039C3.22304 15.7263 3.46097 15.8307 3.71303 15.9145C6.32087 16.7815 9.10801 17.25 12 17.25C14.892 17.25 17.6791 16.7815 20.287 15.9145C20.539 15.8307 20.777 15.7263 21 15.604V18.4C21 19.8519 19.9528 21.1275 18.4769 21.3234C16.3575 21.6048 14.1955 21.75 12 21.75C9.80447 21.75 7.64246 21.6048 5.52314 21.3234C4.04724 21.1275 3 19.8519 3 18.4Z" 
                fill="#292826"
              />
            </svg>
            <span className="text-sm font-bold font-manrope leading-[140%] text-font-primary">Jobs</span>
          </div>

          {/* Clients */}
          <div className="flex items-center gap-3 px-0 py-2 self-stretch">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M15.7508 6C15.7508 8.07107 14.0719 9.75 12.0008 9.75C9.92975 9.75 8.25082 8.07107 8.25082 6C8.25082 3.92893 9.92975 2.25 12.0008 2.25C14.0719 2.25 15.7508 3.92893 15.7508 6Z" 
                stroke="#292826" 
                strokeOpacity="0.5" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M4.50195 20.1182C4.57226 16.0369 7.90269 12.75 12.0008 12.75C16.099 12.75 19.4295 16.0371 19.4997 20.1185C17.2169 21.166 14.6772 21.75 12.0011 21.75C9.32481 21.75 6.78491 21.1659 4.50195 20.1182Z" 
                stroke="#292826" 
                strokeOpacity="0.5" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">Administrators & Roles</span>
          </div>

          {/* Workers */}
          <div className="flex items-center gap-3 px-0 py-2 self-stretch">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M17.9992 18.7191C18.2467 18.7396 18.4971 18.75 18.7498 18.75C19.7982 18.75 20.8046 18.5708 21.7403 18.2413C21.7466 18.1617 21.7498 18.0812 21.7498 18C21.7498 16.3431 20.4067 15 18.7498 15C18.1222 15 17.5396 15.1927 17.058 15.5222M17.9992 18.7191C17.9993 18.7294 17.9993 18.7397 17.9993 18.75C17.9993 18.975 17.9869 19.1971 17.9628 19.4156C16.206 20.4237 14.1699 21 11.9993 21C9.8286 21 7.79254 20.4237 6.03577 19.4156C6.01165 19.1971 5.99927 18.975 5.99927 18.75C5.99927 18.7397 5.99929 18.7295 5.99934 18.7192M17.9992 18.7191C17.9933 17.5426 17.6487 16.4461 17.058 15.5222M17.058 15.5222C15.9921 13.8552 14.1247 12.75 11.9993 12.75C9.87406 12.75 8.00692 13.8549 6.94096 15.5216M6.94096 15.5216C6.4595 15.1925 5.87723 15 5.25 15C3.59315 15 2.25 16.3431 2.25 18C2.25 18.0812 2.25323 18.1617 2.25956 18.2413C3.19519 18.5708 4.20167 18.75 5.25 18.75C5.50234 18.75 5.75226 18.7396 5.99934 18.7192M6.94096 15.5216C6.34997 16.4457 6.00525 17.5424 5.99934 18.7192M14.9993 6.75C14.9993 8.40685 13.6561 9.75 11.9993 9.75C10.3424 9.75 8.99927 8.40685 8.99927 6.75C8.99927 5.09315 10.3424 3.75 11.9993 3.75C13.6561 3.75 14.9993 5.09315 14.9993 6.75ZM20.9993 9.75C20.9993 10.9926 19.9919 12 18.7493 12C17.5066 12 16.4993 10.9926 16.4993 9.75C16.4993 8.50736 17.5066 7.5 18.7493 7.5C19.9919 7.5 20.9993 8.50736 20.9993 9.75ZM7.49927 9.75C7.49927 10.9926 6.49191 12 5.24927 12C4.00663 12 2.99927 10.9926 2.99927 9.75C2.99927 8.50736 4.00663 7.5 5.24927 7.5C6.49191 7.5 7.49927 8.50736 7.49927 9.75Z" 
                stroke="#292826" 
                strokeOpacity="0.5" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">Workers</span>
          </div>

          {/* Reports */}
          <div className="flex items-center gap-3 px-0 py-2 self-stretch">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M3 13.125C3 12.5037 3.50368 12 4.125 12H6.375C6.99632 12 7.5 12.5037 7.5 13.125V19.875C7.5 20.4963 6.99632 21 6.375 21H4.125C3.50368 21 3 20.4963 3 19.875V13.125Z" 
                stroke="#292826" 
                strokeOpacity="0.5" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M9.75 8.625C9.75 8.00368 10.2537 7.5 10.875 7.5H13.125C13.7463 7.5 14.25 8.00368 14.25 8.625V19.875C14.25 20.4963 13.7463 21 13.125 21H10.875C10.2537 21 9.75 20.4963 9.75 19.875V8.625Z" 
                stroke="#292826" 
                strokeOpacity="0.5" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M16.5 4.125C16.5 3.50368 17.0037 3 17.625 3H19.875C20.4963 3 21 3.50368 21 4.125V19.875C21 20.4963 20.4963 21 19.875 21H17.625C17.0037 21 16.5 20.4963 16.5 19.875V4.125Z" 
                stroke="#292826" 
                strokeOpacity="0.5" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">Reports</span>
          </div>

          {/* Venue */}
          <div className="flex items-center gap-3 px-0 py-2 self-stretch">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M9 6.75002V15M15 9.00002V17.25M15.5031 20.7485L20.3781 18.311C20.7592 18.1204 21 17.7309 21 17.3047V4.82031C21 3.98401 20.1199 3.44007 19.3719 3.81408L15.5031 5.74847C15.1864 5.90683 14.8136 5.90683 14.4969 5.74847L9.50312 3.25158C9.1864 3.09322 8.8136 3.09322 8.49688 3.25158L3.62188 5.68908C3.24075 5.87965 3 6.26919 3 6.69531V19.1797C3 20.016 3.8801 20.56 4.62811 20.186L8.49688 18.2516C8.8136 18.0932 9.1864 18.0932 9.50312 18.2516L14.4969 20.7485C14.8136 20.9068 15.1864 20.9068 15.5031 20.7485Z" 
                stroke="#292826" 
                strokeOpacity="0.5" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">Venue</span>
          </div>
        </div>

        {/* Others section */}
        <div className="flex flex-col justify-center items-center gap-4 self-stretch">
          {/* Support */}
          <div className="flex items-center gap-3 px-0 py-4 pr-4 self-stretch">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M9.87891 7.51884C11.0505 6.49372 12.95 6.49372 14.1215 7.51884C15.2931 8.54397 15.2931 10.206 14.1215 11.2312C13.9176 11.4096 13.6917 11.5569 13.4513 11.6733C12.7056 12.0341 12.0002 12.6716 12.0002 13.5V14.25M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12ZM12 17.25H12.0075V17.2575H12V17.25Z" 
                stroke="#292826" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">Support</span>
          </div>

          {/* Divider */}
          <svg width="260" height="2" viewBox="0 0 261 2" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0.5 1H260.5" stroke="#DADADA"/>
          </svg>

          {/* User */}
          <div className="flex items-center gap-3 px-0 py-4 self-stretch">
            <div className="w-10 h-10 relative">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="20" fill="#292826"/>
              </svg>
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute top-1.5 left-1.5">
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M9.37554 7.5C9.37554 4.3934 11.8939 1.875 15.0005 1.875C18.1071 1.875 20.6255 4.3934 20.6255 7.5C20.6255 10.6066 18.1071 13.125 15.0005 13.125C11.8939 13.125 9.37554 10.6066 9.37554 7.5Z" 
                  fill="white"
                />
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M4.68959 25.1317C4.78627 19.5195 9.36552 15 15.0005 15C20.6357 15 25.215 19.5197 25.3115 25.1321C25.3179 25.5043 25.1035 25.845 24.7651 26.0002C21.7914 27.3647 18.4837 28.125 15.0009 28.125C11.5179 28.125 8.20983 27.3646 5.23594 25.9999C4.8976 25.8446 4.68318 25.5039 4.68959 25.1317Z" 
                  fill="white"
                />
              </svg>
            </div>
            <div className="flex flex-col justify-center items-start flex-1">
              <span className="text-sm font-semibold font-manrope leading-[140%] text-font-primary">Marcus Langley</span>
              <span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">Administrator</span>
            </div>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                fillRule="evenodd" 
                clipRule="evenodd" 
                d="M5.21967 11.7803C5.51256 12.0732 5.98744 12.0732 6.28033 11.7803L10 8.06066L13.7197 11.7803C14.0126 12.0732 14.4874 12.0732 14.7803 11.7803C15.0732 11.4874 15.0732 11.0126 14.7803 10.7197L10.5303 6.46967C10.3897 6.32902 10.1989 6.25 10 6.25C9.80109 6.25 9.61032 6.32902 9.46967 6.46967L5.21967 10.7197C4.92678 11.0126 4.92678 11.4874 5.21967 11.7803Z" 
                fill="#292826"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center w-full h-[60px] px-8">
          {/* Search Input */}
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                fillRule="evenodd" 
                clipRule="evenodd" 
                d="M9 3.5C5.96243 3.5 3.5 5.96243 3.5 9C3.5 12.0376 5.96243 14.5 9 14.5C10.519 14.5 11.893 13.8852 12.8891 12.8891C13.8852 11.893 14.5 10.519 14.5 9C14.5 5.96243 12.0376 3.5 9 3.5ZM2 9C2 5.13401 5.13401 2 9 2C12.866 2 16 5.13401 16 9C16 10.6625 15.4197 12.1906 14.4517 13.3911L17.7803 16.7197C18.0732 17.0126 18.0732 17.4874 17.7803 17.7803C17.4874 18.0732 17.0126 18.0732 16.7197 17.7803L13.3911 14.4517C12.1906 15.4197 10.6625 16 9 16C5.13401 16 2 12.866 2 9Z" 
                fill="#292826"
              />
            </svg>
            <div className="flex items-center gap-2.5 w-[280px] h-9 px-1.5 bg-white rounded-lg">
              <input
                type="text"
                placeholder="Search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="text-sm font-normal font-manrope text-primary-color bg-transparent border-none outline-none flex-1"
              />
            </div>
          </div>

          {/* Notifications */}
          <div className="flex justify-center items-center w-6 h-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M14.8559 17.0817C16.7504 16.857 18.5773 16.4116 20.3102 15.7719C18.8734 14.177 17.9988 12.0656 17.9988 9.75V9.04919C17.999 9.03281 17.999 9.01641 17.999 9C17.999 5.68629 15.3127 3 11.999 3C8.68531 3 5.99902 5.68629 5.99902 9L5.99883 9.75C5.99883 12.0656 5.1243 14.177 3.6875 15.7719C5.42043 16.4116 7.24746 16.857 9.14216 17.0818M14.8559 17.0817C13.919 17.1928 12.9656 17.25 11.9988 17.25C11.0322 17.25 10.0789 17.1929 9.14216 17.0818M14.8559 17.0817C14.9488 17.3711 14.999 17.6797 14.999 18C14.999 19.6569 13.6559 21 11.999 21C10.3422 21 8.99902 19.6569 8.99902 18C8.99902 17.6797 9.04921 17.3712 9.14216 17.0818" 
                stroke="#292826" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Page Header with Title and Actions - Exact Figma Spacing */}
        <div className="flex justify-between items-center w-full h-9 px-8">
          <div className="flex flex-col items-start gap-0 flex-1">
            <h1 className="text-2xl font-bold font-manrope leading-[140%] text-font-primary">Jobs</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="flex items-center w-[180px] h-9 px-3 gap-3 rounded-lg border border-primary-color bg-white">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M9 3.5C5.96243 3.5 3.5 5.96243 3.5 9C3.5 12.0376 5.96243 14.5 9 14.5C10.519 14.5 11.893 13.8852 12.8891 12.8891C13.8852 11.893 14.5 10.519 14.5 9C14.5 5.96243 12.0376 3.5 9 3.5ZM2 9C2 5.13401 5.13401 2 9 2C12.866 2 16 5.13401 16 9C16 10.6625 15.4197 12.1906 14.4517 13.3911L17.7803 16.7197C18.0732 17.0126 18.0732 17.4874 17.7803 17.7803C17.4874 18.0732 17.0126 18.0732 16.7197 17.7803L13.3911 14.4517C12.1906 15.4197 10.6625 16 9 16C5.13401 16 2 12.866 2 9Z" 
                  fill="#292826"
                />
              </svg>
              <div className="flex items-center gap-2.5 px-1.5 py-1.5 pl-0 bg-white rounded-lg flex-1 self-stretch">
                <input
                  type="text"
                  placeholder="Search"
                  className="text-sm font-normal font-manrope text-primary-color bg-transparent border-none outline-none flex-1"
                />
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="flex justify-end items-center gap-2.5 px-3 py-2 rounded-lg border border-primary-color bg-white self-stretch">
              <span className="text-xs font-normal font-manrope leading-[140%] text-font-primary">Sort by</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M5.21967 10.2197C5.51256 9.92678 5.98744 9.92678 6.28033 10.2197L8 11.9393L9.71967 10.2197C10.0126 9.92678 10.4874 9.92678 10.7803 10.2197C11.0732 10.5126 11.0732 10.9874 10.7803 11.2803L8.53033 13.5303C8.23744 13.8232 7.76256 13.8232 7.46967 13.5303L5.21967 11.2803C4.92678 10.9874 4.92678 10.5126 5.21967 10.2197Z" 
                  fill="#292826"
                />
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M10.7803 5.78033C10.4874 6.07322 10.0126 6.07322 9.71967 5.78033L8 4.06066L6.28033 5.78033C5.98744 6.07322 5.51256 6.07322 5.21967 5.78033C4.92678 5.48744 4.92678 5.01256 5.21967 4.71967L7.46967 2.46967C7.76256 2.17678 8.23744 2.17678 8.53033 2.46967L10.7803 4.71967C11.0732 5.01256 11.0732 5.48744 10.7803 5.78033Z" 
                  fill="#292826"
                />
              </svg>
            </div>

            {/* Create New Job Button */}
            <button
              onClick={handleCreateNewJob}
              className="flex justify-center items-center gap-2.5 px-3 py-2 rounded-lg bg-button-action hover:bg-button-action/90 transition-colors"
            >
              <span className="text-sm font-bold font-manrope leading-[140%] text-white">Create New Job</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation - Exact Figma Spacing */}
        <div className="flex items-start gap-8 w-full px-8 border-b border-primary-color" style={{ marginTop: '24px' }}>
          <div className={`flex justify-center items-center gap-2.5 px-1 py-4 border-b-4 ${activeTab === 'ongoing' ? 'border-button-action' : 'border-transparent'}`}>
            <span className={`text-sm font-semibold font-manrope leading-[140%] ${activeTab === 'ongoing' ? 'text-button-action' : 'text-primary-color'}`}>
              Ongoing Jobs
            </span>
          </div>
          <div className={`flex justify-center items-center gap-2.5 px-1 py-4 ${activeTab === 'completed' ? 'border-b-4 border-button-action' : ''}`}>
            <span className={`text-sm font-normal font-manrope leading-[140%] ${activeTab === 'completed' ? 'text-button-action' : 'text-primary-color'}`}>
              Completed Jobs
            </span>
          </div>
        </div>

        {/* Main Table Content */}
        <div className="flex flex-col w-full pb-8 px-8" style={{ paddingBottom: '32px' }}>
          <div className="flex flex-col items-start self-stretch rounded-lg">
            {/* Table Header */}
            <div className="grid grid-cols-[200px_1fr_160px_160px_80px_140px_20px] gap-4 pr-3 self-stretch border-b border-neutral-dark-gray-200">
              <div className="flex items-center px-4 py-3">
                <span className="text-sm font-semibold font-manrope leading-[140%] tracking-[0.28px] text-font-primary">Skills</span>
              </div>
              <div className="flex items-center px-4 py-3">
                <span className="text-sm font-semibold font-manrope leading-[140%] tracking-[0.28px] text-font-primary">Venue Location</span>
              </div>
              <div className="flex items-center px-4 py-3">
                <span className="text-sm font-semibold font-manrope leading-[140%] tracking-[0.28px] text-font-primary">Shift Date</span>
              </div>
              <div className="flex items-center px-4 py-3">
                <span className="text-sm font-semibold font-manrope leading-[140%] tracking-[0.28px] text-font-primary">Shift Time</span>
              </div>
              <div className="flex justify-end items-center px-4 py-3">
                <span className="text-sm font-semibold font-manrope leading-[140%] tracking-[0.28px] text-font-primary">Staffing</span>
              </div>
              <div className="flex justify-end items-center px-4 py-3">
                <span className="text-sm font-semibold font-manrope leading-[140%] tracking-[0.28px] text-font-primary">Status</span>
              </div>
              <div className="flex items-center justify-center px-2 py-3" />
            </div>

            {/* Scroll Container */}
            <div className="flex flex-col justify-start items-start self-stretch">
              <div className="flex flex-col items-start self-stretch w-full">
                {/* Job Rows */}
                {mockJobs.map((job, index) => (
                  <div key={job.id} className="grid grid-cols-[200px_1fr_160px_160px_80px_140px_20px] gap-4 pr-3 self-stretch border-b border-neutral-dark-gray-100 rounded-lg" style={{ height: '68px' }}>
                    <div className="flex items-center px-4 py-3">
                      <span className="text-base font-normal font-manrope leading-[140%] text-font-secondary">{job.skills}</span>
                    </div>
                    <div className="flex items-center px-4 py-3">
                      <span className="text-base font-normal font-manrope leading-[140%] text-font-secondary">{job.venueLocation}</span>
                    </div>
                    <div className="flex items-center px-4 py-3">
                      <span className="text-base font-normal font-manrope leading-[140%] text-font-secondary">{job.shiftDate}</span>
                    </div>
                    <div className="flex items-center px-4 py-3">
                      <span className="text-base font-normal font-manrope leading-[140%] text-font-secondary">{job.shiftTime}</span>
                    </div>
                    <div className="flex justify-end items-center px-4 py-3">
                      <span className="text-base font-normal font-manrope leading-[140%] text-font-secondary">{job.staffing}</span>
                    </div>
                    <div className="flex justify-end items-center px-4 py-3">
                      {getStatusBadge(job.status, job.statusText)}
                    </div>
                    <div className="flex items-center justify-center px-2 py-3">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
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

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                className="mt-2"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
