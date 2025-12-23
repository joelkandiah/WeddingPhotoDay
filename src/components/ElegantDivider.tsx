interface DividerProps {
  className?: string;
}

export function ElegantDivider({ className = "" }: DividerProps) {
  return (
    <svg
      className={`divider-elegant ${className}`}
      viewBox="0 0 200 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <path
        d="M0 6 Q 25 3, 50 6 T 100 6 T 150 6 T 200 6"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="100" cy="6" r="2" fill="currentColor" opacity="0.5" />
      <circle cx="50" cy="6" r="1.5" fill="currentColor" opacity="0.3" />
      <circle cx="150" cy="6" r="1.5" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

export function SubtleDivider({ className = "" }: DividerProps) {
  return (
    <svg
      className={`divider-subtle ${className}`}
      viewBox="0 0 200 6"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <path
        d="M0 3 Q 50 1.5, 100 3 T 200 3"
        stroke="currentColor"
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
