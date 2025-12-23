interface ElegantDividerProps {
  className?: string;
}

export function ElegantDivider({ className = "" }: ElegantDividerProps) {
  return (
    <svg
      className={`divider-elegant ${className}`}
      viewBox="0 0 200 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <path
        d="M0 10 Q 25 5, 50 10 T 100 10 T 150 10 T 200 10"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="100" cy="10" r="3" fill="currentColor" opacity="0.6" />
      <circle cx="50" cy="10" r="2" fill="currentColor" opacity="0.4" />
      <circle cx="150" cy="10" r="2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

export function SubtleDivider({ className = "" }: ElegantDividerProps) {
  return (
    <svg
      className={`divider-subtle ${className}`}
      viewBox="0 0 200 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <path
        d="M0 5 Q 50 2, 100 5 T 200 5"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
