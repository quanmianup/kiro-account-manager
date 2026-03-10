import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, Server, Lock, CheckCircle, XCircle, Loader2, HelpCircle, Eye, EyeOff, Settings } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import EmailTemplateSelector, { EMAIL_TEMPLATES } from './EmailTemplateSelector'

// 默认端口配置
const DEFAULT_PORTS = {
  imap: { ssl: 993, nossl: 143 },
  pop3: { ssl: 995, nossl: 110 }
}

/**
 * 邮箱配置面板组件
 * @param {Object} config - 邮箱配置对象
 * @param {Function} onChange - 配置变更回调
 * @param {boolean} compact - 是否使用紧凑模式
 * @param {Function} onNavigate - 导航回调函数
 */
const EmailConfigPanel = ({ config, onChange, compact = false, onNavigate }) => {
  const { t } = useTranslation()
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  // 跟踪用户是否手动修改过端口
  const [portManuallyChanged, setPortManuallyChanged] = useState(false)
  // 跟踪当前选择的模板（默认选中 QQ 邮箱）
  const [selectedTemplate, setSelectedTemplate] = useState('qq')
  
  // 检查端口是否为默认值
  const isDefaultPort = (protocol, port, ssl) => {
    const defaults = DEFAULT_PORTS[protocol]
    if (!defaults) return false
    return port === (ssl ? defaults.ssl : defaults.nossl)
  }
  
  // 处理配置变更
  const handleChange = (field, value) => {
    // 如果用户手动修改端口，标记为已手动修改
    if (field === 'port') {
      setPortManuallyChanged(true)
    }
    
    // 如果用户手动修改服务器地址，清空模板选择
    if (field === 'host') {
      setSelectedTemplate('')
    }
    
    // 如果切换协议
    if (field === 'protocol') {
      // 如果已选择模板，自动更新服务器信息
      if (selectedTemplate && EMAIL_TEMPLATES[selectedTemplate]) {
        const template = EMAIL_TEMPLATES[selectedTemplate]
        const newConfig = value === 'imap' ? template.imap : template.pop3
        onChange({
          ...config,
          protocol: value,
          host: newConfig.host,
          port: newConfig.port,
          ssl: newConfig.ssl
        })
        // 重置手动修改标记
        setPortManuallyChanged(false)
        return
      }
      
      // 如果没有选择模板，但端口未被手动修改，自动切换到新协议的默认端口
      if (!portManuallyChanged) {
        const newPort = config.ssl 
          ? DEFAULT_PORTS[value].ssl 
          : DEFAULT_PORTS[value].nossl
        onChange({
          ...config,
          protocol: value,
          port: newPort
        })
        return
      }
    }
    
    // 如果切换 SSL/TLS，且端口未被手动修改（或是默认值），自动切换端口
    if (field === 'ssl') {
      const currentPort = config.port
      const protocol = config.protocol
      
      // 检查当前端口是否为默认值
      if (!portManuallyChanged || isDefaultPort(protocol, currentPort, config.ssl)) {
        const newPort = value 
          ? DEFAULT_PORTS[protocol].ssl 
          : DEFAULT_PORTS[protocol].nossl
        onChange({ ...config, ssl: value, port: newPort })
        // 重置手动修改标记，因为这是自动切换
        setPortManuallyChanged(false)
        return
      }
    }
    
    onChange({ ...config, [field]: value })
  }
  
  // 处理模板选择
  const handleTemplateSelect = (template, templateKey) => {
    if (template) {
      onChange({
        ...config,
        host: template.host,
        port: template.port,
        ssl: template.ssl
      })
      // 保存选择的模板 key
      setSelectedTemplate(templateKey)
      // 模板选择时重置手动修改标记
      setPortManuallyChanged(false)
    } else {
      // 清空模板选择
      setSelectedTemplate('')
    }
  }
  
  // 测试邮箱连接
  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    
    try {
      const result = await invoke('test_email_connection', { config })
      setTestResult({ success: true, message: result })
    } catch (error) {
      setTestResult({ success: false, message: error })
    } finally {
      setTesting(false)
    }
  }
  
  // 保存配置
  const handleSaveConfig = async () => {
    setSaving(true)
    
    try {
      await invoke('save_email_config', { config })
      setTestResult({ success: true, message: t('registration.configSaved', '配置已保存') })
    } catch (error) {
      setTestResult({ success: false, message: error })
    } finally {
      setSaving(false)
    }
  }
  
  // 紧凑模式渲染
  if (compact) {
    return (
      <div className="space-y-3">
        {/* 模板选择 */}
        <div className="flex items-center gap-3">
          <label className="text-base font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap w-16">
            {t('registration.template', '模板')}
          </label>
          <div className="flex-1">
            <EmailTemplateSelector
              protocol={config.protocol}
              value={selectedTemplate}
              onSelect={handleTemplateSelect}
            />
          </div>
        </div>
        
        {/* 邮箱 */}
        <div className="flex items-center gap-3">
          <label className="text-base font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap w-16">
            {t('registration.username', '邮箱')}
          </label>
          <input
            type="email"
            value={config.username}
            onChange={(e) => handleChange('username', e.target.value)}
            placeholder="example@qq.com"
            className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        
        {/* 授权码 */}
        <div className="flex items-center gap-3">
          <label className="text-base font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap w-16">
            {t('registration.authCode', '授权码')}
          </label>
          <div className="flex-1">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={config.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="****************"
                className="w-full px-2 py-1.5 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              💡 QQ 邮箱需填写授权码
            </p>
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button
            onClick={handleTestConnection}
            disabled={testing || !config.username || !config.password}
            className="flex-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            {testing && <Loader2 className="w-3 h-3 animate-spin" />}
            {t('registration.testConnection', '测试')}
          </button>
          
          <button
            onClick={handleSaveConfig}
            disabled={saving || !config.username || !config.password}
            className="flex-1 px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            {t('registration.saveConfig', '保存')}
          </button>
          
          {/* 邮箱模板设置按钮 */}
          {onNavigate && (
            <button
              onClick={() => {
                // 先设置 URL 参数，再导航
                const currentUrl = new URL(window.location.href)
                currentUrl.searchParams.set('scrollTo', 'email-templates')
                window.history.replaceState(null, '', currentUrl.toString())
                // 导航到设置页面
                onNavigate('settings')
              }}
              className="px-3 py-1.5 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center justify-center gap-1"
              title={t('registration.goToSettings', '前往设置配置邮箱模板')}
            >
              <Settings className="w-3 h-3" />
            </button>
          )}
        </div>
        
        {/* 测试结果 */}
        {testResult && (
          <div className={`flex items-center gap-1 text-xs ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
            {testResult.success ? (
              <CheckCircle className="w-3 h-3" />
            ) : (
              <XCircle className="w-3 h-3" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>
    )
  }
  
  // 完整模式渲染
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Mail className="w-5 h-5 mr-2 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('registration.emailConfig', '邮箱配置')}
          </h2>
        </div>
        
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <HelpCircle className="w-4 h-4 mr-1" />
          <span>推荐使用 QQ 邮箱，密码需填写授权码</span>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* 第一行：协议和模板 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('registration.protocol', '协议')}
            </label>
            <select
              value={config.protocol}
              onChange={(e) => handleChange('protocol', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="imap">IMAP（推荐 - 支持多设备同步）</option>
              <option value="pop3">POP3（仅下载邮件）</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              💡 推荐使用 IMAP，支持多设备同步和文件夹管理
            </p>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('registration.template', '模板')}
            </label>
            <EmailTemplateSelector
              protocol={config.protocol}
              value={selectedTemplate}
              onSelect={handleTemplateSelect}
            />
          </div>
        </div>
        
        {/* 第二行：服务器配置 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Server className="w-4 h-4 inline mr-1" />
              {t('registration.server', '服务器')}
            </label>
            <input
              type="text"
              value={config.host}
              onChange={(e) => handleChange('host', e.target.value)}
              placeholder="imap.gmail.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('registration.port', '端口')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={config.port}
                onChange={(e) => handleChange('port', parseInt(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={config.ssl}
                  onChange={(e) => handleChange('ssl', e.target.checked)}
                  className="mr-1"
                />
                SSL/TLS
              </label>
            </div>
          </div>
        </div>
        
        {/* 第三行：邮箱和密码 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('registration.username', '邮箱')}
            </label>
            <input
              type="email"
              value={config.username}
              onChange={(e) => handleChange('username', e.target.value)}
              placeholder="example@gmail.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Lock className="w-4 h-4 inline mr-1" />
              {t('registration.authCode', '授权码')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={config.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="****************"
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              💡 请填写邮箱授权码，非邮箱登录密码
            </p>
          </div>
        </div>
        
        {/* 操作按钮和测试结果 */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleTestConnection}
              disabled={testing || !config.username || !config.password}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {testing && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('registration.testConnection', '测试连接')}
            </button>
            
            <button
              onClick={handleSaveConfig}
              disabled={saving || !config.username || !config.password}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('registration.saveConfig', '保存配置')}
            </button>
          </div>
          
          {testResult && (
            <div className={`flex items-center gap-2 ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
              {testResult.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span className="text-sm">{testResult.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EmailConfigPanel
