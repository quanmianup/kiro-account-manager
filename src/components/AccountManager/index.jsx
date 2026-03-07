import { useState, useCallback, useMemo, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useTheme } from '../../contexts/ThemeContext'
import { useDialog } from '../../contexts/DialogContext'
import { useI18n } from '../../i18n'
import { useAccounts } from './hooks/useAccounts'
import { getQuota, getUsed, getSubPlan } from '../../utils/accountStats'
import AccountHeader from './AccountHeader'
import AccountList from './AccountList'
import AccountGrid from './AccountGrid'
import AccountPagination from './AccountPagination'
import AddAccountModal from './AddAccountModal'
import ImportAccountModal from './ImportAccountModal'
import RefreshProgressModal from './RefreshProgressModal'
import AccountDetailModal from '../AccountDetailModal'
import ConfirmDialog from './ConfirmDialog'
import ContextMenu from './ContextMenu'

function AccountManager() {
  const { colors } = useTheme()
  const { showConfirm } = useDialog()
  const { t } = useI18n()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [pageSize, setPageSize] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)
  const [editingAccount, setEditingAccount] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [viewMode, setViewMode] = useState('list') // 'list' 或 'grid'，默认列表视图
  
  // 切换账号弹窗状态
  const [switchDialog, setSwitchDialog] = useState(null) // { type, title, message, account }
  
  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState(null) // { position: { x, y }, account }
  
  // 当前登录的本地 token
  const [localToken, setLocalToken] = useState(null)
  
  // 右键菜单处理
  const handleContextMenu = useCallback((e, account) => {
    e.preventDefault()
    setContextMenu({
      position: { x: e.clientX, y: e.clientY },
      account,
    })
  }, [])
  
  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])
  
  useEffect(() => {
    invoke('get_kiro_local_token').then(token => {
      console.log('[LocalToken] 获取到的本地 token:', token)
      setLocalToken(token)
    }).catch(err => {
      console.log('[LocalToken] 获取本地 token 失败:', err)
      setLocalToken(null)
    })
  }, [])

  const {
    accounts,
    loadAccounts,
    autoRefreshing,
    refreshProgress,
    lastRefreshTime,
    refreshingId,
    switchingId,
    setSwitchingId,
    autoRefreshAll,
    handleRefreshStatus,
    handleExport,
  } = useAccounts()

  const filteredAccounts = useMemo(() =>
    accounts.filter(a =>
      a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.label.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [accounts, searchTerm]
  )

  const totalPages = Math.ceil(filteredAccounts.length / pageSize) || 1
  const paginatedAccounts = useMemo(() =>
    filteredAccounts.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredAccounts, currentPage, pageSize]
  )

  const handleSearchChange = useCallback((term) => { setSearchTerm(term); setCurrentPage(1) }, [])
  const handlePageSizeChange = useCallback((size) => { setPageSize(size); setCurrentPage(1) }, [])
  const handleSelectAll = useCallback((checked) => { setSelectedIds(checked ? filteredAccounts.map(a => a.id) : []) }, [filteredAccounts])
  const handleSelectOne = useCallback((id, checked) => { setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id)) }, [])
  const handleCopy = useCallback((text, id) => { navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 1500) }, [])
  
  // 删除单个账号
  const handleDelete = useCallback(async (id) => {
    const confirmed = await showConfirm(t('accounts.delete'), t('accounts.confirmDelete'))
    if (confirmed) {
      await invoke('delete_account', { id })
      loadAccounts()
    }
  }, [showConfirm, loadAccounts, t])

  // 批量删除
  const onBatchDelete = useCallback(async () => {
    if (selectedIds.length === 0) return
    const confirmed = await showConfirm(t('accounts.batchDelete'), t('accounts.confirmDeleteMultiple', { count: selectedIds.length }))
    if (confirmed) {
      await invoke('delete_accounts', { ids: selectedIds })
      setSelectedIds([])
      loadAccounts()
    }
  }, [selectedIds, showConfirm, loadAccounts, t])

  // 切换账号 - 显示确认弹窗
  const handleSwitchAccount = useCallback((account) => {
    if (!account.accessToken || !account.refreshToken) {
      setSwitchDialog({ type: 'error', title: t('switch.failed'), message: t('switch.missingAuth'), account: null })
      return
    }
    setSwitchDialog({
      type: 'confirm',
      title: t('switch.title'),
      message: `${t('switch.confirmSwitch')} ${account.email}？`,
      account,
    })
  }, [t])

  // 确认切换
  const confirmSwitch = useCallback(async () => {
    const account = switchDialog?.account
    if (!account) return
    
    setSwitchDialog(null)
    setSwitchingId(account.id)
    
    try {
      // 先刷新 token，确保 token 有效
      console.log('[Switch] 刷新账号 token...')
      const refreshedAccount = await invoke('sync_account', { id: account.id })
      console.log('[Switch] Token 刷新成功')
      
      // 读取设置，判断是否自动更换机器码
      const appSettings = await invoke('get_app_settings').catch(() => ({}))
      const autoChangeMachineId = appSettings.autoChangeMachineId ?? false
      const bindMachineIdToAccount = appSettings.bindMachineIdToAccount ?? false
      const useBoundMachineId = appSettings.useBoundMachineId ?? true
      
      // 处理账号绑定机器码逻辑
      if (autoChangeMachineId && bindMachineIdToAccount) {
        try {
          // 获取账号绑定的机器码
          let boundMachineId = await invoke('get_bound_machine_id', { accountId: account.id }).catch(() => null)
          
          if (!boundMachineId) {
            // 没有绑定机器码，生成一个新的并绑定
            boundMachineId = await invoke('generate_machine_guid')
            await invoke('bind_machine_id_to_account', { accountId: account.id, machineId: boundMachineId })
            console.log(`[MachineId] Generated and bound new machine ID for account: ${account.email}`)
          }
          
          if (useBoundMachineId) {
            // 使用绑定的机器码
            await invoke('set_custom_machine_guid', { newGuid: boundMachineId })
            console.log(`[MachineId] Switched to bound machine ID for account: ${account.email}`)
          }
          // 如果不使用绑定的机器码，后面的 resetMachineId 会随机生成
        } catch (e) {
          console.error('[MachineId] Failed to handle bound machine ID:', e)
        }
      }
      
      const isIdC = refreshedAccount.provider === 'BuilderId' || refreshedAccount.provider === 'Enterprise' || refreshedAccount.clientIdHash
      const authMethod = isIdC ? 'IdC' : 'social'
      
      // 使用刷新后的 token 进行切换
      // 如果启用了绑定机器码且使用绑定的，不需要再 resetMachineId
      const shouldResetMachineId = autoChangeMachineId && !(bindMachineIdToAccount && useBoundMachineId)
      const params = {
        accessToken: refreshedAccount.accessToken,
        refreshToken: refreshedAccount.refreshToken,
        provider: refreshedAccount.provider || 'Google',
        authMethod,
        resetMachineId: shouldResetMachineId,
        autoRestart: false  // 无感切换，不重启 IDE
      }
      
      if (isIdC) {
        params.clientIdHash = refreshedAccount.clientIdHash || null
        params.region = refreshedAccount.region || 'us-east-1'
        params.clientId = refreshedAccount.clientId || null
        params.clientSecret = refreshedAccount.clientSecret || null
      } else {
        params.profileArn = refreshedAccount.profileArn || 'arn:aws:codewhisperer:us-east-1:699475941385:profile/EHGA3GRVQMUK'
      }
      
      await invoke('switch_kiro_account', { params })
      
      // 更新当前账号标识
      invoke('get_kiro_local_token').then(setLocalToken).catch(() => setLocalToken(null))
      
      // 重新加载账号列表，显示最新数据
      loadAccounts()
      
      // 使用刷新后的账号数据显示配额信息
      const quota = getQuota(refreshedAccount)
      const used = getUsed(refreshedAccount)
      const remaining = quota - used
      const subPlan = getSubPlan(refreshedAccount)
      const provider = refreshedAccount.provider || 'Unknown'
      const usagePercent = Math.round((used / quota) * 100)
      
      // 获取 Token 过期时间
      const expiresAt = refreshedAccount.expiresAt || '未知'
      
      // 获取下次重置时间
      const breakdown = refreshedAccount.usageData?.usageBreakdownList?.[0]
      const nextReset = breakdown?.nextDateReset 
        ? new Date(breakdown.nextDateReset * 1000).toLocaleDateString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
          })
        : '未知'
      
      setSwitchDialog({
        type: 'success',
        title: t('switch.success'),
        message: `已成功切换到 ${refreshedAccount.email}`,
        accountData: {
          email: refreshedAccount.email,
          label: refreshedAccount.label,
          provider,
          subPlan,
          used: Math.round(used * 100) / 100,
          quota,
          remaining: Math.round(remaining * 100) / 100,
          usagePercent,
          nextReset,
          expiresAt,
        },
        account: null,
      })
    } catch (e) {
      setSwitchDialog({
        type: 'error',
        title: t('switch.failed'),
        message: String(e),
        account: null,
      })
    } finally {
      setSwitchingId(null)
    }
  }, [switchDialog, setSwitchingId])

  return (
    <div className={`h-full flex flex-col ${colors.main}`}>
      <AccountHeader
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        selectedCount={selectedIds.length}
        onBatchDelete={onBatchDelete}
        onAdd={() => setShowAddModal(true)}
        onImport={() => setShowImportModal(true)}
        onExport={() => handleExport(selectedIds)}
        onRefreshAll={() => autoRefreshAll(accounts, true)}
        autoRefreshing={autoRefreshing}
        lastRefreshTime={lastRefreshTime}
        refreshProgress={refreshProgress}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      <div className="flex-1 overflow-auto">
      {viewMode === 'list' ? (
        <AccountList
          accounts={paginatedAccounts}
          filteredAccounts={filteredAccounts}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectOne={handleSelectOne}
          copiedId={copiedId}
          onCopy={handleCopy}
          onSwitch={handleSwitchAccount}
          onRefresh={handleRefreshStatus}
          onEdit={setEditingAccount}
          onDelete={handleDelete}
          onContextMenu={handleContextMenu}
          refreshingId={refreshingId}
          switchingId={switchingId}
          localToken={localToken}
        />
      ) : (
        <AccountGrid
          accounts={paginatedAccounts}
          selectedIds={selectedIds}
          onSelectOne={handleSelectOne}
          copiedId={copiedId}
          onCopy={handleCopy}
          onSwitch={handleSwitchAccount}
          onRefresh={handleRefreshStatus}
          onEdit={setEditingAccount}
          onDelete={handleDelete}
          onContextMenu={handleContextMenu}
          refreshingId={refreshingId}
          switchingId={switchingId}
          localToken={localToken}
        />
      )}
      </div>
      <div className="animate-slide-in-right delay-200">
      <AccountPagination
        totalCount={filteredAccounts.length}
        pageSize={pageSize}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageSizeChange={handlePageSizeChange}
        onPageChange={setCurrentPage}
      />
      </div>
      {editingAccount && (
        <AccountDetailModal
          account={editingAccount}
          onClose={() => { setEditingAccount(null); loadAccounts() }}
        />
      )}
      {showAddModal && (<AddAccountModal onClose={() => setShowAddModal(false)} onSuccess={loadAccounts} />)}
      {showImportModal && (<ImportAccountModal onClose={() => setShowImportModal(false)} onSuccess={loadAccounts} />)}
      {autoRefreshing && (<RefreshProgressModal refreshProgress={refreshProgress} />)}
      
      {/* 切换账号弹窗 */}
      {switchDialog && (
        <ConfirmDialog
          type={switchDialog.type}
          title={switchDialog.title}
          message={switchDialog.message}
          onConfirm={switchDialog.type === 'confirm' ? confirmSwitch : () => setSwitchDialog(null)}
          onCancel={() => setSwitchDialog(null)}
          confirmText={switchDialog.type === 'confirm' ? t('switch.confirmBtn') : t('common.ok')}
        />
      )}
      
      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu
          position={contextMenu.position}
          account={contextMenu.account}
          onClose={closeContextMenu}
          onSwitch={handleSwitchAccount}
          onRefresh={handleRefreshStatus}
          onViewDetails={setEditingAccount}
          onCopyEmail={handleCopy}
          onDelete={handleDelete}
          isRefreshing={refreshingId === contextMenu.account.id}
          isSwitching={switchingId === contextMenu.account.id}
        />
      )}
    </div>
  )
}

export default AccountManager

