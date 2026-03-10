import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, Mail, Rocket } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import EmailConfigPanel from './EmailConfigPanel'
import RegistrationRecordTable from './RegistrationRecordTable'
import RegistrationControlPanel from './RegistrationControlPanel'
import EditRecordModal from './EditRecordModal'
import SyncProgressModal from './SyncProgressModal'
import useRegistrationRecords from './hooks/useRegistrationRecords'
import useRegistrationProcess from './hooks/useRegistrationProcess'

/**
 * 一键注册主容器组件 - 参考首页和账号管理的设计风格
 * @param {Function} onNavigate - 导航回调函数
 */
const OneClickRegistration = ({ onNavigate }) => {
  const { t } = useTranslation()
  const { theme, colors } = useTheme()
  const isDark = theme === 'dark'
  
  // 邮箱配置状态（默认使用 QQ 邮箱 IMAP 配置）
  const [emailConfig, setEmailConfig] = useState({
    protocol: 'imap',
    host: 'imap.qq.com',
    port: 993,
    ssl: true,
    username: '',
    password: ''
  })
  
  // 注册记录管理
  const {
    records,
    selectedRecordIds,
    unsyncedCount,
    loading: recordsLoading,
    loadRecords,
    updateRecord,
    deleteRecords,
    checkUnsynced,
    syncToManager,
    setSelectedRecordIds
  } = useRegistrationRecords()
  
  // 注册流程控制
  const {
    processState,
    startProcess,
    stopProcess
  } = useRegistrationProcess()
  
  // 编辑记录弹窗状态
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  
  // 同步进度弹窗状态
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  
  // 初始加载注册记录和邮箱配置
  useEffect(() => {
    loadRecords()
    loadEmailConfig()
  }, [])
  
  // 加载邮箱配置
  const loadEmailConfig = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const config = await invoke('load_email_config')
      if (config) {
        setEmailConfig(config)
      }
    } catch (error) {
      console.error('加载邮箱配置失败:', error)
    }
  }
  
  // 处理编辑记录
  const handleEditRecord = (record) => {
    setEditingRecord(record)
    setEditModalOpen(true)
  }
  
  // 处理保存编辑
  const handleSaveEdit = async (updatedRecord) => {
    await updateRecord(updatedRecord.id, updatedRecord)
    setEditModalOpen(false)
    setEditingRecord(null)
  }
  
  // 处理批量删除
  const handleBatchDelete = async () => {
    if (selectedRecordIds.length === 0) return
    await deleteRecords(selectedRecordIds)
    setSelectedRecordIds([])
  }
  
  // 处理批量同步
  const handleBatchSync = async () => {
    if (selectedRecordIds.length === 0) return
    setSyncModalOpen(true)
    await syncToManager(selectedRecordIds)
    setSyncModalOpen(false)
    setSelectedRecordIds([])
  }
  
  // 处理检查刷新
  const handleCheckRefresh = async () => {
    await checkUnsynced()
  }
  
  return (
    <div className={`h-full overflow-auto ${colors.main}`}>
      {/* 背景装饰光晕 */}
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />
      
      <div className="max-w-6xl mx-auto p-4 sm:p-8 relative">
        {/* Header */}
        <div className="mb-4 sm:mb-6 animate-bounce-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25 animate-float">
              <Sparkles size={20} className="sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-xl sm:text-2xl font-bold ${colors.text}`}>{t('registration.title', '一键注册')}</h1>
              <p className={`text-sm ${colors.textMuted}`}>{t('registration.subtitle', '自动注册 Kiro 账号并管理')}</p>
            </div>
          </div>
        </div>

        {/* 主内容区 - 行式布局 */}
        <div className="space-y-4 sm:space-y-6">
          {/* 第一行：邮箱配置 + 注册控制 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* 邮箱配置 */}
            <div className={`card-glow ${colors.card} rounded-2xl shadow-sm border ${colors.cardBorder} overflow-hidden animate-scale-in delay-100`}>
              <div className={`px-4 sm:px-5 py-3 sm:py-4 border-b ${colors.cardBorder} flex items-center gap-3`}>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                  <Mail size={18} className="sm:w-5 sm:h-5 text-blue-500" />
                </div>
                <h2 className={`text-sm sm:text-base font-semibold ${colors.text}`}>{t('registration.emailConfig', '邮箱配置')}</h2>
              </div>
              <div className="p-4 sm:p-5">
                <EmailConfigPanel
                  config={emailConfig}
                  onChange={setEmailConfig}
                  compact={true}
                  onNavigate={onNavigate}
                />
              </div>
            </div>
            
            {/* 注册控制 */}
            <div className={`card-glow ${colors.card} rounded-2xl shadow-sm border ${colors.cardBorder} overflow-hidden animate-scale-in delay-200`}>
              <div className={`px-4 sm:px-5 py-3 sm:py-4 border-b ${colors.cardBorder} flex items-center gap-3`}>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-green-500/20' : 'bg-green-100'}`}>
                  <Rocket size={18} className="sm:w-5 sm:h-5 text-green-500" />
                </div>
                <h2 className={`text-sm sm:text-base font-semibold ${colors.text}`}>{t('registration.control', '注册控制')}</h2>
              </div>
              <div className="p-4 sm:p-5">
                <RegistrationControlPanel
                  processState={processState}
                  emailConfigured={!!emailConfig.username && !!emailConfig.password}
                  onStart={startProcess}
                  onStop={stopProcess}
                  compact={true}
                />
              </div>
            </div>
          </div>
          
          {/* 第二行：注册记录表格 */}
          <div className={`card-glow ${colors.card} rounded-2xl shadow-sm border ${colors.cardBorder} overflow-hidden animate-scale-in delay-300`}>
            <RegistrationRecordTable
              records={records}
              selectedIds={selectedRecordIds}
              unsyncedCount={unsyncedCount}
              loading={recordsLoading}
              onSelectChange={setSelectedRecordIds}
              onEdit={handleEditRecord}
              onDelete={deleteRecords}
              onSync={syncToManager}
              onCheckRefresh={handleCheckRefresh}
              onBatchDelete={handleBatchDelete}
              onBatchSync={handleBatchSync}
            />
          </div>
        </div>
      </div>
      
      {/* 编辑记录弹窗 */}
      {editModalOpen && (
        <EditRecordModal
          record={editingRecord}
          onSave={handleSaveEdit}
          onClose={() => {
            setEditModalOpen(false)
            setEditingRecord(null)
          }}
        />
      )}
      
      {/* 同步进度弹窗 */}
      {syncModalOpen && (
        <SyncProgressModal
          onClose={() => setSyncModalOpen(false)}
        />
      )}
    </div>
  )
}

export default OneClickRegistration
