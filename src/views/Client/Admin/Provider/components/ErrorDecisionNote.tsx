'use client'

import { memo } from 'react'
import type { ReactNode } from 'react'
import { useWatch } from 'react-hook-form'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import type { BuySectionProps } from '../ProviderFormTypes'

/**
 * Ghi chú "hệ thống quyết định lỗi thế nào" trong form nhà cung cấp.
 *
 * LUÔN HIỆN, không gắn class `provider-guide`: đây là luật để điền đúng cấu hình, không phải lời giảng.
 * Mỗi câu ở đây khớp với code BE tại thời điểm viết, sửa BE thì sửa luôn ở đây:
 *   - Mua:        GenericOrderProcessor::processOrder + DefaultHandler::checkError / matchErrorCode
 *   - Lấy proxy:  FetchProviderItems (khối "Check success")
 *   - Gia hạn:    GenericRenewalProcessor::callRenewApi + extractErrorMessage
 *   - Xoay:       DefaultHandler (khối gọi API xoay) + RotateProxyService (ProxyFormat::isValid)
 *
 * Tách thành component riêng có useWatch của riêng nó để gõ vào ô mã lỗi chỉ vẽ lại khối này,
 * không vẽ lại cả bước (gõ tiếng Việt trong form lớn từng bị khựng vì re-render).
 */

type Row = { when: ReactNode; result: ReactNode; next: ReactNode; warn?: boolean }

const code = (text: ReactNode) => (
  <Box component='code' sx={{ fontFamily: 'monospace', fontSize: 11.5, wordBreak: 'break-word' }}>{text}</Box>
)

