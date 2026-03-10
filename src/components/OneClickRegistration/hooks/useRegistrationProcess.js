import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

/**
 * 注册流程控制 Hook
 */
const useRegistrationProcess = () => {
  const [processState, setProcessState] = useState({
    is_running: false,
    target_count: 0,
    current_count: 0,
    interval_secs: 30,
    retry_count: 3,
    current_email: '',
    current_status: ''
  })
  
  // 监听注册流程状态更新事件
  useEffect(() => {
    let unlisten
    
    const setupListener = async () => {
      unlisten = await listen('registration-progress', (event) => {
        setProcessState(event.payload)
      })
    }
    
    setupListener()
    
    // 初始加载状态
    loadState()
    
    return () => {
      if (unlisten && typeof unlisten === 'function') {
        unlisten()
      }
    }
  }, [])
  
  // 加载当前状态
  const loadState = useCallback(async () => {
    try {
      const state = await invoke('get_registration_state')
      setProcessState(state)
    } catch (error) {
      console.error('加载注册流程状态失败:', error)
    }
  }, [])
  
  // 启动注册流程
  const startProcess = useCallback(async (targetCount, intervalSecs, retryCount) => {
    try {
      await invoke('start_registration_process', {
        targetCount,
        intervalSecs,
        retryCount
      })
      
      // 更新本地状态
      setProcessState(prev => ({
        ...prev,
        is_running: true,
        target_count: targetCount,
        current_count: 0,
        interval_secs: intervalSecs,
        retry_count: retryCount
      }))
    } catch (error) {
      console.error('启动注册流程失败:', error)
      throw error
    }
  }, [])
  
  // 停止注册流程
  const stopProcess = useCallback(async () => {
    try {
      await invoke('stop_registration_process')
      
      // 更新本地状态
      setProcessState(prev => ({
        ...prev,
        is_running: false,
        current_status: '注册流程已停止'
      }))
    } catch (error) {
      console.error('停止注册流程失败:', error)
      throw error
    }
  }, [])
  
  return {
    processState,
    startProcess,
    stopProcess,
    loadState
  }
}

export default useRegistrationProcess
