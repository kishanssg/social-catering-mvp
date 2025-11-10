import React from 'react';
import { Logo } from '../components/Logo';
import squaresIcon from '../assets/icons/squares-2x2.svg';
import briefcaseIcon from '../assets/icons/briefcase.svg';
import userGroupIcon from '../assets/icons/user-group.svg';
import chartBarIcon from '../assets/icons/chart-bar.svg';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="flex flex-col w-[261px] border-r border-gray-300 bg-secondary-color">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2.5 px-6 py-8">
          <Logo size="small" />
        </div>

        {/* Active State Indicator */}
        <div className="w-1 h-7 bg-font-primary/50 rounded-r-[2px] absolute left-0 mt-[196px]" />

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-2 px-3 py-4">
          {/* Dashboard */}
          <div className="flex items-center gap-3 px-0 py-2">
            <img src={squaresIcon} width="24" height="24" alt="Dashboard" />
            <span className="text-sm font-normal font-manrope text-font-primary">Dashboard</span>
          </div>

          {/* Jobs - Active */}
          <div className="flex items-center gap-3 px-0 py-2">
            <img src={briefcaseIcon} width="24" height="24" alt="Jobs" />
            <span className="text-sm font-bold font-manrope text-font-primary">Jobs</span>
          </div>

          {/* Clients */}
          <div className="flex items-center gap-3 px-0 py-2">
            <img src={userGroupIcon} width="24" height="24" alt="Administrators & Roles" />
            <span className="text-sm font-normal font-manrope text-font-primary">Administrators & Roles</span>
          </div>

          {/* Workers */}
          <div className="flex items-center gap-3 px-0 py-2">
            <img src={chartBarIcon} width="24" height="24" alt="Workers" />
            <span className="text-sm font-normal font-manrope text-font-primary">Workers</span>
          </div>

          {/* Reports */}
          <div className="flex items-center gap-3 px-0 py-2">
            <img src={chartBarIcon} width="24" height="24" alt="Reports" />
            <span className="text-sm font-normal font-manrope text-font-primary">Reports</span>
          </div>

          {/* Venue */}
          <div className="flex items-center gap-3 px-0 py-2">
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
            <span className="text-sm font-normal font-manrope text-font-primary">Venue</span>
          </div>
        </nav>

        {/* Bottom section */}
        <div className="flex flex-col justify-center items-center gap-4 px-0 py-4">
          {/* Support */}
          <div className="flex items-center gap-3 px-0 py-4 pl-4 w-full">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M9.87891 7.51884C11.0505 6.49372 12.95 6.49372 14.1215 7.51884C15.2931 8.54397 15.2931 10.206 14.1215 11.2312C13.9176 11.4096 13.6917 11.5569 13.4513 11.6733C12.7056 12.0341 12.0002 12.6716 12.0002 13.5V14.25M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12ZM12 17.25H12.0075V17.2575H12V17.25Z" 
                stroke="#292826" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-normal font-manrope text-font-primary">Support</span>
          </div>

          {/* Divider */}
          <div className="w-[260px] h-0 border-t border-neutral-dark-gray-300" />

          {/* User */}
          <div className="flex items-center gap-3 px-0 py-4 w-full">
            <div className="w-10 h-10 relative">
              <div className="w-10 h-10 rounded-full bg-font-primary" />
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute top-1.5 left-1.5">
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M9.37456 7.5C9.37456 4.3934 11.893 1.875 14.9996 1.875C18.1062 1.875 20.6246 4.3934 20.6246 7.5C20.6246 10.6066 18.1062 13.125 14.9996 13.125C11.893 13.125 9.37456 10.6066 9.37456 7.5Z" 
                  fill="white"
                />
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M4.68862 25.1317C4.78529 19.5195 9.36454 15 14.9996 15C20.6347 15 25.214 19.5197 25.3105 25.1321C25.3169 25.5043 25.1025 25.845 24.7641 26.0002C21.7905 27.3647 18.4827 28.125 15 28.125C11.5169 28.125 8.20885 27.3646 5.23496 25.9999C4.89662 25.8446 4.6822 25.5039 4.68862 25.1317Z" 
                  fill="white"
                />
              </svg>
            </div>
            <div className="flex flex-col justify-center items-start flex-1">
              <span className="text-sm font-bold font-manrope text-font-primary">Marcus Langley</span>
              <span className="text-sm font-normal font-manrope text-font-primary">Administrator</span>
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

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center w-full px-8 py-4 h-[60px] border-b border-neutral-dark-gray-200 bg-white">
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
            <div className="flex items-center gap-2.5 w-[280px] h-9 px-1.5 py-1.5 pl-0 bg-white border border-neutral-dark-gray-300 rounded-lg">
              <input
                type="text"
                placeholder="Search"
                className="text-sm font-normal font-manrope text-primary-color bg-transparent border-none outline-none flex-1"
              />
            </div>
          </div>

          {/* Notifications */}
          <div className="flex justify-center items-center w-6 h-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M14.8569 17.0817C16.7514 16.857 18.5783 16.4116 20.3111 15.7719C18.8743 14.177 17.9998 12.0656 17.9998 9.75V9.04919C17.9999 9.03281 18 9.01641 18 9C18 5.68629 15.3137 3 12 3C8.68629 3 6 5.68629 6 9L5.9998 9.75C5.9998 12.0656 5.12527 14.177 3.68848 15.7719C5.4214 16.4116 7.24843 16.857 9.14314 17.0818M14.8569 17.0817C13.92 17.1928 12.9666 17.25 11.9998 17.25C11.0332 17.25 10.0799 17.1929 9.14314 17.0818M14.8569 17.0817C14.9498 17.3711 15 17.6797 15 18C15 19.6569 13.6569 21 12 21C10.3431 21 9 19.6569 9 18C9 17.6797 9.05019 17.3712 9.14314 17.0818" 
                stroke="#292826" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
