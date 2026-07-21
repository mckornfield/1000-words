/**
 * Self-contained SVG icons used in place of emoji.
 * Color emoji glyphs depend on the OS font (Apple Color Emoji / Noto Color
 * Emoji); when that font is missing or broken — as on some iOS Simulator
 * runtimes — emoji render as empty "tofu" boxes. These SVGs render
 * identically everywhere regardless of any system font.
 */
import type { CSSProperties, ReactElement } from "react";

interface IconProps {
  size?: number | string;
  style?: CSSProperties;
}

function baseStyle(size: number | string | undefined, style?: CSSProperties): CSSProperties {
  return { width: size ?? "1em", height: size ?? "1em", display: "inline-block", verticalAlign: "-0.125em", ...style };
}

export function FireIcon({ size, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" style={baseStyle(size, style)} aria-hidden="true">
      <path fill="#f59e0b" d="M12 2c1 3-2 4-2 7a3 3 0 0 0 6 0c1 1 2 3 2 5a7 7 0 1 1-14 0c0-4 3-6 4-9 1 1 1 2 1 3 1-2 2-4 3-6Z" />
      <path fill="#dc2626" d="M12 22a5 5 0 0 1-5-5c0-2.2 1.3-3.6 2.3-5 .2 1 .6 1.8 1.2 2.4a2.5 2.5 0 0 0 4.9-.8c.9 1 1.6 2.3 1.6 3.4a5 5 0 0 1-5 5Z" />
    </svg>
  );
}

export function TrophyIcon({ size, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" style={baseStyle(size, style)} aria-hidden="true">
      <path fill="#f59e0b" d="M7 3h10v6a5 5 0 0 1-10 0V3Z" />
      <path fill="none" stroke="#f59e0b" strokeWidth="1.6" d="M7 5H4a3 3 0 0 0 3 5M17 5h3a3 3 0 0 1-3 5" />
      <rect x="10.5" y="14" width="3" height="4" fill="#d97706" />
      <rect x="7" y="19" width="10" height="2" rx="1" fill="#d97706" />
    </svg>
  );
}

export function StarIcon({ size, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" style={baseStyle(size, style)} aria-hidden="true">
      <path fill="#f59e0b" d="M12 2.5 14.9 9l7.1.6-5.4 4.7 1.6 6.9L12 17.6l-6.2 3.6 1.6-6.9L2 9.6 9.1 9 12 2.5Z" />
    </svg>
  );
}

export function BookIcon({ size, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" style={baseStyle(size, style)} aria-hidden="true">
      <path fill="#c0392b" d="M4 4.5A1.5 1.5 0 0 1 5.5 3H11v18H5.5A1.5 1.5 0 0 1 4 19.5v-15Z" />
      <path fill="#7f1d1d" d="M20 4.5A1.5 1.5 0 0 0 18.5 3H13v18h5.5a1.5 1.5 0 0 0 1.5-1.5v-15Z" />
      <rect x="11" y="3" width="2" height="18" fill="#f2efe9" />
    </svg>
  );
}

export function TargetIcon({ size, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" style={baseStyle(size, style)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="#dc2626" />
      <circle cx="12" cy="12" r="6" fill="#f2efe9" />
      <circle cx="12" cy="12" r="3" fill="#dc2626" />
    </svg>
  );
}

export function ShoppingBagIcon({ size, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" style={baseStyle(size, style)} aria-hidden="true">
      <path fill="#0284c7" d="M5.5 8h13l1 12.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5L5.5 8Z" />
      <path fill="none" stroke="#0284c7" strokeWidth="1.6" d="M8.5 8V6a3.5 3.5 0 0 1 7 0v2" />
    </svg>
  );
}

export function PersonIcon({ size, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" style={baseStyle(size, style)} aria-hidden="true">
      <circle cx="12" cy="8" r="4" fill="#374151" />
      <path fill="#374151" d="M4 21a8 8 0 0 1 16 0Z" />
    </svg>
  );
}

export function FlagES({ size, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 16" style={baseStyle(size, style)} aria-hidden="true">
      <rect width="24" height="16" fill="#c60b1e" />
      <rect y="4" width="24" height="8" fill="#ffc400" />
    </svg>
  );
}

export function FlagCN({ size, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 16" style={baseStyle(size, style)} aria-hidden="true">
      <rect width="24" height="16" fill="#de2910" />
      <path fill="#ffde00" d="m4 3 .6 1.8H6.4L5 5.9l.6 1.8L4 6.6 2.4 7.7 3 5.9 1.6 4.8h1.8L4 3Z" />
      <circle cx="8.5" cy="2" r=".7" fill="#ffde00" />
      <circle cx="9.8" cy="4" r=".7" fill="#ffde00" />
      <circle cx="9.8" cy="6.5" r=".7" fill="#ffde00" />
      <circle cx="8.5" cy="8.5" r=".7" fill="#ffde00" />
    </svg>
  );
}

export function FlagKR({ size, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 16" style={baseStyle(size, style)} aria-hidden="true">
      <rect width="24" height="16" fill="#fff" />
      <circle cx="12" cy="8" r="3.2" fill="#cd2e3a" />
      <path fill="#0047a0" d="M12 4.8a3.2 3.2 0 0 0 0 6.4 1.6 1.6 0 0 1 0-3.2 1.6 1.6 0 0 0 0-3.2Z" />
      <g fill="#000">
        <rect x="3" y="3.2" width="3" height=".7" /><rect x="3" y="4.3" width="3" height=".7" />
        <rect x="3" y="11.5" width="3" height=".7" /><rect x="3" y="12.6" width="3" height=".7" />
        <rect x="18" y="3.2" width="3" height=".7" /><rect x="18" y="4.3" width="3" height=".7" /><rect x="18" y="5.4" width="3" height=".7" />
        <rect x="18" y="11.5" width="3" height=".7" /><rect x="18" y="10.4" width="3" height=".7" /><rect x="18" y="12.6" width="3" height=".7" />
      </g>
    </svg>
  );
}

