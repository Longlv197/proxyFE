export const ROTATION_MODE = {
  STATIC: 'static',
  ROTATE_API: 'rotate_api',
  ROTATE_AUTO: 'rotate_auto',
} as const

export type RotationMode = typeof ROTATION_MODE[keyof typeof ROTATION_MODE]

export const ROTATION_MODE_LABELS: Record<string, string> = {
  [ROTATION_MODE.STATIC]: 'Proxy tĩnh',
  [ROTATION_MODE.ROTATE_API]: 'Xoay qua API',
  [ROTATION_MODE.ROTATE_AUTO]: 'Tự xoay',
}
