import Link from "next/link";

type SparkleFinderLogoProps = {
  className?: string;
};

export function SparkleFinderLogo({ className = "" }: SparkleFinderLogoProps) {
  return (
    <Link
      aria-label="Sparkle Finder by Sparkle Suite home"
      className={`sparkle-finder-logo ${className}`.trim()}
      href="/"
    >
      <svg aria-hidden="true" className="sparkle-finder-seal" viewBox="0 0 64 64">
        <circle cx="32" cy="32" fill="#ffffff" r="30" stroke="currentColor" strokeWidth="0.75" />
        <text
          dominantBaseline="central"
          fill="currentColor"
          fontFamily="'Playfair Display', Georgia, serif"
          fontSize="32"
          fontStyle="italic"
          fontWeight="500"
          textAnchor="middle"
          x="32"
          y="32"
        >
          F
        </text>
      </svg>
      <span className="sparkle-finder-logo__wordmark">
        <span className="sparkle-finder-logo__name">Sparkle Finder</span>
        <span className="sparkle-finder-logo__byline">by Sparkle Suite</span>
      </span>
    </Link>
  );
}
