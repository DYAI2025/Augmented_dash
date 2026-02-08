
import React from 'react';
import { Theme } from '../types';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => {
  return (
    <button 
      onClick={onToggle}
      className="soft-ui w-12 h-12 flex items-center justify-center text-xl hover:soft-ui-pressed transition-all rounded-full"
      title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
};
