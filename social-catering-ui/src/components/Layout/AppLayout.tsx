import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, ChevronUp } from 'lucide-react';

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      // Still redirect to login even if logout fails
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
      setIsDropdownOpen(false);
    }
  };
  
  return (
    <div className="flex min-h-screen bg-neutral-white">
      {/* Sidebar Navigation */}
      <div className="flex flex-col w-[261px] border-r border-primary-color/10 bg-secondary-color fixed left-0 top-0 h-screen flex-shrink-0" style={{ padding: '32px 24px' }}>
        {/* Logo */}
        <div className="flex flex-col items-center self-stretch mb-12">
          <img 
            src="/sc_logo.png"
            srcSet="/sc_logo.png 1x, /sc_logo@2x.png 2x, /sc_logo@3x.png 3x"
            alt="Social Catering Logo" 
            className="h-10 w-auto"
            loading="eager"
            decoding="async"
            style={{ 
              imageRendering: 'auto'
            }}
          />
        </div>
        <div className="flex flex-col items-start gap-2 self-stretch">
          {/* Dashboard */}
          <NavLink 
            to="/dashboard" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-0 py-2 self-stretch rounded-xl relative ${
                isActive ? 'bg-gray-50 -ml-6 pl-6 ' : ''
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-primary-color rounded-sm" />
                )}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path 
                    d="M3.75 6C3.75 4.75736 4.75736 3.75 6 3.75H8.25C9.49264 3.75 10.5 4.75736 10.5 6V8.25C10.5 9.49264 9.49264 10.5 8.25 10.5H6C4.75736 10.5 3.75 9.49264 3.75 8.25V6Z" 
                    stroke="#292826" 
                    strokeOpacity={isActive ? "1" : "0.5"} 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  <path 
                    d="M3.75 15.75C3.75 14.5074 4.75736 13.5 6 13.5H8.25C9.49264 13.5 10.5 14.5074 10.5 15.75V18C10.5 19.2426 9.49264 20.25 8.25 20.25H6C4.75736 20.25 3.75 19.2426 3.75 18V15.75Z" 
                    stroke="#292826" 
                    strokeOpacity={isActive ? "1" : "0.5"} 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  <path 
                    d="M13.5 6C13.5 4.75736 14.5074 3.75 15.75 3.75H18C19.2426 3.75 20.25 4.75736 20.25 6V8.25C20.25 9.49264 19.2426 10.5 18 10.5H15.75C14.5074 10.5 13.5 9.49264 13.5 8.25V6Z" 
                    stroke="#292826" 
                    strokeOpacity={isActive ? "1" : "0.5"} 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  <path 
                    d="M13.5 15.75C13.5 14.5074 14.5074 13.5 15.75 13.5H18C19.2426 13.5 20.25 14.5074 20.25 15.75V18C20.25 19.2426 19.2426 20.25 18 20.25H15.75C14.5074 20.25 13.5 19.2426 13.5 18V15.75Z" 
                    stroke="#292826" 
                    strokeOpacity={isActive ? "1" : "0.5"} 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
                <span className={`text-sm font-manrope leading-[140%] ${isActive ? 'font-bold text-font-primary' : 'font-normal text-font-primary'}`}>
                  Dashboard
                </span>
              </>
            )}
          </NavLink>

          {/* Events */}
          <NavLink 
            to="/events" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-0 py-2 self-stretch relative ${
                isActive ? 'bg-gray-50 -ml-6 pl-6 ' : ''
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-primary-color rounded-sm" />
                )}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path 
                    d="M8 2V5M16 2V5M3.5 9.09H20.5M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" 
                    stroke="#292826" 
                    strokeOpacity={isActive ? "1" : "0.5"} 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  <path 
                    d="M15.6947 14.7H15.7037M15.6947 17.7H15.7037M11.9955 14.7H12.0045M11.9955 17.7H12.0045M8.29431 14.7H8.30329M8.29431 17.7H8.30329" 
                    stroke="#292826" 
                    strokeOpacity={isActive ? "1" : "0.5"} 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
                <span className={`text-sm font-manrope leading-[140%] ${isActive ? 'font-bold text-font-primary' : 'font-normal text-font-primary'}`}>
                  Events
                </span>
              </>
            )}
          </NavLink>


          {/* Workers */}
          <NavLink 
            to="/workers" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-0 py-2 self-stretch relative ${
                isActive ? 'bg-gray-50 -ml-6 pl-6 ' : ''
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-primary-color rounded-sm" />
                )}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path 
                    d="M17.9992 18.7191C18.2467 18.7396 18.4971 18.75 18.7498 18.75C19.7982 18.75 20.8046 18.5708 21.7403 18.2413C21.7466 18.1617 21.7498 18.0812 21.7498 18C21.7498 16.3431 20.4067 15 18.7498 15C18.1222 15 17.5396 15.1927 17.058 15.5222M17.9992 18.7191C17.9993 18.7294 17.9993 18.7397 17.9993 18.75C17.9993 18.975 17.9869 19.1971 17.9628 19.4156C16.206 20.4237 14.1699 21 11.9993 21C9.8286 21 7.79254 20.4237 6.03577 19.4156C6.01165 19.1971 5.99927 18.975 5.99927 18.75C5.99927 18.7397 5.99929 18.7295 5.99934 18.7192M17.9992 18.7191C17.9933 17.5426 17.6487 16.4461 17.058 15.5222M17.058 15.5222C15.9921 13.8552 14.1247 12.75 11.9993 12.75C9.87406 12.75 8.00692 13.8549 6.94096 15.5216M6.94096 15.5216C6.4595 15.1925 5.87723 15 5.25 15C3.59315 15 2.25 16.3431 2.25 18C2.25 18.0812 2.25323 18.1617 2.25956 18.2413C3.19519 18.5708 4.20167 18.75 5.25 18.75C5.50234 18.75 5.75226 18.7396 5.99934 18.7192M6.94096 15.5216C6.34997 16.4457 6.00525 17.5424 5.99934 18.7192M14.9993 6.75C14.9993 8.40685 13.6561 9.75 11.9993 9.75C10.3424 9.75 8.99927 8.40685 8.99927 6.75C8.99927 5.09315 10.3424 3.75 11.9993 3.75C13.6561 3.75 14.9993 5.09315 14.9993 6.75ZM20.9993 9.75C20.9993 10.9926 19.9919 12 18.7493 12C17.5066 12 16.4993 10.9926 16.4993 9.75C16.4993 8.50736 17.5066 7.5 18.7493 7.5C19.9919 7.5 20.9993 8.50736 20.9993 9.75ZM7.49927 9.75C7.49927 10.9926 6.49191 12 5.24927 12C4.00663 12 2.99927 10.9926 2.99927 9.75C2.99927 8.50736 4.00663 7.5 5.24927 7.5C6.49191 7.5 7.49927 8.50736 7.49927 9.75Z" 
                    stroke="#292826" 
                    strokeOpacity={isActive ? "1" : "0.5"} 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
                <span className={`text-sm font-manrope leading-[140%] ${isActive ? 'font-bold text-font-primary' : 'font-normal text-font-primary'}`}>
                  Workers
                </span>
              </>
            )}
          </NavLink>

          {/* Reports */}
          <NavLink 
            to="/reports" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-0 py-2 self-stretch relative ${
                isActive ? 'bg-gray-50 -ml-6 pl-6 ' : ''
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-primary-color rounded-sm" />
                )}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path 
                    d="M3 13.125C3 12.5037 3.50368 12 4.125 12H6.375C6.99632 12 7.5 12.5037 7.5 13.125V19.875C7.5 20.4963 6.99632 21 6.375 21H4.125C3.50368 21 3 20.4963 3 19.875V13.125Z" 
                    stroke="#292826" 
                    strokeOpacity={isActive ? "1" : "0.5"} 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  <path 
                    d="M9.75 8.625C9.75 8.00368 10.2537 7.5 10.875 7.5H13.125C13.7463 7.5 14.25 8.00368 14.25 8.625V19.875C14.25 20.4963 13.7463 21 13.125 21H10.875C10.7463 21 9.75 20.4963 9.75 19.875V8.625Z" 
                    stroke="#292826" 
                    strokeOpacity={isActive ? "1" : "0.5"} 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  <path 
                    d="M16.5 4.125C16.5 3.50368 17.0037 3 17.625 3H19.875C20.4963 3 21 3.50368 21 4.125V19.875C21 20.4963 20.4963 21 19.875 21H17.625C17.0037 21 16.5 20.4963 16.5 19.875V4.125Z" 
                    stroke="#292826" 
                    strokeOpacity={isActive ? "1" : "0.5"} 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
                <span className={`text-sm font-manrope leading-[140%] ${isActive ? 'font-bold text-font-primary' : 'font-normal text-font-primary'}`}>
                  Reports
                </span>
              </>
            )}
          </NavLink>

          {/* Activity Log */}
          <NavLink 
            to="/activity-log" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-0 py-2 self-stretch relative ${
                isActive ? 'bg-gray-50 -ml-6 pl-6 ' : ''
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-primary-color rounded-sm" />
                )}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path 
                    d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01" 
                    stroke="#292826" 
                    strokeOpacity={isActive ? "1" : "0.5"} 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
                <span className={`text-sm font-manrope leading-[140%] ${isActive ? 'font-bold text-font-primary' : 'font-normal text-font-primary'}`}>
                  Activity Log
                </span>
              </>
            )}
          </NavLink>
        </div>

        {/* SPACER - This pushes "Others" to bottom */}
        <div className="flex-1 min-h-[100px]" />

        {/* Others section */}
        <div className="flex flex-col justify-center items-center gap-4 self-stretch">
          {/* Support */}
          <a 
            href="mailto:support@gravywork.com?subject=Social%20Catering%20—%20Support&body=Hi%20GravyWork%20Support%2C%0A%0AIssue%3A%0ASteps%20to%20reproduce%3A%0A%0AThanks%21"
            className="flex items-center gap-3 px-0 py-4 pr-4 self-stretch hover:bg-gray-50 rounded-lg transition-colors no-underline text-font-primary"
            aria-label="Email support@gravywork.com"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M9.87891 7.51884C11.0505 6.49372 12.95 6.49372 14.1215 7.51884C15.2931 8.54397 15.2931 10.206 14.1215 11.2312C13.9176 11.4096 13.6917 11.5569 13.4513 11.6733C12.7056 12.0341 12.0002 12.6716 12.0002 13.5V14.25M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12ZM12 17.25H12.0075V17.2575H12V17.25Z" 
                stroke="#292826" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-normal font-manrope leading-[140%]">Support</span>
          </a>

          {/* Divider */}
          <svg width="260" height="2" viewBox="0 0 261 2" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0.5 1H260.5" stroke="#DADADA"/>
          </svg>

          {/* User */}
          <div className="flex items-center gap-3 px-0 py-4 self-stretch relative" ref={dropdownRef}>
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
              <span className="text-sm font-semibold font-manrope leading-[140%] text-font-primary">
                {(() => {
                  const username = user?.email?.split('@')[0];
                  if (!username) return 'User';
                  return username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
                })()}
              </span>
              <span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">
                Administrator
              </span>
            </div>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="p-0 bg-transparent border-none cursor-pointer"
            >
              <ChevronUp 
                size={20} 
                className={`text-gray-600 transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LogOut size={16} className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">
                    {isLoggingOut ? 'Signing out...' : 'Sign out'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area - Offset for fixed sidebar */}
      <div className="flex-1 flex flex-col ml-[261px]">
        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
