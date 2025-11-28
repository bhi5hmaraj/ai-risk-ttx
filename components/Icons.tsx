import React from 'react';

const stroke = 'currentColor';

export const LoadingSpinner = () => (
  <svg className="h-6 w-6 animate-spin text-blue-400" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="4" strokeOpacity="0.2" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
  </svg>
);

export const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.8} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9.2 12.6 2.1 2 3.6-5.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.6} {...props}>
    <path d="M2.5 12C4.8 7.6 8.6 5 12 5s7.2 2.6 9.5 7c-2.3 4.4-6.1 7-9.5 7S4.8 16.4 2.5 12Z" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
);

export const EyeSlashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.6} {...props}>
    <path d="M3 3 21 21" strokeLinecap="round" />
    <path d="M5.5 6.5C3.7 8 2.5 10 2.5 12c2.3 4.4 6.1 7 9.5 7 1.5 0 3-.4 4.5-1.1" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20.6 8c1 1.2 1.9 2.6 2.9 4-2.3 4.4-6.1 7-9.5 7-.7 0-1.4-.1-2-.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.5 9.5a3 3 0 0 0 4 4" />
  </svg>
);

export const PauseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <rect x="6" y="4" width="4" height="16" rx="1.2" />
    <rect x="14" y="4" width="4" height="16" rx="1.2" />
  </svg>
);

export const PlayIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M8 5.5v13l9-6.5-9-6.5Z" />
  </svg>
);

export const ScaleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.6} {...props}>
    <path d="M12 4v3" strokeLinecap="round" />
    <path d="M5 12h14" />
    <path d="M8 12 11.2 18a1.6 1.6 0 0 1-1.4 2.3H6.2a1.6 1.6 0 0 1-1.4-2.3L8 12Zm8 0 3.2 6a1.6 1.6 0 0 1-1.4 2.3h-3.6a1.6 1.6 0 0 1-1.4-2.3L16 12Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const BuildingLibraryIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.6} {...props}>
    <path d="M4 10.5 12 4l8 6.5v9.5H4v-9.5Z" strokeLinejoin="round" />
    <path d="M9 12v5m6-5v5M12 12v5" />
    <path d="M3 20h18" strokeLinecap="round" />
  </svg>
);

export const CpuChipIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.6} {...props}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <rect x="10" y="10" width="4" height="4" rx="1" />
    <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m17.8-7.8L20 5.2M4 18.8 5.2 20m0-15.8L4 5.2M20 18.8 18.8 20" strokeLinecap="round" />
  </svg>
);

export const NewspaperIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.4} {...props}>
    <rect x="4" y="5" width="16" height="14" rx="2" />
    <path d="M8 9h4M8 12h4m3 0h3m-3 3h3" strokeLinecap="round" />
    <rect x="8" y="6" width="4" height="2" rx="0.5" fill={stroke} />
  </svg>
);

export const UserGroupIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.6} {...props}>
    <circle cx="8" cy="9" r="3" />
    <circle cx="16" cy="9" r="3" />
    <path d="M4.5 19c.6-2.6 2.9-4.5 5.5-4.5s4.9 1.9 5.5 4.5" strokeLinecap="round" />
    <path d="M15.5 19c.5-1.8 1.9-3 3.5-3" strokeLinecap="round" />
  </svg>
);

export const ShieldCheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.6} {...props}>
    <path d="M12 3 4.5 6v6a8.5 8.5 0 0 0 7.5 8.4A8.5 8.5 0 0 0 19.5 12V6L12 3Z" strokeLinejoin="round" />
    <path d="m9.5 12.5 2 2 3.5-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ExpandIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.6} {...props}>
    <path d="M4 9V4h5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 9V4h-5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 15v5h5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.8} {...props}>
    <path d="M6 6 18 18M6 18 18 6" strokeLinecap="round" />
  </svg>
);

export const BeakerIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.6} {...props}>
    <path d="M9.5 3v6l-4 9a2.2 2.2 0 0 0 2 3h9a2.2 2.2 0 0 0 2-3l-4-9V3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 12h8" strokeLinecap="round" />
  </svg>
);

export const ChatBubbleLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.6} {...props}>
    <path d="M6 18 3 21V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2} {...props}>
    <path d="M6 6 18 18M6 18 18 6" strokeLinecap="round" />
  </svg>
);

export const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2} {...props}>
    <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
  </svg>
);

export const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.6} {...props}>
    <path d="m4 10 8-7 8 7v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10Z" strokeLinejoin="round" />
    <path d="M9 21v-7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7" />
  </svg>
);

export const InformationCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.6} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-4m0-4h.01" strokeLinecap="round" />
  </svg>
);

export const BellIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.6} {...props}>
    <path d="M15 17h5l-1.4-1.4A6.5 6.5 0 0 1 17 11V9a5 5 0 0 0-10 0v2c0 1.7-.7 3.4-1.6 4.6L4 17h11Zm0 0v1a3 3 0 0 1-6 0v-1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.6} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Cog6ToothIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.6} {...props}>
    <path d="M9.6 3h4.8l.9 2.4a8 8 0 0 1 2 1.2l2.5-.5 2.4 4.2-1.8 1.8c.1.5.1 1 0 1.6l1.8 1.8-2.4 4.2-2.5-.5a8 8 0 0 1-2 1.2l-.9 2.4H9.6l-.9-2.4a8 8 0 0 1-2-1.2l-2.5.5-2.4-4.2 1.8-1.8c-.1-.5-.1-1 0-1.6L1.8 10.3l2.4-4.2 2.5.5a8 8 0 0 1 2-1.2L9.6 3Z" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const ShareIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} {...props}>
    <path d="M8.7 13.3a3.5 3.5 0 1 0 0-2.6l6.6-3.4a3.5 3.5 0 1 0-.8-1.5l-6.6 3.4a3.5 3.5 0 0 0 0 4.2l6.6 3.4a3.5 3.5 0 1 0 .8-1.5l-6.6-3.4Z" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6" cy="12" r="2" />
    <circle cx="18" cy="6" r="2" />
    <circle cx="18" cy="18" r="2" />
  </svg>
);
