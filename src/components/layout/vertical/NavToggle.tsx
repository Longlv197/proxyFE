'use client'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'
import { Menu } from 'lucide-react'

const NavToggle = () => {
  // Hooks
  const { toggleVerticalNav, isBreakpointReached } = useVerticalNav()

  const handleClick = () => {
    toggleVerticalNav()
  }

  return (
    <>
      {/* <i className='tabler-menu-2 cursor-pointer' onClick={handleClick} /> */}
      {/* Comment following code and uncomment above code in order to toggle menu on desktop screens as well */}
      {isBreakpointReached && (
        <button
          onClick={handleClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            borderRadius: 8,
            flexShrink: 0
          }}
        >
          <Menu size={28} />
        </button>
      )}
    </>
  )
}

export default NavToggle
