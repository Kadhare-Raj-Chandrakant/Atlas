import type { SVGAttributes } from 'react'

const icons = {
  home: {
    viewBox: '0 0 24 24',
    paths: [
      'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    ],
  },
  journal: {
    viewBox: '0 0 24 24',
    paths: [
      'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    ],
  },
  entity: {
    viewBox: '0 0 24 24',
    paths: [
      'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    ],
  },
  search: {
    viewBox: '0 0 24 24',
    paths: [
      'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    ],
  },
  settings: {
    viewBox: '0 0 24 24',
    paths: [
      'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    ],
  },
  graph: {
    viewBox: '0 0 24 24',
    paths: [
      'M12 3a3 3 0 100 6 3 3 0 000-6zM5 18a3 3 0 100 6 3 3 0 000-6zM19 18a3 3 0 100 6 3 3 0 000-6zM8.5 8.5l-4 7M12 9v4M15.5 8.5l4 7',
    ],
  },
  chart: {
    viewBox: '0 0 24 24',
    paths: [
      'M4 20h16M4 20V4m0 16l4-8 4 4 4-8 4 4',
    ],
  },
} as const

export type IconName = keyof typeof icons

interface IconProps extends SVGAttributes<SVGSVGElement> {
  name: IconName
  size?: number
}

export function Icon({ name, size = 20, className, ...props }: IconProps) {
  const icon = icons[name]

  return (
    <svg
      width={size}
      height={size}
      viewBox={icon.viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {icon.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}
