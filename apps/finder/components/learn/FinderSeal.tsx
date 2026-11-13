type FinderSealProps = {
  className?: string;
};

/** Wart Amethyst seal. F is optically left of center (x=30.144). Pink never paints the circle or the F. */
export function FinderSeal({ className }: FinderSealProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 64 64">
      <circle
        cx="32"
        cy="32"
        fill="var(--finder-seal-fill)"
        r="30"
        stroke="var(--finder-seal-stroke)"
        strokeWidth="0.9"
      />
      <text
        dominantBaseline="central"
        fill="var(--finder-violet-f)"
        fontFamily="var(--font-playfair), Georgia, serif"
        fontSize="32"
        fontStyle="italic"
        fontWeight="500"
        textAnchor="middle"
        x="30.144"
        y="32.384"
      >
        F
      </text>
    </svg>
  );
}
