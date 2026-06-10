interface FallbackGlyphProps {
  primary: string;
  fallback: string;
  className?: string;
}

export function FallbackGlyph({ primary, fallback, className }: FallbackGlyphProps) {
  return (
    <span className={className} aria-label={`${primary} ${fallback}`}>
      <span aria-hidden="true">{primary}</span>
      <span className="fallback-alt" aria-hidden="true">
        {fallback}
      </span>
      <span className="sr-only">{fallback}</span>
    </span>
  );
}
