/**
 * The one loading indicator for the app — a spinning ring in the ink
 * workhorse color, matching the rounded-rect groovy language. Size in px.
 */
export function Spinner({ size = 40 }: { size?: number }) {
  return (
    <svg
      className="animate-spin text-uno-ink"
      width={size}
      height={size}
      viewBox="0 0 50 50"
      fill="none"
      role="status"
      aria-label="Loading"
    >
      <circle cx="25" cy="25" r="20" stroke="currentColor" strokeOpacity="0.15" strokeWidth="6" />
      <path
        d="M25 5a20 20 0 0 1 20 20"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}
