'use client'

import { useCallback, useEffect, useRef } from 'react'

import { useEditor, EditorContent } from '@tiptap/react'
// eslint-disable-next-line import/no-named-as-default
import StarterKit from '@tiptap/starter-kit'
// eslint-disable-next-line import/no-named-as-default
import Underline from '@tiptap/extension-underline'
// eslint-disable-next-line import/no-named-as-default
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
// eslint-disable-next-line import/no-named-as-default
import Color from '@tiptap/extension-color'
// eslint-disable-next-line import/no-named-as-default
import FontSize from '@tiptap/extension-font-size'
// eslint-disable-next-line import/no-named-as-default
import Image from '@tiptap/extension-image'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  ImageIcon,
  Undo2,
  Redo2
} from 'lucide-react'

import useAxiosAuth from '@/hocs/useAxiosAuth'
import { PUBLIC_API_URL } from '@/config/api'

import './RichTextEditor.css'

// API_URL dạng "http://domain.com/api" → lấy base domain
const API_BASE = PUBLIC_API_URL.replace(/\/api\/?$/, '')

interface Props {
  value: string
  onChange: (html: string) => void
  hideImage?: boolean
  minHeight?: number
}

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px']

export default function RichTextEditor({ value, onChange, hideImage, minHeight }: Props) {
  const axiosAuth = useAxiosAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] }
      }),
      Underline,
      TextStyle,
      Color,
      FontSize,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      ...(hideImage ? [] : [Image.configure({ inline: false, allowBase64: false })])
    ],
    content: value,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML())
    },
    immediatelyRender: false
  })

  // Sync external value changes (e.g. form reset) into the editor
  useEffect(() => {
    if (!editor) return
    const currentHtml = editor.getHTML()

    // Only update if value actually differs (avoid cursor jump)
    if (value !== currentHtml && !((!value || value === '<p></p>') && currentHtml === '<p></p>')) {
      editor.commands.setContent(value || '')
    }
  }, [editor, value])

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (!file || !editor) return

    const formData = new FormData()

    formData.append('image', file)

    try {
      const res = await axiosAuth.post('/admin/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (res?.data?.url) {
        const imgUrl = res.data.url.startsWith('http') ? res.data.url : `${API_BASE}${res.data.url}`

        editor.chain().focus().setImage({ src: imgUrl }).run()
      }
    } catch {
      console.error('Failed to upload image')
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [editor, axiosAuth])

  if (!editor) return null

  return (
    <div className='rich-editor-wrapper'>
      <div className='rich-editor-toolbar'>
        {/* Text formatting */}
        <button
          type='button'
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
          title='Bold'
        >
          <Bold size={16} />
        </button>
        <button
          type='button'
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
          title='Italic'
        >
          <Italic size={16} />
        </button>
        <button
          type='button'
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'is-active' : ''}
          title='Underline'
        >
          <UnderlineIcon size={16} />
        </button>
        <button
          type='button'
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'is-active' : ''}
          title='Strikethrough'
        >
          <Strikethrough size={16} />
        </button>

        <span className='toolbar-divider' />

        {/* Font size */}
        <select
          value={editor.getAttributes('textStyle').fontSize || '14px'}
          onChange={e => editor.chain().focus().setFontSize(e.target.value).run()}
          title='Font size'
        >
          {FONT_SIZES.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>

        {/* Text color */}
        <input
          type='color'
          value={editor.getAttributes('textStyle').color || '#000000'}
          onChange={e => editor.chain().focus().setColor(e.target.value).run()}
          title='Text color'
        />

        <span className='toolbar-divider' />

        {/* Text align */}
        <button
          type='button'
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
          title='Align left'
        >
          <AlignLeft size={16} />
        </button>
        <button
          type='button'
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
          title='Align center'
        >
          <AlignCenter size={16} />
        </button>
        <button
          type='button'
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
          title='Align right'
        >
          <AlignRight size={16} />
        </button>

        <span className='toolbar-divider' />

        {/* Lists */}
        <button
          type='button'
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
          title='Bullet list'
        >
          <List size={16} />
        </button>
        <button
          type='button'
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
          title='Numbered list'
        >
          <ListOrdered size={16} />
        </button>

        {!hideImage && (
          <>
            <span className='toolbar-divider' />

            {/* Image upload */}
            <button type='button' onClick={() => fileInputRef.current?.click()} title='Insert image'>
              <ImageIcon size={16} />
            </button>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/*'
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
          </>
        )}

        <span className='toolbar-divider' />

        {/* Undo/Redo */}
        <button
          type='button'
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title='Undo'
        >
          <Undo2 size={16} />
        </button>
        <button
          type='button'
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title='Redo'
        >
          <Redo2 size={16} />
        </button>
      </div>

      <div className='rich-editor-content' style={minHeight ? { minHeight } : undefined}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
