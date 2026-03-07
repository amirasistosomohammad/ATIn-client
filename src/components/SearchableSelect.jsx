import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { FaExclamationCircle, FaCheckCircle } from 'react-icons/fa'

const DROPDOWN_Z_INDEX = 10002

function filterOptions(options, query) {
  if (!options?.length) return []
  const q = (query || '').trim().toLowerCase()
  if (!q) return options
  return options.filter((opt) => String(opt).toLowerCase().includes(q))
}

export default function SearchableSelect({
  options = [],
  value,
  onChange,
  disabled = false,
  invalid = false,
  placeholder = 'Search or select...',
  id,
  'aria-label': ariaLabel,
  className = '',
  inputStyle = {},
  theme = { primary: '#0C8A3B', borderColor: '#d1d5db', textPrimary: '#1a2a1a' },
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [dropdownRect, setDropdownRect] = useState({ top: 0, left: 0, width: 200 })
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const selectedLabel = value ? (options.includes(value) ? value : value) : ''
  const displayText = open ? query : selectedLabel

  const filtered = useMemo(
    () => filterOptions(options, open ? query : ''),
    [options, open, query]
  )

  const noResults = open && query.trim() && filtered.length === 0
  const isInvalid = invalid || noResults

  const updateDropdownRect = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownRect({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 260),
      })
    }
  }, [])

  useLayoutEffect(() => {
    if (open && inputRef.current) updateDropdownRect()
  }, [open, updateDropdownRect])

  useEffect(() => {
    if (!open) return
    const onScrollOrResize = () => updateDropdownRect()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open, updateDropdownRect])

  useEffect(() => {
    if (open) setHighlightIndex(0)
  }, [open, filtered.length])

  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current?.querySelector('[data-highlighted="true"]')
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [open, highlightIndex, filtered])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (!containerRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleFocus = () => {
    if (disabled) return
    setOpen(true)
    if (!query && !value) setQuery('')
  }

  const handleInputFocus = (e) => {
    if (!isInvalid) {
      e.target.style.borderColor = theme.primary
      e.target.style.boxShadow = '0 0 0 0.2rem rgba(12, 138, 59, 0.25)'
    } else {
      e.target.style.borderColor = '#dc3545'
      e.target.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)'
    }
    handleFocus()
  }

  const handleInputBlur = () => {
    if (!inputRef.current) return
    if (isInvalid) {
      inputRef.current.style.borderColor = '#dc3545'
      inputRef.current.style.boxShadow = 'none'
    } else {
      inputRef.current.style.borderColor = theme.borderColor
      inputRef.current.style.boxShadow = 'none'
    }
  }

  const handleInputChange = (e) => {
    setQuery(e.target.value)
    setOpen(true)
  }

  const selectOption = (opt) => {
    onChange(opt ?? '')
    setQuery('')
    setOpen(false)
  }

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => (i + 1) % Math.max(1, filtered.length))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) =>
        filtered.length ? (i - 1 + filtered.length) % filtered.length : 0
      )
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const opt = filtered[highlightIndex]
      if (opt) selectOption(opt)
      return
    }
  }

  const baseInputStyle = {
    width: '100%',
    paddingLeft: 42,
    paddingRight: 36,
    height: '38px',
    border: `1px solid ${isInvalid ? '#dc3545' : theme.borderColor}`,
    borderRadius: 8,
    fontSize: '1rem',
    backgroundColor: '#fff',
    color: theme.textPrimary,
    transition: 'all 0.3s ease',
    outline: 'none',
    ...inputStyle,
  }

  const dropdownStyle = {
    position: 'fixed',
    top: dropdownRect.top,
    left: dropdownRect.left,
    width: dropdownRect.width,
    maxHeight: 220,
    overflowY: 'auto',
    zIndex: DROPDOWN_Z_INDEX,
    backgroundColor: '#fff',
    border: `1px solid ${theme.borderColor}`,
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
  }

  const optionStyle = (highlighted, isLast) => ({
    padding: '10px 14px',
    cursor: 'pointer',
    fontSize: '0.9375rem',
    color: theme.textPrimary,
    backgroundColor: highlighted ? 'rgba(12, 138, 59, 0.1)' : 'transparent',
    borderBottom: isLast ? 'none' : '1px solid #f0f0f0',
  })

  return (
    <div ref={containerRef} className={className} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          ref={inputRef}
          type="text"
          id={id}
          aria-label={ariaLabel || placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={open ? `${id}-listbox` : undefined}
          value={displayText}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          style={baseInputStyle}
          onBlur={handleInputBlur}
          spellCheck={false}
        />
        <span
          className="position-absolute top-50 translate-middle-y"
          style={{
            right: 12,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isInvalid ? '#dc3545' : value ? theme.primary : theme.textPrimary,
            opacity: isInvalid || value ? 1 : 0.6,
            fontSize: isInvalid || value ? '1rem' : '0.75rem',
          }}
          aria-hidden
        >
          {isInvalid ? (
            <FaExclamationCircle size={18} title="Invalid or no match" />
          ) : value ? (
            <FaCheckCircle size={18} title="Selected" />
          ) : (
            '▼'
          )}
        </span>
      </div>

      {open && filtered.length > 0 &&
        createPortal(
          <ul
            ref={listRef}
            id={`${id}-listbox`}
            role="listbox"
            style={dropdownStyle}
            className="list-unstyled mb-0"
          >
            {filtered.map((opt, i) => (
              <li
                key={opt}
                role="option"
                data-highlighted={i === highlightIndex ? 'true' : undefined}
                style={optionStyle(i === highlightIndex, i === filtered.length - 1)}
                onMouseEnter={() => setHighlightIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectOption(opt)
                }}
              >
                {opt}
              </li>
            ))}
          </ul>,
          document.body
        )}

      {/* Inline so it doesn't float over the next field's label */}
      {open && query.trim() && filtered.length === 0 && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginTop: 4,
            padding: '10px 14px',
            width: '100%',
            fontSize: '0.9375rem',
            color: '#dc3545',
            border: '1px solid #dc3545',
            borderRadius: 8,
            backgroundColor: 'rgba(220, 53, 69, 0.06)',
          }}
        >
          No option matching &quot;{query.trim()}&quot;
        </div>
      )}
    </div>
  )
}
