import React from 'react';

interface PageProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Page({ title, subtitle, actions, children, className = '' }: PageProps) {
  return (
    <>
      {/* Breadcrumbs */}
      <div className="flex items-center px-8 py-5">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold font-manrope leading-[140%] text-font-primary">{title}</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 justify-center gap-12 px-8 min-h-0" style={{ paddingTop: '80px', paddingBottom: '40px' }}>
        {/* Page Content */}
        <div
          className={`flex flex-col p-8 rounded-lg border border-primary-color/10 bg-white self-start overflow-visible ${className}`}
          style={{ 
            boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.04)', 
            maxWidth: '850px', 
            width: '100%',
            minHeight: '600px'
          }}
        >
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
              {subtitle && (
                <p className="text-gray-600 mt-1">{subtitle}</p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
              </div>
            )}
          </div>

          {/* Page Body */}
          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
