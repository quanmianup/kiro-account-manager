import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Edit2, Trash2, Upload, Eye, EyeOff, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

/**
 * 注册记录行组件
 */
const RegistrationRecordRow = ({ record, selected, onSelect, onEdit, onDelete, onSync }) => {
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)
  
  // 格式化时间
  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return timestamp
    }
  }
  
  // 获取状态显示
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'Registering':
        return {
          icon: <Clock className="w-4 h-4 animate-pulse" />,
          text: t('registration.status.registering', '注册中'),
          className: 'text-yellow-600 dark:text-yellow-400'
        }
      case 'Registered':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          text: t('registration.status.registered', '已注册'),
          className: 'text-green-600 dark:text-green-400'
        }
      case 'Synced':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          text: t('registration.status.synced', '已同步'),
          className: 'text-blue-600 dark:text-blue-400'
        }
      default:
        if (typeof status === 'object' && status.Failed) {
          return {
            icon: <XCircle className="w-4 h-4" />,
            text: t('registration.status.failed', '注册失败'),
            className: 'text-red-600 dark:text-red-400',
            tooltip: status.Failed
          }
        }
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          text: t('registration.status.unknown', '未知'),
          className: 'text-gray-600 dark:text-gray-400'
        }
    }
  }
  
  const statusDisplay = getStatusDisplay(record.status)
  const isUnsynced = record.status === 'Registered' && !record.synced
  
  return (
    <tr className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 ${isUnsynced ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}>
      {/* 复选框 */}
      <td className="px-2 sm:px-4 py-2 sm:py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          className="rounded"
        />
      </td>
      
      {/* 邮箱 */}
      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 dark:text-white">
        <div className="max-w-[150px] sm:max-w-none truncate">
          {record.email}
        </div>
        {isUnsynced && (
          <span className="inline-block mt-1 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 text-xs rounded">
            {t('registration.unsynced', '未同步')}
          </span>
        )}
      </td>
      
      {/* 密码 */}
      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-gray-900 dark:text-white font-mono text-xs sm:text-sm">
            {showPassword ? record.password : '••••••••'}
          </span>
          <button
            onClick={() => setShowPassword(!showPassword)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex-shrink-0"
          >
            {showPassword ? <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Eye className="w-3 h-3 sm:w-4 sm:h-4" />}
          </button>
        </div>
      </td>
      
      {/* 注册时间 - 在中等屏幕以下隐藏 */}
      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">
        {formatTime(record.registered_at)}
      </td>
      
      {/* 状态 */}
      <td className="px-2 sm:px-4 py-2 sm:py-3">
        <div className={`flex items-center gap-1 sm:gap-2 ${statusDisplay.className}`} title={statusDisplay.tooltip}>
          {statusDisplay.icon}
          <span className="text-xs sm:text-sm hidden sm:inline">{statusDisplay.text}</span>
        </div>
      </td>
      
      {/* 操作 */}
      <td className="px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={onEdit}
            className="p-1 sm:p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
            title={t('common.edit', '编辑')}
          >
            <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
          
          <button
            onClick={onDelete}
            className="p-1 sm:p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
            title={t('common.delete', '删除')}
          >
            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
          
          {isUnsynced && (
            <button
              onClick={onSync}
              className="p-1 sm:p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
              title={t('registration.sync', '同步')}
            >
              <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

export default RegistrationRecordRow
