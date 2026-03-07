import { useEffect, useRef } from 'react'
import { Repeat, RefreshCw, Eye, Trash2, Copy } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

/**
 * 右键菜单组件
 * @param {object} position - 菜单位置 { x, y }
 * @param {object} account - 账号数据
 * @param {function} onClose - 关闭回调
 * @param {function} onSwitch - 切换账号
 * @param {function} onRefresh - 刷新账号
 * @param {function} onViewDetails - 查看详情
 * @param {function} onCopyEmail - 复制邮箱
 * @param {function} onDelete - 删除账号
 * @param {boolean} isRefreshing - 是否正在刷新
 * @param {boolean} isSwitching - 是否正在切换
 */
function ContextMenu({
  position,
  account,
  onClose,
  onSwitch,
  onRefresh,
  onViewDetails,
  onCopyEmail,
  onDelete,
  isRefreshing,
  isSwitching,
}) {
  const { theme, colors } = useTheme()
  const menuRef = useRef(null)
  const isDark = theme === 'dark'

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }
    
    const handleScroll = () => onClose()
    
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('wheel', handleScroll)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('wheel', handleScroll)
    }
  }, [onClose])

  // 调整菜单位置，防止超出屏幕
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      let adjustedX = position.x
      let adjustedY = position.y
      
      if (rect.right > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10
      }
      
      if (rect.bottom > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 10
      }
      
      menuRef.current.style.left = `${adjustedX}px`
      menuRef.current.style.top = `${adjustedY}px`
    }
  }, [position])

  const menuItems = [
    {
      icon: Repeat,
      label: '切换账号',
      onClick: () => {
        onSwitch(account)
        onClose()
      },
      disabled: isSwitching,
      color: 'text-blue-500',
    },
    {
      icon: RefreshCw,
      label: '刷新配额',
      onClick: () => {
        onRefresh(account.id)
        onClose()
      },
      disabled: isRefreshing,
      color: colors.textMuted,
    },
    {
      icon: Eye,
      label: '查看详情',
      onClick: () => {
        onViewDetails(account)
        onClose()
      },
      color: colors.textMuted,
    },
    {
      icon: Copy,
      label: '复制邮箱',
      onClick: () => {
        onCopyEmail(account.email, account.id)
        onClose()
      },
      color: colors.textMuted,
    },
    { divider: true },
    {
      icon: Trash2,
      label: '删除账号',
      onClick: () => {
        onDelete(account.id)
        onClose()
      },
      color: 'text-red-500',
      danger: true,
    },
  ]

  return (
    <div
      ref={menuRef}
      className={`
        fixed z-[9999] min-w-[180px]
        ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}
        rounded-xl shadow-2xl border ${isDark ? 'border-white/10' : 'border-gray-200'}
        py-2 animate-scale-in
      `}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {menuItems.map((item, index) => {
        if (item.divider) {
          return (
            <div
              key={`divider-${index}`}
              className={`my-1 h-px ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}
            />
          )
        }

        const Icon = item.icon
        return (
          <button
            key={index}
            onClick={item.onClick}
            disabled={item.disabled}
            className={`
              w-full px-4 py-2.5 flex items-center gap-3 text-sm
              ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}
              ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${item.danger ? 'hover:bg-red-500/10' : ''}
              transition-colors
            `}
          >
            <Icon size={16} className={item.color} />
            <span className={item.danger ? 'text-red-500' : colors.text}>
              {item.label}
            </span>
          </button>
        )
      })}

      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.15s ease-out;
        }
      `}</style>
    </div>
  )
}

export default ContextMenu
