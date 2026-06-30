interface IconProps {
  id: string;
  size?: number;
  className?: string;
  label?: string;
}

// Mirrors the legacy inline `<svg><use href="…sprite.svg#id">` markup. The sprite
// lives in public/ so the href resolves at runtime (not bundled/fingerprinted).
export function Icon({ id, size = 22, className, label }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    >
      <use href={`/assets/icons/sprite.svg#${id}`} />
    </svg>
  );
}
