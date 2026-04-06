'use client'

import { useState, useCallback } from 'react'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import IconButton from '@mui/material/IconButton'
import { Download, X, FileSpreadsheet, FileText, CheckSquare } from 'lucide-react'

/* ── Types ── */
export interface ExportColumn {
  key: string
  label: string
  /** Trích xuất giá trị từ row, trả về string */
  accessor: (row: any) => string
  /** Mặc định chọn hay không (default: true) */
  defaultChecked?: boolean
}

export type ExportFormat = 'csv' | 'tsv'

interface ExportModalProps {
  open: boolean
  onClose: () => void
  /** Tên file khi download (không cần extension) */
  fileName: string
  /** Danh sách cột có thể export */
  columns: ExportColumn[]
  /** Dữ liệu cần export */
  data: any[]
}

/* ── Helpers ── */
const escapeField = (val: string, separator: string) => {
  if (val.includes(separator) || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }

  return val
}

const buildFile = (data: any[], columns: ExportColumn[], selectedKeys: Set<string>, format: ExportFormat) => {
  const cols = columns.filter(c => selectedKeys.has(c.key))
  const separator = format === 'tsv' ? '\t' : ','
  const headerRow = cols.map(c => escapeField(c.label, separator)).join(separator)

  const bodyRows = data.map(row =>
    cols.map(c => escapeField(c.accessor(row), separator)).join(separator)
  )

  const bom = '\uFEFF'
  const mimeType = format === 'tsv' ? 'text/tab-separated-values;charset=utf-8;' : 'text/csv;charset=utf-8;'

  return new Blob([bom + [headerRow, ...bodyRows].join('\n')], { type: mimeType })
}

const downloadBlob = (blob: Blob, fileName: string, format: ExportFormat) => {
  const ext = format === 'tsv' ? '.tsv' : '.csv'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')

  a.href = url
  a.download = `${fileName}${ext}`
  a.click()
  URL.revokeObjectURL(url)
}

/* ── Component ── */
export default function ExportModal({ open, onClose, fileName, columns, data }: ExportModalProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() =>
    new Set(columns.filter(c => c.defaultChecked !== false).map(c => c.key))
  )
  const [format, setFormat] = useState<ExportFormat>('csv')

  const allChecked = selectedKeys.size === columns.length
  const someChecked = selectedKeys.size > 0 && !allChecked

  const toggleColumn = useCallback((key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev)

      if (next.has(key)) next.delete(key)
      else next.add(key)

      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (allChecked) {
      setSelectedKeys(new Set())
    } else {
      setSelectedKeys(new Set(columns.map(c => c.key)))
    }
  }, [allChecked, columns])

  const handleExport = useCallback(() => {
    if (selectedKeys.size === 0 || data.length === 0) return

    const blob = buildFile(data, columns, selectedKeys, format)

    downloadBlob(blob, fileName, format)
    onClose()
  }, [selectedKeys, data, columns, format, fileName, onClose])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='xs'
      fullWidth
      PaperProps={{
        sx: { borderRadius: '12px', overflow: 'hidden' }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 1.5,
          px: 2.5,
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          fontSize: '15px',
          fontWeight: 700
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={18} />
          Xuất dữ liệu
        </span>
        <IconButton size='small' onClick={onClose}>
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pt: 2, pb: 1 }}>
        {/* Format */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 8px', color: 'var(--mui-palette-text-primary)' }}>
            Định dạng
          </p>
          <RadioGroup
            row
            value={format}
            onChange={e => setFormat(e.target.value as ExportFormat)}
            sx={{ gap: '4px' }}
          >
            <FormControlLabel
              value='csv'
              control={<Radio size='small' />}
              label={
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                  <FileSpreadsheet size={14} /> CSV
                </span>
              }
              sx={{ mr: 3 }}
            />
            <FormControlLabel
              value='tsv'
              control={<Radio size='small' />}
              label={
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                  <FileText size={14} /> TSV (Tab)
                </span>
              }
            />
          </RadioGroup>
        </div>

        {/* Columns */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: 'var(--mui-palette-text-primary)' }}>
              Chọn cột ({selectedKeys.size}/{columns.length})
            </p>
            <Button
              size='small'
              onClick={toggleAll}
              sx={{ fontSize: '12px', textTransform: 'none', minWidth: 'auto', px: 1 }}
              startIcon={<CheckSquare size={13} />}
            >
              {allChecked ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </Button>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0',
              maxHeight: '260px',
              overflowY: 'auto',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '8px',
              padding: '4px 8px'
            }}
          >
            {columns.map(col => (
              <FormControlLabel
                key={col.key}
                control={
                  <Checkbox
                    size='small'
                    checked={selectedKeys.has(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    sx={{ py: 0.5 }}
                  />
                }
                label={<span style={{ fontSize: '13px' }}>{col.label}</span>}
                sx={{ mx: 0 }}
              />
            ))}
          </div>
        </div>

        {/* Preview count */}
        <p
          style={{
            fontSize: '12px',
            color: 'var(--mui-palette-text-disabled, #94a3b8)',
            margin: '12px 0 0',
            textAlign: 'right'
          }}
        >
          {data.length.toLocaleString('vi-VN')} dòng sẽ được xuất
        </p>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
        <Button onClick={onClose} size='small' sx={{ textTransform: 'none', fontSize: '13px' }}>
          Hủy
        </Button>
        <Button
          variant='contained'
          size='small'
          disabled={selectedKeys.size === 0}
          onClick={handleExport}
          sx={{
            textTransform: 'none',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '8px',
            boxShadow: 'none',
            gap: '6px',
            color: '#fff',
            px: 2
          }}
          startIcon={<Download size={15} />}
        >
          Xuất file
        </Button>
      </DialogActions>
    </Dialog>
  )
}
