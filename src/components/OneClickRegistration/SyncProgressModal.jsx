import React from 'react'
import { useTranslation } from 'react-i18next'
import { X, Loader2 } from 'lucide-react'

/**
 * 同步进度弹窗组件
 */
const SyncProgressModal = ({ onClose }) => {
  const { t } = useTranslation()
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('registration.syncProgress', '同步进度')}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* 内容 */}
        <div className="p-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-gray-700 dark:text-gray-300">
              {t('registration.syncing', '正在同步账号到账号管理...')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SyncProgressModal
