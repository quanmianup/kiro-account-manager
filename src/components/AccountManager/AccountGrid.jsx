import { Users, Plus } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useI18n } from '../../i18n.jsx'
import AccountCard from './AccountCard'

function AccountGrid({
  accounts,
  selectedIds,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {accounts.map((account) => (
            <AccountCard
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
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default AccountGrid
