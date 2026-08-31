import React from 'react';
import { Home, Wrench, FolderOpen, Settings, Info, PenTool } from 'lucide-react';
import { ScreenType } from '../types';

interface NavigationProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentScreen, onNavigate }) => {
  const navItems = [
    { id: 'home' as ScreenType, label: 'Home', icon: Home },
    { id: 'tools' as ScreenType, label: 'Tools', icon: Wrench },
    { id: 'sign' as ScreenType, label: 'Sign', icon: PenTool },
    { id: 'browse' as ScreenType, label: 'Library', icon: FolderOpen },
    { id: 'settings' as ScreenType, label: 'Settings', icon: Settings },
    { id: 'about' as ScreenType, label: 'About', icon: Info },
  ];

  return (
    <nav className="sticky bottom-0 z-30 flex w-full border-t border-neutral-200/80 bg-white/95 backdrop-blur-md px-2 py-1 shadow-xs">
      <div className="mx-auto flex w-full max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-1 flex-col items-center py-1.5 px-1 transition-all ${
                isActive
                  ? 'text-blue-600 font-semibold scale-105'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.25]' : 'stroke-[1.75]'}`} />
              <span className="mt-1 text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
