import { Users } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useI18n } from '../../i18n.jsx'
import AccountRow from './AccountRow'

function AccountList({
  accounts,
  filteredAccounts,
  selectedIds,
  onSelectAll,
  onSelectOne,
  copiedId,
  onCopy,
  onSwitch,
  onRefresh,
  onEdit,
  onDelete,
  onContextMenu,
  refreshingId,
  switchingId,
  localToken,
}) {
  const { theme, colors } = useTheme()
  const { t } = useI18n()
  const isDark = theme === 'dark'

  return (
    <div className="flex-1 overflow-auto p-6">
      {accounts.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-20 ${colors.textMuted}`}>
          <div className={`w-20 h-20 rounded-full ${isDark ? 'bg-white/5' : 'bg-gray-100'} flex items-center justify-center animate-float mb-4`}>
            <Users size={40} strokeWidth={1} className="opacity-50" />
          </div>
          <p className="font-medium mb-1">{t('common.noAccounts')}</p>
          <p className="text-sm opacity-75">{t('common.addAccountHint')}</p>
        </div>
      ) : (
        <div className={`${colors.card} rounded-2xl border ${colors.cardBorder} overflow-hidden shadow-lg`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${isDark ? 'bg-white/5' : 'bg-gray-50/80'} border-b-2 ${colors.cardBorder} backdrop-blur-sm`}>
                <tr>
                  <th className="px-2 py-2.5 text-left w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredAccounts.length && filteredAccounts.length > 0}
                      onChange={(e) => onSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded transition-transform hover:scale-110"
                    />
                  </th>
                  <th className={`px-4 py-2.5 text-left text-xs font-bold ${colors.textMuted} uppercase tracking-wider`}>
                    邮箱
                  </th>
                  <th className={`px-4 py-2.5 text-left text-xs font-bold ${colors.textMuted} uppercase tracking-wider whitespace-nowrap`}>
                    订阅类型
                  </th>
                  <th className={`px-4 py-2.5 text-left text-xs font-bold ${colors.textMuted} uppercase tracking-wider`}>
                    配额
                  </th>
                  <th className={`px-4 py-2.5 text-left text-xs font-bold ${colors.textMuted} uppercase tracking-wider whitespace-nowrap`}>
                    状态
                  </th>
                  <th className={`px-4 py-2.5 text-left text-xs font-bold ${colors.textMuted} uppercase tracking-wider whitespace-nowrap`}>
                    重置时间
                  </th>
                  <th className={`px-4 py-2.5 text-right text-xs font-bold ${colors.textMuted} uppercase tracking-wider whitespace-nowrap`}>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account, index) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    isSelected={selectedIds.includes(account.id)}
                    onSelect={(checked) => onSelectOne(account.id, checked)}
                    copiedId={copiedId}
                    onCopy={onCopy}
                    onSwitch={onSwitch}
                    onRefresh={onRefresh}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onContextMenu={onContextMenu}
                    refreshingId={refreshingId}
                    switchingId={switchingId}
                    isCurrentAccount={localToken?.refreshToken && account.refreshToken === localToken.refreshToken}
                    isLastRow={index === accounts.length - 1}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default AccountList
