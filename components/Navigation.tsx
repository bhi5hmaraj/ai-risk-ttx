import React, { useState } from 'react';
import { Bars3Icon, XMarkIcon, HomeIcon, ChatBubbleLeftIcon, InformationCircleIcon, BellIcon } from './Icons';

interface NavigationProps {
  onNavigateHome: () => void;
  onOpenFeedback: () => void;
  onOpenAbout: () => void;
  onOpenUpdates: () => void;
  showFeedback?: boolean; // Only show feedback option when in game
}

export const Navigation: React.FC<NavigationProps> = ({
  onNavigateHome,
  onOpenFeedback,
  onOpenAbout,
  onOpenUpdates,
  showFeedback = false,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  const handleNavigateHome = () => {
    onNavigateHome();
    closeMenu();
  };

  const handleOpenFeedback = () => {
    onOpenFeedback();
    closeMenu();
  };

  const handleOpenAbout = () => {
    onOpenAbout();
    closeMenu();
  };

  const handleOpenUpdates = () => {
    onOpenUpdates();
    closeMenu();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-blue-300">Simulacra</h1>
            <span className="text-xs text-gray-500 hidden sm:inline">AI Tabletop Exercise</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            <NavButton onClick={handleNavigateHome} icon={HomeIcon} label="Home" />
            {showFeedback && (
              <NavButton onClick={handleOpenFeedback} icon={ChatBubbleLeftIcon} label="Feedback" />
            )}
            <NavButton onClick={handleOpenUpdates} icon={BellIcon} label="Updates" />
            <NavButton onClick={handleOpenAbout} icon={InformationCircleIcon} label="About" />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-800 bg-gray-900">
          <div className="px-4 py-3 space-y-2">
            <MobileNavButton onClick={handleNavigateHome} icon={HomeIcon} label="Home" />
            {showFeedback && (
              <MobileNavButton onClick={handleOpenFeedback} icon={ChatBubbleLeftIcon} label="Feedback" />
            )}
            <MobileNavButton onClick={handleOpenUpdates} icon={BellIcon} label="Updates" />
            <MobileNavButton onClick={handleOpenAbout} icon={InformationCircleIcon} label="About" />
          </div>
        </div>
      )}
    </nav>
  );
};

// Desktop Navigation Button
const NavButton: React.FC<{
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}> = ({ onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
  >
    <Icon className="h-5 w-5" />
    <span>{label}</span>
  </button>
);

// Mobile Navigation Button
const MobileNavButton: React.FC<{
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}> = ({ onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 w-full px-4 py-3 rounded-md text-left text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
  >
    <Icon className="h-5 w-5" />
    <span className="font-medium">{label}</span>
  </button>
);
