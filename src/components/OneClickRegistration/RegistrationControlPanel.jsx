import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Rocket, Play, Square } from 'lucide-react'

/**
 * 注册控制面板组件
 * @param {Object} processState - 注册流程状态
 * @param {boolean} emailConfigured - 邮箱是否已配置
 * @param {Function} onStart - 开始注册回调
 * @param {Function} onStop - 停止注册回调
 * @param {boolean} compact - 是否使用紧凑模式
 */
const RegistrationControlPanel = ({ processState, emailConfigured, onStart, onStop, compact = false }) => {
  const { t } = useTranslation()
  const [targetCount, setTargetCount] = useState(10)
  const [intervalSecs, setIntervalSecs] = useState(30)
  const [retryCount, setRetryCount] = useState(3)
  
  // 处理开始注册
  const handleStart = () => {
    onStart(targetCount, intervalSecs, retryCount)
  }
  
  // 计算进度百分比
  const progressPercent = processState.target_count > 0
    ? Math.round((processState.current_count / processState.target_count) * 100)
    : 0
  
  // 紧凑模式渲染
  if (compact) {
    return (
      <div className="space-y-3">
        {/* 配置参数 - 注册时隐藏 */}
        <div className={`space-y-2 transition-all duration-300 ${processState.is_running ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
          <div className="flex items-center gap-3">
            <label className="text-base font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap w-16">
              {t('registration.targetCount', '目标数量')}
            </label>
            <select
              value={targetCount}
              onChange={(e) => setTargetCount(parseInt(e.target.value))}
              disabled={processState.is_running}
              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          
          <div className="flex items-center gap-3">
            <label className="text-base font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap w-16">
              {t('registration.interval', '注册间隔')}
            </label>
            <select
              value={intervalSecs}
              onChange={(e) => setIntervalSecs(parseInt(e.target.value))}
              disabled={processState.is_running}
              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            >
              <option value={10}>10秒</option>
              <option value={30}>30秒</option>
              <option value={60}>60秒</option>
              <option value={120}>120秒</option>
            </select>
          </div>
          
          <div className="flex items-center gap-3">
            <label className="text-base font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap w-16">
              {t('registration.retryCount', '重试次数')}
            </label>
            <select
              value={retryCount}
              onChange={(e) => setRetryCount(parseInt(e.target.value))}
              disabled={processState.is_running}
              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            >
              <option value={0}>0次</option>
              <option value={1}>1次</option>
              <option value={3}>3次</option>
              <option value={5}>5次</option>
            </select>
          </div>
        </div>
        
        {/* 进度显示 - 注册时显示 */}
        <div className={`space-y-3 transition-all duration-300 ${processState.is_running ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              {t('registration.progress', '注册进度')}
            </span>
            <span className="text-gray-900 dark:text-white font-semibold">
              {processState.current_count}/{processState.target_count}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300 rounded-full relative overflow-hidden"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500 mb-1">
              {progressPercent}%
            </div>
            {processState.current_status && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {processState.current_status}
              </div>
            )}
            {processState.current_email && (
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate">
                {processState.current_email}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
              <div className="text-green-600 dark:text-green-400 font-semibold">
                {processState.success_count || 0}
              </div>
              <div className="text-gray-600 dark:text-gray-400">成功</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center">
              <div className="text-red-600 dark:text-red-400 font-semibold">
                {processState.failed_count || 0}
              </div>
              <div className="text-gray-600 dark:text-gray-400">失败</div>
            </div>
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="space-y-2">
          {!processState.is_running ? (
            <button
              onClick={handleStart}
              disabled={!emailConfigured}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium transition-all"
            >
              <Play className="w-4 h-4" />
              {t('registration.startRegistration', '开始注册')}
            </button>
          ) : (
            <button
              onClick={onStop}
              className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center justify-center gap-2 text-sm font-medium transition-all"
            >
              <Square className="w-4 h-4" />
              {t('registration.stopRegistration', '停止注册')}
            </button>
          )}
          
          {!emailConfigured && !processState.is_running && (
            <span className="block text-xs text-center text-orange-600 dark:text-orange-400">
              {t('registration.configEmailFirst', '请先配置邮箱')}
            </span>
          )}
        </div>
      </div>
    )
  }
  
  // 完整模式渲染
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center mb-4">
        <Rocket className="w-5 h-5 mr-2 text-blue-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('registration.control', '注册控制')}
        </h2>
      </div>
      
      <div className="space-y-4">
        {/* 配置参数 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('registration.targetCount', '目标数量')}
            </label>
            <select
              value={targetCount}
              onChange={(e) => setTargetCount(parseInt(e.target.value))}
              disabled={processState.is_running}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('registration.interval', '注册间隔')}
            </label>
            <select
              value={intervalSecs}
              onChange={(e) => setIntervalSecs(parseInt(e.target.value))}
              disabled={processState.is_running}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            >
              <option value={10}>10秒</option>
              <option value={30}>30秒</option>
              <option value={60}>60秒</option>
              <option value={120}>120秒</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('registration.retryCount', '重试次数')}
            </label>
            <select
              value={retryCount}
              onChange={(e) => setRetryCount(parseInt(e.target.value))}
              disabled={processState.is_running}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            >
              <option value={0}>0次</option>
              <option value={1}>1次</option>
              <option value={3}>3次</option>
              <option value={5}>5次</option>
            </select>
          </div>
        </div>
        
        {/* 进度显示 */}
        {processState.is_running && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">
                {t('registration.progress', '当前进度')}
              </span>
              <span className="text-gray-900 dark:text-white font-semibold">
                {processState.current_count}/{processState.target_count} ({progressPercent}%)
              </span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            
            {processState.current_status && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('registration.currentStatus', '状态')}: {processState.current_status}
              </div>
            )}
            
            {processState.current_email && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('registration.currentEmail', '当前邮箱')}: {processState.current_email}
              </div>
            )}
          </div>
        )}
        
        {/* 操作按钮 */}
        <div className="flex items-center gap-3 pt-2">
          {!processState.is_running ? (
            <button
              onClick={handleStart}
              disabled={!emailConfigured}
              className="px-6 py-2.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              <Play className="w-5 h-5" />
              {t('registration.startRegistration', '开始一键注册')}
            </button>
          ) : (
            <button
              onClick={onStop}
              className="px-6 py-2.5 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center gap-2 font-medium"
            >
              <Square className="w-5 h-5" />
              {t('registration.stopRegistration', '停止注册')}
            </button>
          )}
          
          {!emailConfigured && (
            <span className="text-sm text-orange-600 dark:text-orange-400">
              {t('registration.configEmailFirst', '请先配置邮箱')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default RegistrationControlPanel
