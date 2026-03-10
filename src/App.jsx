import { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import Sidebar from './components/Sidebar'
import Home from './components/Home'
import AccountManager from './components/AccountManager/index'
import Settings from './components/Settings'
import KiroConfig from './components/KiroConfig/index'
import About from './components/About'
import Login from './components/Login'
import AuthCallback from './components/AuthCallback'
import OneClickRegistration from './components/OneClickRegistration/index'
import ErrorBoundary from './components/ErrorBoundary'
// import UpdateChecker from './components/UpdateChecker'

import { useTheme } from './contexts/ThemeContext'

// 默认自动刷新间隔：50分钟
const DEFAULT_REFRESH_INTERVAL = 50 * 60 * 1000

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeMenu, setActiveMenu] = useState('home')
  const { colors } = useTheme()
  const refreshTimerRef = useRef(null)

  // 启动时只刷新 token（不获取 usage，快速启动）
  const refreshExpiredTokensOnly = async () => {
    try {
      const settings = await invoke('get_app_settings').catch(() => ({}))
      if (!settings.autoRefresh) return
      
      const accounts = await invoke('get_accounts')
      if (!accounts || accounts.length === 0) return
      
      const now = new Date()
      const refreshThreshold = 5 * 60 * 1000 // 提前 5 分钟
      
      const expiredAccounts = accounts.filter(acc => {
        // 跳过已封禁账号
        if (acc.status === '已封禁' || acc.status === '封禁') return false
        if (!acc.expiresAt) return false
        const expiresAt = new Date(acc.expiresAt.replace(/\//g, '-'))
        return (expiresAt.getTime() - now.getTime()) < refreshThreshold
      })
      
      if (expiredAccounts.length === 0) {
        console.log('[AutoRefresh] 没有需要刷新的 token')
        return
      }
      
      console.log(`[AutoRefresh] 刷新 ${expiredAccounts.length} 个过期 token...`)
      
      // 并发刷新
      await Promise.allSettled(
        expiredAccounts.map(async (account) => {
          try {
            await invoke('refresh_account_token', { id: account.id })
            console.log(`[AutoRefresh] ${account.email} token 刷新成功`)
          } catch (e) {
            console.warn(`[AutoRefresh] ${account.email} token 刷新失败:`, e)
          }
        })
      )
      
      console.log('[AutoRefresh] token 刷新完成')
    } catch (e) {
      console.error('[AutoRefresh] 刷新失败:', e)
    }
  }

  // 定时刷新：只刷新 token
  const checkAndRefreshExpiringTokens = async () => {
    try {
      const settings = await invoke('get_app_settings').catch(() => ({}))
      if (!settings.autoRefresh) return
      
      const accounts = await invoke('get_accounts')
      if (!accounts || accounts.length === 0) return
      
      const now = new Date()
      const refreshThreshold = 5 * 60 * 1000
      
      const expiredAccounts = accounts.filter(acc => {
        // 跳过已封禁账号
        if (acc.status === '已封禁' || acc.status === '封禁') return false
        if (!acc.expiresAt) return false
        const expiresAt = new Date(acc.expiresAt.replace(/\//g, '-'))
        return (expiresAt.getTime() - now.getTime()) < refreshThreshold
      })
      
      if (expiredAccounts.length === 0) {
        console.log('[AutoRefresh] 没有需要刷新的 token')
        return
      }
      
      console.log(`[AutoRefresh] 刷新 ${expiredAccounts.length} 个 token...`)
      
      await Promise.allSettled(
        expiredAccounts.map(async (account) => {
          try {
            await invoke('refresh_account_token', { id: account.id })
            console.log(`[AutoRefresh] ${account.email} token 刷新成功`)
          } catch (e) {
            console.warn(`[AutoRefresh] ${account.email} token 刷新失败:`, e)
          }
        })
      )
      
      console.log('[AutoRefresh] token 刷新完成')
    } catch (e) {
      console.error('[AutoRefresh] 刷新失败:', e)
    }
  }

  // 启动自动刷新定时器
  const startAutoRefreshTimer = async () => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
    }
    
    // 启动时只刷新 token（快速启动）
    refreshExpiredTokensOnly()
    
    // 从设置读取刷新间隔
    const settings = await invoke('get_app_settings').catch(() => ({}))
    const intervalMs = (settings.autoRefreshInterval || 50) * 60 * 1000
    
    console.log(`[AutoRefresh] 定时器间隔: ${settings.autoRefreshInterval || 50} 分钟`)
    refreshTimerRef.current = setInterval(checkAndRefreshExpiringTokens, intervalMs)
  }

  useEffect(() => {
    checkAuth()
    
    // 检查是否是回调页面
    const url = new URL(window.location.href)
    if (url.pathname === '/callback' && (url.searchParams.has('code') || url.searchParams.has('state'))) {
      setActiveMenu('callback')
      return
    }
    
    let unlistenLogin
    let unlistenSettings
    
    // 监听登录成功事件
    const setupListeners = async () => {
      unlistenLogin = await listen('login-success', (event) => {
        console.log('Login success in App:', event.payload)
        checkAuth()
        setActiveMenu('token')
      })
      
      // 监听设置变化，重启定时器
      unlistenSettings = await listen('settings-changed', () => {
        console.log('[AutoRefresh] 设置已变化，重启定时器')
        startAutoRefreshTimer()
      })
    }
    
    setupListeners()
    
    // 启动自动刷新定时器
    startAutoRefreshTimer()
    
    return () => { 
      if (unlistenLogin && typeof unlistenLogin === 'function') {
        unlistenLogin()
      }
      if (unlistenSettings && typeof unlistenSettings === 'function') {
        unlistenSettings()
      }
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }
    }
  }, [])

  const checkAuth = async () => {
    try {
      const currentUser = await invoke('get_current_user')
      setUser(currentUser)
    } catch (e) {
      console.error('Auth check failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (loggedInUser) => {
    if (loggedInUser) {
      setUser(loggedInUser)
    }
    checkAuth()
  }

  const handleLogout = async () => {
    await invoke('logout')
    setUser(null)
  }

  const renderContent = () => {
    try {
      console.log('[App] Rendering menu:', activeMenu)
      switch (activeMenu) {
        case 'home': return <Home key="home" onNavigate={setActiveMenu} />
        case 'token': return <AccountManager key="token" />
        case 'kiro-config': return <KiroConfig key="kiro-config" />
        case 'one-click-registration': return <OneClickRegistration key="one-click-registration" onNavigate={setActiveMenu} />
        case 'login': return <Login key="login" onLogin={(user) => { handleLogin(user); setActiveMenu('token'); }} />
        case 'callback': return <AuthCallback key="callback" />
        case 'settings': return <Settings key="settings" onNavigate={setActiveMenu} />
        case 'about': return <About key="about" />
        default: 
          console.warn('[App] Unknown menu:', activeMenu)
          return <Home key="default" />
      }
    } catch (error) {
      console.error('[App] Error rendering content:', error)
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 mb-4">页面加载失败</p>
            <button 
              onClick={() => setActiveMenu('home')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              返回首页
            </button>
          </div>
        </div>
      )
    }
  }

  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-sm">加载中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex h-screen ${colors.main}`}>
      <Sidebar 
        activeMenu={activeMenu} 
        onMenuChange={setActiveMenu}
        user={user}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-hidden">
        <ErrorBoundary key={activeMenu}>
          {renderContent()}
        </ErrorBoundary>
      </main>
      
      {/* <UpdateChecker /> */}
    </div>
  )
}

export default App
