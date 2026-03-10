import { useTranslation } from 'react-i18next'

// 邮箱模板配置
// 注意：这里配置的是接收邮件的服务器（IMAP/POP3），不是发送邮件的 SMTP
// 所有配置均已验证，来源于各邮箱服务商官方文档
const EMAIL_TEMPLATES = {
  qq: {
    name: 'QQ邮箱（推荐）',
    imap: { host: 'imap.qq.com', port: 993, ssl: true },
    pop3: { host: 'pop.qq.com', port: 995, ssl: true }
  },
  '163': {
    name: '163邮箱（网易）',
    imap: { host: 'imap.163.com', port: 993, ssl: true },
    pop3: { host: 'pop.163.com', port: 995, ssl: true }
  },
  '126': {
    name: '126邮箱（网易）',
    imap: { host: 'imap.126.com', port: 993, ssl: true },
    pop3: { host: 'pop.126.com', port: 995, ssl: true }
  },
  gmail: {
    name: 'Gmail',
    imap: { host: 'imap.gmail.com', port: 993, ssl: true },
    pop3: { host: 'pop.gmail.com', port: 995, ssl: true }
  },
  outlook: {
    name: 'Outlook / Hotmail',
    imap: { host: 'outlook.office365.com', port: 993, ssl: true },
    pop3: { host: 'outlook.office365.com', port: 995, ssl: true }
  }
}

/**
 * 邮箱模板选择器组件
 */
const EmailTemplateSelector = ({ protocol, onSelect, value }) => {
  const { t } = useTranslation()
  
  const handleChange = (e) => {
    const templateKey = e.target.value
    if (templateKey && EMAIL_TEMPLATES[templateKey]) {
      const template = EMAIL_TEMPLATES[templateKey]
      const config = protocol === 'imap' ? template.imap : template.pop3
      onSelect(config, templateKey)
    } else {
      // 清空模板选择
      onSelect(null, '')
    }
  }
  
  return (
    <select
      value={value || ''}
      onChange={handleChange}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
    >
      {Object.entries(EMAIL_TEMPLATES).map(([key, template]) => (
        <option key={key} value={key}>
          {template.name}
        </option>
      ))}
    </select>
  )
}

// 导出模板数据供其他组件使用
export { EMAIL_TEMPLATES }

export default EmailTemplateSelector
