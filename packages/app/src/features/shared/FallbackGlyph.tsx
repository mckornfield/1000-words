interface FallbackGlyphProps {
  /** The emoji or Unicode glyph to display as the primary visual. */
  primary: string;
  /**
   * Text shown alongside the emoji for systems that cannot render Unicode
   * glyphs (e.g. some terminal-based browsers or assistive tech that announces
   * emoji literally). Also used as the screen-reader label.
   */
  fallback: string;
  /** Optional class name forwarded to the outer wrapper span. */
  className?: string;
}

/**
 * Renders an emoji with an accessible text fallback.
 *
 * Structure:
 *   - Primary emoji (aria-hidden — screen readers skip it)
 *   - Fallback text styled as muted/small (aria-hidden — visual only)
 *   - sr-only span with the fallback text for screen readers
 *
 * The fallback-alt span is always visible; it intentionally provides a brief
 * text cue for environments where the emoji glyph may not render (e.g. some
 * older Android WebViews, terminal browsers). If you want emoji-only display,
 * remove the fallback-alt span and rely solely on the sr-only span.
 */
export function FallbackGlyph({ primary, fallback, className }: FallbackGlyphProps) {
  return (
    <span className={className} aria-label={fallback}>
      <span aria-hidden="true">{primary}</span>
      <span className="sr-only">{fallback}</span>
    </span>
  );
}
