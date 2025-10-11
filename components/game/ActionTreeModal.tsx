import React from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '../Icons';

interface ActionTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onReset?: () => void;
  children: React.ReactNode;
}

export const ActionTreeModal: React.FC<ActionTreeModalProps> = ({ isOpen, onClose, title, onReset, children }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-blue-500 rounded-lg w-full h-full max-w-7xl max-h-[90vh] p-4 flex flex-col">
        <div className="flex justify-between items-center mb-2 flex-shrink-0">
          <h3 className="text-xl font-bold text-blue-300">{title}</h3>
          <div className="flex items-center space-x-2">
            {onReset && (
              <button
                onClick={onReset}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded-md text-xs"
              >
                Reset View
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600">
              <CloseIcon className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
        <div className="flex-grow h-full w-full overflow-hidden rounded-md border border-gray-800 bg-gray-950">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
