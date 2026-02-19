import React from 'react';
import { LayoutIcon } from './Icons';
import { Property } from '../types';

interface HeaderProps {
  activeProperty: Property | undefined;
  setActivePropertyId: (id: string | null) => void;
  handleLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeProperty, setActivePropertyId, handleLogout }) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActivePropertyId(null)}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <LayoutIcon />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent hidden sm:block">
              DreamSpace
            </h1>
          </div>
          
          <div className="h-6 w-px bg-slate-700 mx-2"></div>
          
          <div className="flex items-center gap-2">
             <span className="text-slate-400 text-sm">Project:</span>
             <span className="font-semibold text-white">{activeProperty?.name}</span>
             <button 
               onClick={() => setActivePropertyId(null)}
               className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded ml-2 transition-colors"
             >
               Switch
             </button>
          </div>
          <button 
             onClick={handleLogout}
             className="ml-4 text-xs text-red-400 hover:text-red-300 border border-red-900/50 px-2 py-1 rounded"
          >
             Logout
          </button>
        </div>
        <div className="text-sm text-slate-500 hidden md:block">
          Powered by MKG
        </div>
      </div>
    </header>
  );
};

export default Header;
