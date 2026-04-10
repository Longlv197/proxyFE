import { useState } from "react";

import "./styles.css";

interface QuantityControlProps {
  min?: number
  max?: number
  value?: number
  onChange?: (value: number) => void
  label?: string
  icon?: React.ReactNode
  className?: string
}

const QuantityControl: React.FC<QuantityControlProps> = ({
  min = 1,
  max = 100,
  value = 1,
  onChange,
  label,
  icon,
  className = ''
}) => {
  const [inputValue, setInputValue] = useState<string>(String(value))
  const safeValue = Math.max(min, Math.min(max, value || min))

  // Sync khi value prop thay đổi từ bên ngoài
  if (String(safeValue) !== inputValue && inputValue !== '') {
    // Chỉ sync nếu input không đang rỗng (user đang gõ)
  }

  const handleIncrease = () => {
    if (safeValue < max) {
      const newValue = safeValue + 1

      setInputValue(String(newValue))
      onChange?.(newValue)
    }
  }

  const handleDecrease = () => {
    if (safeValue > min) {
      const newValue = safeValue - 1

      setInputValue(String(newValue))
      onChange?.(newValue)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value

    if (raw === '') {
      setInputValue('')
      return
    }

    const num = parseInt(raw)

    if (!isNaN(num) && num <= max) {
      setInputValue(raw)
      if (num >= min) onChange?.(num)
    }
  }

  const handleBlur = () => {
    if (!inputValue || parseInt(inputValue) < min) {
      setInputValue(String(min))
      onChange?.(min)
    }
  }

  return (
    <div className={`quantity-wrapper ${className}`}>
      {label && (
        <label className="quantity-label">
          {icon && <span className="quantity-icon">{icon}</span>}
          {label}
        </label>
      )}
      <div className="quantity-controls">
        <button
          type="button"
          className="qty-btn"
          onClick={handleDecrease}
          disabled={safeValue <= min}
        >
          -
        </button>
        <input
          type="number"
          className="qty-display"
          value={inputValue === '' ? '' : safeValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          min={min}
          max={max}
        />
        <button
          type="button"
          className="qty-btn"
          onClick={handleIncrease}
          disabled={safeValue >= max}
        >
          +
        </button>
      </div>
    </div>
  )
}

export default QuantityControl
