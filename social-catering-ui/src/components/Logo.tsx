import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export function Logo({ className = '', size = 'medium' }: LogoProps) {
  const sizeClasses = {
    small: 'text-2xl',
    medium: 'text-4xl',
    large: 'text-6xl'
  };

  const cateringSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* SOCIAL - Large, dark gray, wavy baseline with playful letter positioning */}
      <div className={`${sizeClasses[size]} font-bold text-gray-900 leading-none`} style={{ fontFamily: 'sans-serif' }}>
        <span className="inline-block" style={{ transform: 'translateY(0.08em)' }}>S</span>
        <span className="inline-block" style={{ transform: 'translateY(-0.05em)' }}>O</span>
        <span className="inline-block" style={{ transform: 'translateY(0.06em)' }}>C</span>
        <span className="inline-block" style={{ transform: 'translateY(-0.04em)' }}>I</span>
        <span className="inline-block" style={{ transform: 'translateY(0.05em)' }}>A</span>
        <span className="inline-block" style={{ transform: 'translateY(-0.06em)' }}>L</span>
      </div>
      {/* CATERING - Smaller, lighter gray, straight baseline */}
      <div className={`${cateringSizeClasses[size]} font-medium text-gray-600 leading-tight mt-0.5`} style={{ fontFamily: 'sans-serif' }}>
        CATERING
      </div>
    </div>
  );
}

