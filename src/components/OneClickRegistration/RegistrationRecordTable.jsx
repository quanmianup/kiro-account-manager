import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, RefreshCw, Trash2, Upload } from 'lucide-react'
import RegistrationRecordRow from './RegistrationRecordRow'

/**
 * 注册记录表格组件
 */
const RegistrationRecordTable = ({
  records,
  selectedIds,
  unsyncedCount,
  loading,
  onSelectChange,
  onEdit,
  onDelete,
  onSync,
  onCheckRefresh,
  onBatchDelete,
  onBatchSync
}) => {
  const { t } = useTranslation()
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const pageSize = 10
  
  // 过滤记录
  const filteredRecords = records.filter(record =>
    record.email.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  // 分页
  const totalPages = Math.ceil(filteredRecords.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + pageSize)
  
  // 全选/取消全选
  const handleSelectAll = (checked) => {
    if (checked) {
      onSelectChange(paginatedRecords.map(r => r.id))
    } else {
      onSelectChange([])
    }
  }
  
  // 单选
  const handleSelectOne = (id, checked) => {
    if (checked) {
      onSelectChange([...selectedIds, id])
    } else {
      onSelectChange(selectedIds.filter(sid => sid !== id))
    }
  }
  
  const allSelected = paginatedRecords.length > 0 && 
    paginatedRecords.every(r => selectedIds.includes(r.id))
  
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 420px)', minHeight: '400px' }}>
      {/* 顶部操作栏 */}
      <div className="flex-shrink-0 p-3 sm:p-4 space-y-3 border-b border-gray-200 dark:border-gray-700">
        {/* 标题和刷新按钮 */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              {t('registration.records', '注册记录')}
            </h2>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              ({t('registration.totalRecords', { count: records.length }, `共 ${records.length} 条`)})
            </span>
            {unsyncedCount > 0 && (
              <span className="px-2 py-0.5 sm:py-1 bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 text-xs rounded-full">
                {t('registration.unsyncedCount', { count: unsyncedCount }, `未同步 ${unsyncedCount} 条`)}
              </span>
            )}
          </div>
          
          <button
            onClick={onCheckRefresh}
            disabled={loading}
            className="px-2 sm:px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
          >
            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('registration.checkRefresh', '检查刷新')}</span>
            <span className="sm:hidden">{t('registration.refresh', '刷新')}</span>
          </button>
        </div>
        
        {/* 搜索栏 */}
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('registration.searchPlaceholder', '搜索邮箱...')}
            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        
        {/* 批量操作按钮 */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onBatchDelete}
            disabled={selectedIds.length === 0}
            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1 text-xs sm:text-sm"
          >
            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{t('registration.batchDelete', '批量删除')}</span>
            <span className="sm:hidden">{t('registration.delete', '删除')}</span>
          </button>
          
          <button
            onClick={onBatchSync}
            disabled={selectedIds.length === 0}
            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1 text-xs sm:text-sm"
          >
            <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{t('registration.batchSync', '批量同步')}</span>
            <span className="sm:hidden">{t('registration.sync', '同步')}</span>
          </button>
          
          {selectedIds.length > 0 && (
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {t('registration.selectedCount', { count: selectedIds.length }, `已选择 ${selectedIds.length} 条`)}
            </span>
          )}
        </div>
      </div>
      
      {/* 表格区域 */}
      <div className="flex-1 overflow-auto min-h-0">
        <div className="min-w-full inline-block align-middle">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
              <tr>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded"
                  />
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {t('registration.email', '邮箱')}
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {t('registration.password', '密码')}
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap hidden md:table-cell">
                  {t('registration.registeredAt', '注册时间')}
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {t('registration.status', '状态')}
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {t('registration.actions', '操作')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {loading ? t('common.loading', '加载中...') : t('registration.noRecords', '暂无记录')}
                  </td>
                </tr>
              ) : (
                paginatedRecords.map(record => (
                  <RegistrationRecordRow
                    key={record.id}
                    record={record}
                    selected={selectedIds.includes(record.id)}
                    onSelect={(checked) => handleSelectOne(record.id, checked)}
                    onEdit={() => onEdit(record)}
                    onDelete={() => onDelete([record.id])}
                    onSync={() => onSync([record.id])}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* 底部分页 */}
      {totalPages > 1 && (
        <div className="flex-shrink-0 px-3 sm:px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 sm:px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
            >
              {t('common.previous', '上一页')}
            </button>
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {t('registration.pageInfo', { current: currentPage, total: totalPages }, `第 ${currentPage}/${totalPages} 页`)}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 sm:px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
            >
              {t('common.next', '下一页')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RegistrationRecordTable
