import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import type cytoscapeType from 'cytoscape';
import type { GameLogEntry } from '../../types';
import { CloseIcon } from '../Icons';

cytoscape.use(dagre);

interface ActionTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  logEntry: GameLogEntry | null;
  stylesheet: cytoscapeType.Stylesheet[];
  elements: cytoscapeType.ElementDefinition[];
}

export const ActionTreeModal: React.FC<ActionTreeModalProps> = ({ isOpen, onClose, logEntry, stylesheet, elements }) => {
  const cyRef = useRef<cytoscapeType.Core | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const container = document.getElementById('action-tree-modal-root');
    if (!container) return;

    const cy = cytoscape({
      container,
      elements,
      stylesheet,
      layout: { name: 'dagre', rankDir: 'TB', spacingFactor: 1.2 } as any,
    });

    cy.maxZoom(2);
    cy.minZoom(0.1);
    cy.fit();
    cy.center();
    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [isOpen, elements, stylesheet]);

  const handleResetView = () => {
    if (cyRef.current) {
      cyRef.current.fit();
      cyRef.current.center();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-blue-500 rounded-lg w-full h-full max-w-7xl max-h-[90vh] p-4 flex flex-col">
        <div className="flex justify-between items-center mb-2 flex-shrink-0">
          <h3 className="text-xl font-bold text-blue-300">Full Action Tree (Round {logEntry?.round})</h3>
          <div className="flex items-center space-x-2">
            <button onClick={handleResetView} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded-md text-xs">
              Reset View
            </button>
            <button onClick={onClose} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600">
              <CloseIcon className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
        <div className="flex-grow h-full w-full">
          <div id="action-tree-modal-root" className="w-full h-full" />
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
