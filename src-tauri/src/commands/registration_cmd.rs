// 一键注册命令模块

use crate::registration::{
    EmailConfig, ProcessState, RegistrationRecord, RegistrationStatus, RegistrationStorage,
};
use crate::state::AppState;
use chrono;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use tauri::State;
use uuid;

/// 同步结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    pub success_count: usize,
    pub failed_emails: Vec<String>,
}

/// 保存邮箱配置
#[tauri::command]
pub async fn save_email_config(
    config: EmailConfig,
    _state: State<'_, AppState>,
) -> Result<String, String> {
    use crate::email_client::encrypt_password;
    use tokio::fs;

    // 加密密码
    let mut encrypted_config = config.clone();
    encrypted_config.password = encrypt_password(&config.password)?;

    // 保存到配置文件
    let home = dirs::home_dir().ok_or("无法获取用户目录")?;
    let config_dir = home.join(".kiro-account-manager");
    fs::create_dir_all(&config_dir)
        .await
        .map_err(|e| format!("创建配置目录失败: {}", e))?;

    let config_file = config_dir.join("email_config.json");
    let json = serde_json::to_string_pretty(&encrypted_config)
        .map_err(|e| format!("序列化配置失败: {}", e))?;

    fs::write(&config_file, json)
        .await
        .map_err(|e| format!("写入配置文件失败: {}", e))?;

    Ok("邮箱配置已保存".to_string())
}

/// 测试邮箱连接
#[tauri::command]
pub async fn test_email_connection(config: EmailConfig) -> Result<String, String> {
    use crate::email_client::create_email_client;

    let mut client = create_email_client(config)?;
    client.connect().await?;
    client.disconnect().await?;

    Ok("连接成功".to_string())
}

/// 加载邮箱配置
#[tauri::command]
pub async fn load_email_config() -> Result<Option<EmailConfig>, String> {
    use crate::email_client::decrypt_password;
    use tokio::fs;

    let home = dirs::home_dir().ok_or("无法获取用户目录")?;
    let config_file = home.join(".kiro-account-manager").join("email_config.json");

    if !config_file.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&config_file)
        .await
        .map_err(|e| format!("读取配置文件失败: {}", e))?;

    let mut config: EmailConfig =
        serde_json::from_str(&content).map_err(|e| format!("解析配置失败: {}", e))?;

    // 解密密码
    config.password = decrypt_password(&config.password)?;

    Ok(Some(config))
}

/// 获取注册记录
#[tauri::command]
pub async fn get_registration_records() -> Result<Vec<RegistrationRecord>, String> {
    let storage = RegistrationStorage::new();
    storage.load().await
}

/// 保存注册记录
#[tauri::command]
pub async fn save_registration_record(record: RegistrationRecord) -> Result<(), String> {
    let storage = RegistrationStorage::new();
    storage.add(record).await
}

/// 更新注册记录
#[tauri::command]
pub async fn update_registration_record(
    id: String,
    record: RegistrationRecord,
) -> Result<(), String> {
    let storage = RegistrationStorage::new();
    storage.update(&id, record).await
}

/// 删除注册记录
#[tauri::command]
pub async fn delete_registration_records(ids: Vec<String>) -> Result<(), String> {
    let storage = RegistrationStorage::new();
    storage.delete(&ids).await
}

/// 检查未同步账号
#[tauri::command]
pub async fn check_unsynced_accounts(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    // 获取注册记录
    let storage = RegistrationStorage::new();
    let records = storage.load().await?;

    // 获取账号管理中的账号
    let store = state.store.lock().map_err(|e| e.to_string())?;
    let accounts = store.get_all();
    let account_emails: HashSet<String> = accounts.iter().map(|a| a.email.clone()).collect();

    // 找出未同步的邮箱 ID
    let unsynced: Vec<String> = records
        .iter()
        .filter(|r| !r.synced && !account_emails.contains(&r.email))
        .map(|r| r.id.clone())
        .collect();

    Ok(unsynced)
}

/// 同步账号到账号管理
#[tauri::command]
pub async fn sync_accounts_to_manager(
    record_ids: Vec<String>,
    state: State<'_, AppState>,
) -> Result<SyncResult, String> {
    let storage = RegistrationStorage::new();
    let mut records = storage.load().await?;
    let mut success_count = 0;
    let failed_emails = Vec::new();

    for id in record_ids {
        if let Some(record) = records.iter_mut().find(|r| r.id == id) {
            // 创建账号对象
            let account = crate::account::Account {
                id: uuid::Uuid::new_v4().to_string(),
                email: record.email.clone(),
                label: record.email.clone(),
                status: "待验证".to_string(),
                added_at: chrono::Local::now().format("%Y/%m/%d %H:%M:%S").to_string(),
                access_token: None,
                refresh_token: None,
                csrf_token: None,
                session_token: None,
                expires_at: None,
                provider: Some("registration".to_string()),
                user_id: None,
                client_id: None,
                client_secret: None,
                region: None,
                client_id_hash: None,
                sso_session_id: None,
                id_token: None,
                profile_arn: None,
                usage_data: None,
            };

            // 添加到账号管理
            let mut store = state.store.lock().map_err(|e| e.to_string())?;
            store.add(account);

            // 更新记录状态
            record.synced = true;
            record.status = RegistrationStatus::Synced;
            success_count += 1;
        }
    }

    // 保存更新后的记录
    storage.save(&records).await?;

    Ok(SyncResult {
        success_count,
        failed_emails,
    })
}

/// 启动注册流程
#[tauri::command]
pub async fn start_registration_process(
    target_count: usize,
    interval_secs: u64,
    retry_count: usize,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .registration_process
        .start(target_count, interval_secs, retry_count)
        .await
}

/// 停止注册流程
#[tauri::command]
pub async fn stop_registration_process(state: State<'_, AppState>) -> Result<(), String> {
    state.registration_process.stop().await
}

/// 获取注册流程状态
#[tauri::command]
pub async fn get_registration_state(state: State<'_, AppState>) -> Result<ProcessState, String> {
    Ok(state.registration_process.get_state().await)
}
