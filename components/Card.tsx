
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  inset?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = "", inset = false }) => {
  return (
    <div className={`rounded-[24px] p-6 transition-all duration-300 ${inset ? 'soft-ui-inset' : 'soft-ui'} ${className}`}>
      {children}
    </div>
  );
};
