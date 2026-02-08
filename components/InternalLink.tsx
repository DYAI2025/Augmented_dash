
import React from 'react';

interface InternalLinkProps {
  title: string;
  description: string;
  icon: string;
  path: string;
  tag?: string;
}

export const InternalLink: React.FC<InternalLinkProps> = ({ title, description, icon, path, tag }) => {
  return (
    <a 
      href={path}
      className="flex items-start gap-4 p-4 rounded-2xl hover:soft-ui-pressed transition-all duration-300 group cursor-pointer"
    >
      <div className="w-14 h-14 min-w-[3.5rem] soft-ui-inset rounded-xl flex items-center justify-center text-2xl group-hover:scale-105 transition-transform duration-300">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="font-black text-sm text-gray-700 dark:text-gray-200 uppercase tracking-tight truncate">
            {title}
          </h4>
          {tag && (
            <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-500 text-[8px] font-black rounded uppercase tracking-tighter">
              {tag}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight line-clamp-2">
          {description}
        </p>
        <div className="mt-2 text-[9px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-blue-500 transition-colors">
          Access Module →
        </div>
      </div>
    </a>
  );
};
