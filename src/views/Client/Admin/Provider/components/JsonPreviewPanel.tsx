import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

interface JsonPreviewPanelProps {
  jsonPreview: string
}

// Cột này tự cuộn trong chiều cao được cấp — KHÔNG sticky nữa (sticky + maxHeight tính theo 100vh
// là thứ tạo ra thanh cuộn ngoài dư ~46px; cuộn trúng nó là rail tab + thanh Proxy xoay/tĩnh trôi mất).
export default function JsonPreviewPanel({ jsonPreview }: JsonPreviewPanelProps) {
  return (
    <Box sx={{ height: { md: '100%' }, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Typography variant='subtitle2' fontWeight={600} sx={{ mb: 1 }}>
        api_config (JSON Preview)
      </Typography>
      <Box
        component='pre'
        sx={{
          bgcolor: 'grey.900',
          color: '#a5d6a7',
          p: 2,
          borderRadius: 1,
          fontSize: '0.75rem',
          lineHeight: 1.5,
          overflow: 'auto',

          // KHÔNG flex:1 — config ngắn thì khối đen co theo nội dung (thêm mới NCC chỉ có 1 dòng),
          // config dài thì flex tự co lại vừa khung và cuộn bên trong.
          minHeight: 0,
          maxHeight: { xs: '60vh', md: '100%' },
          fontFamily: '"Fira Code", "Consolas", monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {jsonPreview}
      </Box>
    </Box>
  )
}
