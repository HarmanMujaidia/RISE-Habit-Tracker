/** Rise logo pieces: the rising-sun tile and the rounded "rise" wordmark. */

/** Dark green tile with the rising-sun symbol. The file already has rounded corners. */
export function LogoTile({ size = 32, className = "" }: { size?: number; className?: string }) {
  return <img src="/rise-favicon.svg" alt="" width={size} height={size} className={`shrink-0 ${className}`} />;
}

/**
 * The lowercase "rise" wordmark, drawn from strokes so it follows the text colour.
 * The dot of the "i" is the sun and uses the app's green.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 -50 320 150" role="img" aria-label="Rise" fill="none" className={className}>
      <g stroke="currentColor" strokeWidth={20} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 10V90M10 56C10 30 24 10 52 10" />
        <path transform="translate(86 0)" d="M10 10V90" />
        <path transform="translate(130 0)" d="M56 31C56 19 46 10 33 10C20 10 10 18 10 30C10 42 22 46 33 50C46 54 56 58 56 70C56 82 46 90 33 90C20 90 10 82 10 70" />
        <path transform="translate(220 0)" d="M10 50H90A40 40 0 0 0 10 50A40 40 0 0 0 68.78 85.32" />
      </g>
      <circle cx="96" cy="-34" r="15.6" fill="var(--primary)" />
    </svg>
  );
}
