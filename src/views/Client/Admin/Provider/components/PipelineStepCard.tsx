'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Collapse from '@mui/material/Collapse'

const STEP_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#6366f1']
const STEP_BG = ['#eff6ff', '#f5f3ff', '#ecfeff', '#ecfdf5', '#fffbeb', '#eef2ff']
const STEP_BORDER = ['#93c5fd', '#c4b5fd', '#67e8f9', '#6ee7b7', '#fcd34d', '#a5b4fc']

interface PipelineStepCardProps {
  step: number
  title: string

  /** Đoạn giảng giải dài — ẩn được bằng công tắc "Hướng dẫn" ở tiêu đề modal (class provider-guide). */
  description?: string

  /**
   * Tóm tắt GIÁ TRỊ THẬT đang cấu hình, hiện khi khối bị thu lại
   * (VD: 'POST bestproxy.vn/muaproxy.php · token ở query "key" · 3 mốc thời hạn').
   * Nhìn 5 giây là biết bước này đang set gì, không phải bung ra rà từng ô.
   */
  summary?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  sx?: object
}

export default function PipelineStepCard({
  step,
  title,
  description,
  summary,
  defaultOpen = true,
  children,
  sx
}: PipelineStepCardProps) {
  const [open, setOpen] = useState(defaultOpen)

  const color = STEP_COLORS[(step - 1) % STEP_COLORS.length]
  const bg = STEP_BG[(step - 1) % STEP_BG.length]
  const border = STEP_BORDER[(step - 1) % STEP_BORDER.length]

  return (
    <Box sx={{
      border: `1px solid ${border}`,
      borderTop: `3px solid ${color}`,
      borderRadius: 2,
      background: '#fff',
      overflow: 'hidden',
      ...sx,
    }}>
      {/* Header — bấm vào để thu/bung khối */}
      <Box
        onClick={() => setOpen(o => !o)}
        sx={{
          background: bg,
          borderBottom: `1px solid ${border}`,
          px: 2, py: 1.5,
          display: 'flex', alignItems: 'flex-start', gap: 1.5,
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': { filter: 'brightness(0.98)' }
        }}
      >
        <Box sx={{
          width: 30, height: 30, borderRadius: '50%',
          background: color, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, flexShrink: 0,
          boxShadow: `0 2px 6px ${color}50`,
          mt: 0.25,
        }}>
          {step}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: color, lineHeight: 1.4 }}>
            {title}
          </Typography>

          {/* Giảng giải: ẩn/hiện theo công tắc "Hướng dẫn" */}
          {description && (
            <Typography className='provider-guide' sx={{ fontSize: 12, color: '#475569', lineHeight: 1.6, mt: 0.5 }}>
              {description}
            </Typography>
          )}

          {/* Thu lại → hiện tóm tắt giá trị đang set */}
          {!open && summary && (
            <Typography sx={{ fontSize: 12, color: '#334155', mt: 0.5, wordBreak: 'break-word' }}>
              {summary}
            </Typography>
          )}
        </Box>
        <Box
          component='i'
          className={open ? 'tabler-chevron-up' : 'tabler-chevron-down'}
          sx={{ fontSize: 18, color, flexShrink: 0, mt: 0.5 }}
        />
      </Box>

      {/* Content */}
      <Collapse in={open} unmountOnExit={false}>
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      </Collapse>
    </Box>
  )
}
