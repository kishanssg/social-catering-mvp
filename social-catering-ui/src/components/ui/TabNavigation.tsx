import React from 'react';

export interface Tab {
  id: string;
  label: string;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function TabNavigation({ tabs, activeTab, onTabChange, className = '' }: TabNavigationProps) {
  return (
    <div className={`flex items-start gap-8 border-b ${className}`} style={{ borderColor: 'rgba(41, 40, 38, 0.5)' }}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center justify-center gap-2.5 px-1 py-4 font-manrope text-sm font-${isActive ? '700' : '400'} leading-[140%] transition-colors duration-200`}
            style={{
              color: isActive ? '#3A869D' : 'rgba(41, 40, 38, 0.5)',
            }}
          >
            {tab.label}
            {isActive && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.75 rounded-t-sm"
                style={{ backgroundColor: '#3A869D', height: '3px' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