export function FlagJP({ size, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 16" style={baseStyle(size, style)} aria-hidden="true">
      <rect width="24" height="16" fill="#fff" />
      <circle cx="12" cy="8" r="4.4" fill="#bc002d" />
    </svg>
  );
}

export function HomeIcon({ size, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" style={baseStyle(size, style)} aria-hidden="true">
      <path fill="currentColor" d="M12 3 3 10.5V21h6v-6h6v6h6V10.5L12 3Z" />
    </svg>
  );
}

export function GearIcon({ size, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" style={baseStyle(size, style)} aria-hidden="true">
      <path fill="currentColor" d="m19.4 13-1.6-.9a7.6 7.6 0 0 0 0-2.2l1.6-.9-2-3.4-1.7.8a7.5 7.5 0 0 0-1.9-1.1l-.2-1.8h-4l-.2 1.8a7.5 7.5 0 0 0-1.9 1.1l-1.7-.8-2 3.4 1.6.9a7.6 7.6 0 0 0 0 2.2l-1.6.9 2 3.4 1.7-.8a7.5 7.5 0 0 0 1.9 1.1l.2 1.8h4l.2-1.8a7.5 7.5 0 0 0 1.9-1.1l1.7.8 2-3.4Zm-7.4 1.3a3.3 3.3 0 1 1 0-6.6 3.3 3.3 0 0 1 0 6.6Z" />
    </svg>
  );
}

export function HourglassIcon({ size, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" style={baseStyle(size, style)} aria-hidden="true">
      <path fill="currentColor" d="M6 3h12v1.5l-4.5 5.5v4l4.5 5.5V21H6v-1.5l4.5-5.5v-4L6 4.5V3Z" />
    </svg>
  );
}

export function HalfProgressIcon({ size, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" style={baseStyle(size, style)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path fill="currentColor" d="M12 3a9 9 0 0 1 0 18Z" />
    </svg>
  );
}

export function LockedIcon({ size, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" style={baseStyle(size, style)} aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="2" d="M7 10V7a5 5 0 0 1 10 0v3" />
      <rect x="5" y="10" width="14" height="10" rx="1.5" fill="currentColor" />
    </svg>
  );
}

export function CoinIcon({ size, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" style={baseStyle(size, style)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="#f2b807" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="#c8890a" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="6" fill="none" stroke="#c8890a" strokeWidth="1" />
    </svg>
  );
}

export function PartyIcon({ size, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" style={baseStyle(size, style)} aria-hidden="true">
      <path fill="#c0392b" d="M4 20 9 9l6 6-11 5Z" />
      <circle cx="18" cy="5" r="1.4" fill="#f59e0b" />
      <circle cx="21" cy="10" r="1" fill="#0284c7" />
      <circle cx="15" cy="3" r="1" fill="#16a34a" />
    </svg>
  );
}

export function GiftIcon({ size, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" style={baseStyle(size, style)} aria-hidden="true">
      <rect x="4" y="10" width="16" height="10" fill="#c0392b" />
      <rect x="4" y="7" width="16" height="3.5" fill="#7f1d1d" />
      <rect x="11" y="7" width="2" height="13" fill="#f2efe9" />
      <path fill="#7f1d1d" d="M12 7C10 3 6 5 8 7.5c1 1 3 .5 4-.5ZM12 7c2-4 6-2 4 .5-1 1-3 .5-4-.5Z" />
    </svg>
  );
}

function medalStyle(color: string, size: IconProps["size"], style?: CSSProperties): ReactElement {
  return (
    <svg viewBox="0 0 24 24" style={baseStyle(size, style)} aria-hidden="true">
      <path fill={color} opacity={0.6} d="m7 3 5 8-3 2-6-8Z" />
      <path fill={color} opacity={0.6} d="m17 3-5 8 3 2 6-8Z" />
      <circle cx="12" cy="15" r="6" fill={color} />
      <circle cx="12" cy="15" r="4" fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth="1" />
    </svg>
  );
}

export function GoldMedalIcon(props: IconProps) { return medalStyle("#f2b807", props.size, props.style); }
export function SilverMedalIcon(props: IconProps) { return medalStyle("#b8bfc7", props.size, props.style); }
export function BronzeMedalIcon(props: IconProps) { return medalStyle("#c2703d", props.size, props.style); }

export function SpeakerIcon({ size, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" style={baseStyle(size, style)} aria-hidden="true">
      <path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4V9Z" />
      <path fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
    </svg>
  );
}

export function MicIcon({ size, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" style={baseStyle(size, style)} aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
      <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" />
    </svg>
  );
}

export function SpinnerIcon({ size, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" style={baseStyle(size, style)} aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" d="M12 3a9 9 0 1 1-6.36 2.64" />
    </svg>
  );
}

export type IconComponent = (props: IconProps) => ReactElement;

export const FLAG_ICONS: Record<string, IconComponent> = {
  "en-es": FlagES,
  "en-zh": FlagCN,
  "en-ko": FlagKR,
  "en-ja": FlagJP,
};
