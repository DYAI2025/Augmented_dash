
import React from 'react';

interface InternalLinkProps {
  title: string;
  description: string;
  icon: string;
  path: string;
  tag?: string;
  tagType?: 'info' | 'success' | 'warning' | 'error';
}

export const InternalLink: React.FC<InternalLinkProps> = ({ 
  title, 
  description, 
  icon, 
  path, 
  tag,
  tagType = 'info'
}) => {
  const getTagStyles = () => {
    switch (tagType) {
      case 'success': return 'bg-green-500/10 text-green-500';
      case 'warning': return 'bg-orange-500/10 text-orange-500';
      case 'error': return 'bg-red-500/10 text-red-500';
      default: return 'bg-blue-500/10 text-blue-500';
    }
  };

  return (
    <a 
      href={path}
      className="flex items-start gap-4 p-5 rounded-[28px] hover:soft-ui-pressed transition-all duration-300 group cursor-pointer border border-transparent hover:border-blue-500/10"
    >
      <div className="w-16 h-16 min-w-[4rem] soft-ui-inset rounded-2xl flex items-center justify-center text-3xl group-hover:scale-105 transition-transform duration-500 relative overflow-hidden">
        {/* Subtle glass reflection effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        {icon}
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-black text-[13px] text-gray-700 dark:text-gray-200 uppercase tracking-tight truncate group-hover:text-blue-500 transition-colors">
            {title}
          </h4>
          {tag && (
            <span className={`px-2 py-0.5 ${getTagStyles()} text-[8px] font-black rounded-full uppercase tracking-widest`}>
              {tag}
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 font-medium">
          {description}
        </p>
        <div className="mt-3 flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] group-hover:translate-x-1 transition-transform">
          <span>Explore Module</span>
          <span className="text-blue-500">→</span>
        </div>
      </div>
    </a>
  );
};
