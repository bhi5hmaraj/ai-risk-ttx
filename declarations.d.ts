declare module 'cytoscape-dagre';

// Stubs to allow compiling before CopilotKit is installed
declare module 'copilotkit/react' {
  export const CopilotProvider: any;
  export const CopilotChat: any;
  export function useCopilotAction(...args: any[]): any;
}

// Newer package names
declare module '@copilotkit/react-core' {
  export const CopilotKit: any;
  export const CopilotProvider: any;
  export function useCopilotAction(...args: any[]): any;
}
declare module '@copilotkit/react-ui' {
  export const CopilotChat: any;
}

declare module 'express' {
  const express: any;
  export default express;
  export interface Request {
    [key: string]: any;
  }
  export interface Response {
    status(code: number): Response;
    send(body: any): Response;
    json(body: any): Response;
    [key: string]: any;
  }
}

declare module 'cors' {
  export default function cors(options?: any): any;
}
