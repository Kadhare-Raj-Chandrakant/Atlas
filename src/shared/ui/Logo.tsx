import type { SVGAttributes } from 'react'

interface LogoProps extends SVGAttributes<SVGSVGElement> {
  size?: number
}

export function Logo({ size = 32, className, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      {...props}
    >
      <circle
        cx="16"
        cy="16"
        r="15"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.4"
      />
      <path d="M16 5l10 22H6l10-22z" fill="currentColor" />
    </svg>
  )
}