const NoteBox = ({ title, children }: { title: string; children: ReactNode }) => (
  <Box sx={{ p: 1.5, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.primary', mb: 0.75 }}>{title}</Typography>
    {children}
  </Box>
)

const Line = ({ children, warn }: { children: ReactNode; warn?: boolean }) => (
  <Typography sx={{ fontSize: 12, lineHeight: 1.6, mt: 0.5, color: warn ? 'warning.dark' : 'text.secondary', fontWeight: warn ? 600 : 400 }}>
    {children}
  </Typography>
)

/** Bước 2 tab Mua: nhận kết quả xong thì kết luận gì, đơn đi đâu. Hiện đúng theo dạng kết quả đang chọn. */
export const BuyErrorDecisionNote = memo(function BuyErrorDecisionNote({ prefix, control }: BuySectionProps) {
  const type = useWatch({ control, name: `${prefix}.response.type` }) || 'object'
  const mode = useWatch({ control, name: `${prefix}.response_mode` })
  const successField = useWatch({ control, name: `${prefix}.response.success_field` })
  const successValue = useWatch({ control, name: `${prefix}.response.success_value` })
  const successCheck = useWatch({ control, name: `${prefix}.response.success_check` })

  const isObject = type === 'object'
  const field = successField || (isObject ? 'statusCode' : 'status')
  const value = successValue === '' || successValue == null ? (isObject ? 200 : 100) : String(successValue)

  const rows: Row[] = [
    { when: 'Không kết nối được (sai địa chỉ, NCC sập)', result: 'Lỗi kết nối, NCC chưa nhận đơn', next: 'Dừng, chờ admin' },
    { when: 'Quá thời gian chờ', result: 'Chưa rõ, NCC có thể đã nhận đơn', next: 'Dừng, chờ admin. Kiểm tra bên NCC trước khi mua lại' },
    { when: 'Không phải JSON (trang HTML, 502...)', result: '"NCC trả dữ liệu không đọc được"', next: 'Thử lại' },
    { when: <>{code(`"${field}"`)} khác {code(value)}</>, result: 'NCC từ chối, lý do xem bước 5', next: 'Theo mã lỗi ở bước 5, không khai thì Thử lại' },
    isObject
      ? {
          warn: true,
          when: <>Không có {code(`"${field}"`)}, hoặc nội dung rỗng</>,
          result: 'KHÔNG báo lỗi, coi như thành công',
          next: mode === 'deferred'
            ? 'Sang bước lấy mã đơn, không có mã thì Thử lại'
            : 'Sang bước lấy proxy, không có proxy thì thành đơn giao thiếu'
        }
      : { when: <>Không có {code(`"${field}"`)}</>, result: `Lỗi "Thiếu field '${field}'"`, next: 'Thử lại' },
    { when: <>{code(`"${field}"`)} bằng {code(value)}</>, result: 'Thành công', next: 'Sang bước 3' }
  ]

  const cell = { fontSize: 12, lineHeight: 1.5, py: 0.6, px: 0.75, borderTop: '1px solid', borderColor: 'divider', minWidth: 0 }

  return (
    <NoteBox title='Hệ thống quyết định lỗi theo thứ tự này (khớp dòng nào dừng ở dòng đó)'>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1.1fr) minmax(0,1.2fr)' }}>
        {['NCC trả về', 'Hệ thống kết luận', 'Đơn xử lý thế nào'].map(h => (
          <Box key={h} sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.secondary', px: 0.75, pb: 0.5 }}>{h}</Box>
        ))}
        {rows.map((r, i) => {
          const sx = { ...cell, color: r.warn ? 'warning.dark' : 'text.primary', fontWeight: r.warn ? 600 : 400 }

          return [
            <Box key={`${i}-a`} sx={sx}>{r.when}</Box>,
            <Box key={`${i}-b`} sx={sx}>{r.result}</Box>,
            <Box key={`${i}-c`} sx={sx}>{r.next}</Box>
          ]
        })}
      </Box>

      <Line><strong>Thử lại</strong> = tối đa 3 lần rồi treo đơn chờ admin, <strong>không tự hoàn tiền</strong>.</Line>
      <Line>
        <strong>Mã HTTP (400, 500...) không được dùng để quyết định</strong>, hệ thống chỉ đọc nội dung trả về.
        {isObject && <> Ví dụ NCC trả HTTP 401 kèm {code('{"message":"Unauthorized"}')} sẽ rơi vào dòng cảnh báo ở trên.</>}
      </Line>
      <Line>
        {isObject && <>Dạng 1 đọc được đường dẫn lồng ({code('result.status')}).</>}
        {type === 'array_last_status' && <>Dạng 2 đọc ở phần tử {successCheck === 'first' ? 'đầu tiên' : 'cuối cùng'}, chỉ đọc trường cùng cấp, không đọc đường dẫn lồng.</>}
        {type === 'array_each_status' && <>Dạng 3 chỉ đọc phần tử đầu tiên, đầu tiên lỗi thì cả lô lỗi. Không đọc đường dẫn lồng.</>}
        {!successField && <> Ô Trường kiểm tra đang trống nên hệ thống tự đọc {code(`"${field}"`)}.</>}
      </Line>
    </NoteBox>
  )
})

/** Bước 5 tab Mua: câu báo lỗi lấy từ đâu, và các điều kiện làm cấu hình mất tác dụng. */
export const BuyErrorReasonNote = memo(function BuyErrorReasonNote({ prefix, control }: BuySectionProps) {
  const type = useWatch({ control, name: `${prefix}.response.type` }) || 'object'
  const reasonField = useWatch({ control, name: `${prefix}.response.error_message_field` })
  const rules: any[] = useWatch({ control, name: `${prefix}.response.error_codes` as any }) || []

  // Cùng điều kiện lọc với ProviderFormSerializer: thiếu 1 trong 3 ô là dòng bị bỏ khi Lưu.
  const validCount = rules.filter(r => r?.field && r?.value && r?.message).length
  const droppedCount = rules.length - validCount

  const chain = type === 'array_last_status'
    ? ['Mã lỗi khớp', 'Trường lý do lỗi', 'Thông báo mặc định', '"Sai giá trị: ..."']
    : type === 'array_each_status'
      ? ['Mã lỗi khớp', 'Trường lý do lỗi', '"message"', '"comen"', 'Thông báo mặc định', '"Lỗi: trường=giá trị"']
      : ['Mã lỗi khớp', 'Trường lý do lỗi', '"message"', '"error"', 'Thông báo mặc định', '"Provider returned error"']

  return (
    <NoteBox title='Câu báo lỗi lấy từ đâu (có cái nào dùng cái đó, theo thứ tự)'>
      <Typography sx={{ fontSize: 12, lineHeight: 1.7, color: 'text.primary' }}>
        {chain.join('  →  ')}
      </Typography>

      {type === 'array_last_status' && (
        <Line>Dạng 2 mà NCC trả object có {code('"status"')} thay vì mảng: thứ tự thành mã lỗi, trường lý do lỗi, {code('"message"')}, {code('"comen"')}, không dùng thông báo mặc định.</Line>
      )}
      <Line>Mã lỗi chỉ được xét <strong>sau khi bước 2 đã kết luận lỗi</strong>. Trường kiểm tra đang đạt giá trị OK thì mã lỗi không có tác dụng.</Line>
      <Line>Trường lý do lỗi chỉ được đọc khi đã có ít nhất 1 mã lỗi hợp lệ.</Line>
      <Line>Đơn xử lý theo ô <strong>Gặp lỗi này thì</strong> của mã lỗi khớp. Không khai thì thử lại tối đa 3 lần rồi treo chờ admin, không tự hoàn tiền.</Line>

      {reasonField && validCount === 0 && (
        <Line warn>Trường lý do lỗi "{reasonField}" đang bị bỏ qua vì chưa có mã lỗi hợp lệ nào.</Line>
      )}
      {droppedCount > 0 && (
        <Line warn>{droppedCount} dòng mã lỗi thiếu Field, Giá trị hoặc Thông báo sẽ bị bỏ khi Lưu, kể cả lựa chọn ở ô Gặp lỗi này thì.</Line>
      )}
    </NoteBox>
  )
})

/** Ghi chú 1 khối cho luồng lấy proxy, gia hạn, xoay. Mỗi luồng có code riêng nên nội dung do nơi gọi viết riêng. */
export const ErrorRuleNote = ({ title, lines }: { title: string; lines: ReactNode[] }) => (
  <NoteBox title={title}>
    {lines.map((line, i) => <Line key={i}>{line}</Line>)}
  </NoteBox>
)
