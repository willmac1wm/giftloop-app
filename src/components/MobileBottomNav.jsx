import React from 'react';
import { Gift, Flame, Lightbulb, Smartphone } from 'lucide-react';
import { sound } from '../utils/audio';

export default function MobileBottomNav({ activeTab, setActiveTab, onOpenInstallModal }) {
  const handleTabClick = (tab) => {
    sound.playClick();
    setActiveTab(tab);
  };

  return (
    <nav className="ios-tab-bar sm:hidden flex items-center justify-around px-2">
      <button
        onClick={() => handleTabClick('secret-santa')}
        className={`ios-tab-item ${activeTab === 'secret-santa' ? 'active text-emerald-400' : ''}`}
      >
        <Gift size={20} className={activeTab === 'secret-santa' ? 'text-emerald-400' : 'text-slate-400'} />
        <span>Secret Santa</span>
      </button>

      <button
        onClick={() => handleTabClick('white-elephant')}
        className={`ios-tab-item ${activeTab === 'white-elephant' ? 'active text-amber-400' : ''}`}
      >
        <Flame size={20} className={activeTab === 'white-elephant' ? 'text-amber-400' : 'text-slate-400'} />
        <span>White Elephant</span>
      </button>

      <button
        onClick={() => handleTabClick('gift-ideas')}
        className={`ios-tab-item ${activeTab === 'gift-ideas' ? 'active text-rose-400' : ''}`}
      >
        <Lightbulb size={20} className={activeTab === 'gift-ideas' ? 'text-rose-400' : 'text-slate-400'} />
        <span>Gift Ideas</span>
      </button>

      <button
        onClick={() => {
          sound.playClick();
          onOpenInstallModal();
        }}
        className="ios-tab-item text-sky-400 hover:text-sky-300"
      >
        <Smartphone size={20} />
        <span>iPhone App</span>
      </button>
    </nav>
  );
}
