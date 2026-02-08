
import React from 'react';

interface ToggleProps {
  active: boolean;
  onToggle: () => void;
  label: string;
  statusColor?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ active, onToggle, label, statusColor = "bg-green-500" }) => {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center">
        <div className={`w-2 h-2 rounded-full mr-3 ${active ? `${statusColor} animate-live` : 'bg-gray-400'}`}></div>
        <span className="font-bold text-gray-600 group-hover:text-blue-500 transition-colors">{label}</span>
      </div>
      <div 
        onClick={onToggle}
        className={`w-14 h-7 soft-ui-inset rounded-full relative cursor-pointer overflow-hidden`}
      >
        <div 
          className={`absolute top-1 left-1 w-5 h-5 rounded-full shadow-md transition-all duration-300 transform 
            ${active ? 'translate-x-7 bg-blue-500' : 'bg-gray-400'}`}
        ></div>
      </div>
    </div>
  );
};
