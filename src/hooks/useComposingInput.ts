import { useRef } from 'react'
import type { ChangeEvent, CompositionEvent } from 'react'

type El = HTMLInputElement | HTMLTextAreaElement

/**
 * Fix khựng khi gõ TIẾNG VIỆT trong input "controlled".
 *
 * Bộ gõ tiếng Việt (Unikey/IME) bắn NHIỀU event/chữ (compositionupdate) → mỗi event làm
 * React setState + re-render → gõ 1 chữ có dấu re-render 3-5 lần → khựng. Gõ không dấu 1 lần/chữ nên mượt.
 *
 * Hook này CHỈ cập nhật state khi KẾT THÚC gõ 1 chữ (compositionend) → tiếng Việt cũng 1 lần/chữ như không dấu.
 * Trong lúc đang gõ (composing) bỏ qua onChange → input tự hiện chữ đang gõ (trình duyệt lo), không re-render.
 *
 * Dùng: const bind = useComposingInput(setValue); <TextField value={value} {...bind} />
 * Thay cho: onChange={e => setValue(e.target.value)}
 */
export function useComposingInput(onValue: (v: string) => void) {
  const composing = useRef(false)

  return {
    onChange: (e: ChangeEvent<El>) => {
      // Chỉ commit khi KHÔNG đang trong tổ hợp gõ (không dấu, hoặc đã compositionend)
      if (!composing.current) onValue(e.target.value)
    },
    onCompositionStart: () => {
      composing.current = true
    },
    onCompositionEnd: (e: CompositionEvent<El>) => {
      composing.current = false
      onValue((e.target as El).value)
    }
  }
}
