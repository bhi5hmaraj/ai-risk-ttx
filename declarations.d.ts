declare module 'cytoscape-dagre';

// Stubs to allow compiling before CopilotKit is installed
declare module 'copilotkit/react' {
  export const CopilotProvider: any;
  export const CopilotChat: any;
  export function useCopilotAction(...args: any[]): any;
}
