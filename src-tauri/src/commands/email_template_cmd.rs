// 邮箱模板管理命令

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// 邮箱模板配置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmailTemplate {
    pub id: String,
    pub name: String,
    pub imap_host: String,
    pub imap_port: u16,
    pub imap_ssl: bool,
    pub pop3_host: String,
    pub pop3_port: u16,
    pub pop3_ssl: bool,
}

/// 获取邮箱模板配置文件路径
fn get_email_templates_path() -> PathBuf {
    let data_dir = dirs::data_dir().unwrap_or_else(|| {
        let home = std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("HOME"))
            .unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home)
    });
    data_dir
        .join(".kiro-account-manager")
        .join("email-templates.json")
}

/// 加载邮箱模板列表
fn load_email_templates_inner() -> Result<Vec<EmailTemplate>, String> {
    let path = get_email_templates_path();
    if !path.exists() {
        // 返回默认模板
        return Ok(get_default_templates());
    }
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("读取邮箱模板失败: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("解析邮箱模板失败: {}", e))
}

/// 保存邮箱模板列表
fn save_email_templates_inner(templates: Vec<EmailTemplate>) -> Result<(), String> {
    let path = get_email_templates_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    let content = serde_json::to_string_pretty(&templates)
        .map_err(|e| format!("序列化邮箱模板失败: {}", e))?;
    std::fs::write(&path, content).map_err(|e| format!("写入邮箱模板失败: {}", e))?;
    Ok(())
}

/// 获取默认邮箱模板
fn get_default_templates() -> Vec<EmailTemplate> {
    vec![
        EmailTemplate {
            id: "qq".to_string(),
            name: "QQ邮箱（推荐）".to_string(),
            imap_host: "imap.qq.com".to_string(),
            imap_port: 993,
            imap_ssl: true,
            pop3_host: "pop.qq.com".to_string(),
            pop3_port: 995,
            pop3_ssl: true,
        },
        EmailTemplate {
            id: "163".to_string(),
            name: "163邮箱（网易）".to_string(),
            imap_host: "imap.163.com".to_string(),
            imap_port: 993,
            imap_ssl: true,
            pop3_host: "pop.163.com".to_string(),
            pop3_port: 995,
            pop3_ssl: true,
        },
        EmailTemplate {
            id: "126".to_string(),
            name: "126邮箱（网易）".to_string(),
            imap_host: "imap.126.com".to_string(),
            imap_port: 993,
            imap_ssl: true,
            pop3_host: "pop.126.com".to_string(),
            pop3_port: 995,
            pop3_ssl: true,
        },
        EmailTemplate {
            id: "gmail".to_string(),
            name: "Gmail".to_string(),
            imap_host: "imap.gmail.com".to_string(),
            imap_port: 993,
            imap_ssl: true,
            pop3_host: "pop.gmail.com".to_string(),
            pop3_port: 995,
            pop3_ssl: true,
        },
        EmailTemplate {
            id: "outlook".to_string(),
            name: "Outlook / Hotmail".to_string(),
            imap_host: "outlook.office365.com".to_string(),
            imap_port: 993,
            imap_ssl: true,
            pop3_host: "outlook.office365.com".to_string(),
            pop3_port: 995,
            pop3_ssl: true,
        },
    ]
}

#[tauri::command]
pub async fn get_email_templates() -> Result<Vec<EmailTemplate>, String> {
    tokio::task::spawn_blocking(load_email_templates_inner)
        .await
        .map_err(|e| format!("任务失败: {}", e))?
}

#[tauri::command]
pub async fn save_email_templates(templates: Vec<EmailTemplate>) -> Result<(), String> {
    tokio::task::spawn_blocking(move || save_email_templates_inner(templates))
        .await
        .map_err(|e| format!("任务失败: {}", e))?
}

#[tauri::command]
pub async fn add_email_template(template: EmailTemplate) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let mut templates = load_email_templates_inner()?;
        // 检查 ID 是否已存在
        if templates.iter().any(|t| t.id == template.id) {
            return Err(format!("模板 ID '{}' 已存在", template.id));
        }
        templates.push(template);
        save_email_templates_inner(templates)
    })
    .await
    .map_err(|e| format!("任务失败: {}", e))?
}

#[tauri::command]
pub async fn update_email_template(template: EmailTemplate) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let mut templates = load_email_templates_inner()?;
        if let Some(existing) = templates.iter_mut().find(|t| t.id == template.id) {
            *existing = template;
            save_email_templates_inner(templates)
        } else {
            Err(format!("模板 ID '{}' 不存在", template.id))
        }
    })
    .await
    .map_err(|e| format!("任务失败: {}", e))?
}

#[tauri::command]
pub async fn delete_email_template(id: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let mut templates = load_email_templates_inner()?;
        let original_len = templates.len();
        templates.retain(|t| t.id != id);
        if templates.len() == original_len {
            return Err(format!("模板 ID '{}' 不存在", id));
        }
        save_email_templates_inner(templates)
    })
    .await
    .map_err(|e| format!("任务失败: {}", e))?
}

#[tauri::command]
pub async fn reset_email_templates() -> Result<(), String> {
    tokio::task::spawn_blocking(|| {
        let templates = get_default_templates();
        save_email_templates_inner(templates)
    })
    .await
    .map_err(|e| format!("任务失败: {}", e))?
}
