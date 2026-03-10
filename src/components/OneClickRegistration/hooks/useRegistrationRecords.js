import { useState, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'

/**
 * 注册记录管理 Hook
 */
const useRegistrationRecords = () => {
  const [records, setRecords] = useState([])
  const [selectedRecordIds, setSelectedRecordIds] = useState([])
  const [unsyncedCount, setUnsyncedCount] = useState(0)
  const [loading, setLoading] = useState(false)
  
  // 加载注册记录
  const loadRecords = useCallback(async () => {
    setLoading(true)
    try {
      const data = await invoke('get_registration_records')
      setRecords(data)
      
      // 计算未同步数量
      const unsynced = data.filter(r => r.status === 'Registered' && !r.synced).length
      setUnsyncedCount(unsynced)
    } catch (error) {
      console.error('加载注册记录失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 保存注册记录
  const saveRecord = useCallback(async (record) => {
    try {
      await invoke('save_registration_record', { record })
      await loadRecords()
    } catch (error) {
      console.error('保存注册记录失败:', error)
      throw error
    }
  }, [loadRecords])
  
  // 更新注册记录
  const updateRecord = useCallback(async (id, record) => {
    try {
      await invoke('update_registration_record', { id, record })
      await loadRecords()
    } catch (error) {
      console.error('更新注册记录失败:', error)
      throw error
    }
  }, [loadRecords])
  
  // 删除注册记录
  const deleteRecords = useCallback(async (ids) => {
    try {
      await invoke('delete_registration_records', { ids })
      await loadRecords()
    } catch (error) {
      console.error('删除注册记录失败:', error)
      throw error
    }
  }, [loadRecords])
  
  // 检查未同步账号
  const checkUnsynced = useCallback(async () => {
    setLoading(true)
    try {
      const unsyncedIds = await invoke('check_unsynced_accounts')
      
      // 更新记录状态
      setRecords(prev => prev.map(record => ({
        ...record,
        isUnsynced: unsyncedIds.includes(record.id)
      })))
      
      setUnsyncedCount(unsyncedIds.length)
    } catch (error) {
      console.error('检查未同步账号失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 同步到账号管理
  const syncToManager = useCallback(async (recordIds) => {
    try {
      const result = await invoke('sync_accounts_to_manager', { recordIds })
      
      // 刷新记录列表
      await loadRecords()
      
      return result
    } catch (error) {
      console.error('同步账号失败:', error)
      throw error
    }
  }, [loadRecords])
  
  return {
    records,
    selectedRecordIds,
    unsyncedCount,
    loading,
    loadRecords,
    saveRecord,
    updateRecord,
    deleteRecords,
    checkUnsynced,
    syncToManager,
    setSelectedRecordIds
  }
}

export default useRegistrationRecords
