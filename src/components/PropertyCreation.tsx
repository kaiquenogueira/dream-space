import React, { useState } from 'react';
import { LayoutIcon } from './Icons';
import { Property } from '../types';

interface PropertyCreationProps {
  properties: Property[];
  setActivePropertyId: (id: string) => void;
  handleCreateProperty: (e: React.FormEvent, name: string) => void;
}

const PropertyCreation: React.FC<PropertyCreationProps> = ({ properties, setActivePropertyId, handleCreateProperty }) => {
  const [newPropertyName, setNewPropertyName] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCreateProperty(e, newPropertyName);
    setNewPropertyName('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-4">
       <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-2xl shadow-blue-900/50">
          <LayoutIcon />
       </div>
       <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-2">
         DreamSpace AI
       </h1>
       <p className="text-slate-400 mb-8 text-center max-w-md">
         Architectural redesign and virtual staging for real estate professionals.
       </p>

       <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-6">Create New Property Project</h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Property Name / Address</label>
              <input 
                type="text" 
                value={newPropertyName}
                onChange={(e) => setNewPropertyName(e.target.value)}
                placeholder="e.g. 123 Ocean Drive, Apt 4B"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <button 
              type="submit"
              disabled={!newPropertyName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all"
            >
              Start Project
            </button>
          </form>

          {properties.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-800">
              <h3 className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Recent Projects</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {properties.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActivePropertyId(p.id)}
                    className="w-full text-left px-4 py-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all flex justify-between items-center group"
                  >
                    <span className="font-medium text-slate-300 group-hover:text-white">{p.name}</span>
                    <span className="text-xs text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
       </div>
    </div>
  );
};

export default PropertyCreation;
