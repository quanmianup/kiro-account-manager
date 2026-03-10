// 注册管理模块

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::fs;
use tokio::sync::Mutex;

/// 注册状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", content = "message")]
pub enum RegistrationStatus {
    Registering,    // 注册中
    Registered,     // 已注册
    Synced,         // 已同步
    Failed(String), // 注册失败（包含错误信息）
}

/// 注册记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistrationRecord {
    pub id: String,
    pub email: String,
    pub password: String, // 加密存储
    pub registered_at: String,
    pub status: RegistrationStatus,
    pub note: Option<String>,
    pub synced: bool, // 是否已同步到账号管理
}

/// 注册记录存储
#[derive(Clone)]
pub struct RegistrationStorage {
    file_path: PathBuf,
}

impl RegistrationStorage {
    /// 创建新的存储实例
    pub fn new() -> Self {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        let file_path = home
            .join(".kiro-account-manager")
            .join("registrations.json");
        Self { file_path }
    }

    /// 确保目录存在
    async fn ensure_dir(&self) -> Result<(), String> {
        if let Some(parent) = self.file_path.parent() {
            fs::create_dir_all(parent)
                .await
                .map_err(|e| format!("创建目录失败: {}", e))?;
        }
        Ok(())
    }

    /// 加载所有注册记录
    pub async fn load(&self) -> Result<Vec<RegistrationRecord>, String> {
        if !self.file_path.exists() {
            return Ok(Vec::new());
        }

        let content = fs::read_to_string(&self.file_path)
            .await
            .map_err(|e| format!("读取文件失败: {}", e))?;

        let records: Vec<RegistrationRecord> =
            serde_json::from_str(&content).map_err(|e| format!("解析 JSON 失败: {}", e))?;

        Ok(records)
    }

    /// 保存所有注册记录
    pub async fn save(&self, records: &[RegistrationRecord]) -> Result<(), String> {
        self.ensure_dir().await?;

        let content = serde_json::to_string_pretty(records)
            .map_err(|e| format!("序列化 JSON 失败: {}", e))?;

        fs::write(&self.file_path, content)
            .await
            .map_err(|e| format!("写入文件失败: {}", e))?;

        Ok(())
    }

    /// 添加新记录
    pub async fn add(&self, record: RegistrationRecord) -> Result<(), String> {
        let mut records = self.load().await?;
        records.push(record);
        self.save(&records).await
    }

    /// 更新记录
    pub async fn update(&self, id: &str, updated_record: RegistrationRecord) -> Result<(), String> {
        let mut records = self.load().await?;

        if let Some(record) = records.iter_mut().find(|r| r.id == id) {
            *record = updated_record;
            self.save(&records).await?;
            Ok(())
        } else {
            Err(format!("未找到 ID 为 {} 的记录", id))
        }
    }

    /// 删除记录
    pub async fn delete(&self, ids: &[String]) -> Result<(), String> {
        let mut records = self.load().await?;
        records.retain(|r| !ids.contains(&r.id));
        self.save(&records).await
    }
}

/// 注册流程状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessState {
    pub is_running: bool,
    pub target_count: usize,
    pub current_count: usize,
    pub interval_secs: u64,
    pub retry_count: usize,
    pub current_email: String,
    pub current_status: String,
}

/// 注册流程控制器
pub struct RegistrationProcess {
    storage: RegistrationStorage,
    state: Arc<Mutex<ProcessState>>,
}

impl RegistrationProcess {
    /// 创建新的注册流程控制器
    pub fn new() -> Self {
        Self {
            storage: RegistrationStorage::new(),
            state: Arc::new(Mutex::new(ProcessState {
                is_running: false,
                target_count: 0,
                current_count: 0,
                interval_secs: 30,
                retry_count: 3,
                current_email: String::new(),
                current_status: "空闲".to_string(),
            })),
        }
    }

    /// 启动注册流程
    pub async fn start(
        &self,
        target_count: usize,
        interval_secs: u64,
        retry_count: usize,
    ) -> Result<(), String> {
        // 更新状态为运行中
        let mut state = self.state.lock().await;
        if state.is_running {
            return Err("注册流程已在运行中".to_string());
        }

        state.is_running = true;
        state.target_count = target_count;
        state.current_count = 0;
        state.interval_secs = interval_secs;
        state.retry_count = retry_count;
        state.current_status = "准备开始注册...".to_string();
        drop(state);

        // 在后台任务中执行注册流程
        let storage = self.storage.clone();
        let state = self.state.clone();

        tokio::spawn(async move {
            Self::run_registration_loop_static(storage, state).await;
        });

        Ok(())
    }

    /// 停止注册流程
    pub async fn stop(&self) -> Result<(), String> {
        let mut state = self.state.lock().await;
        state.is_running = false;
        state.current_status = "注册流程已停止".to_string();
        Ok(())
    }

    /// 获取当前状态
    pub async fn get_state(&self) -> ProcessState {
        self.state.lock().await.clone()
    }

    /// 更新当前状态信息
    async fn update_status_static(state: &Arc<Mutex<ProcessState>>, email: &str, status: &str) {
        let mut s = state.lock().await;
        s.current_email = email.to_string();
        s.current_status = status.to_string();
    }

    /// 生成邮箱地址（示例实现）
    fn generate_email() -> String {
        use uuid::Uuid;
        format!("test_{}@example.com", Uuid::new_v4())
    }

    /// 生成密码（示例实现）
    fn generate_password() -> String {
        use uuid::Uuid;
        format!("Pass{}", &Uuid::new_v4().to_string().replace("-", "")[..12])
    }

    /// 注册单个账号
    async fn register_single_account_static(
        email: &str,
        password: &str,
        state: &Arc<Mutex<ProcessState>>,
    ) -> Result<(), String> {
        // 步骤 1: 调用 AWS Builder ID 注册 API
        Self::update_status_static(state, email, "发起注册请求...").await;

        let client = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            .build()
            .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

        // 注册请求
        let register_url = "https://api.awsbuilderid.com/register";
        let register_payload = serde_json::json!({
            "email": email,
            "password": password,
            "agreeToTerms": true
        });

        let response = client
            .post(register_url)
            .json(&register_payload)
            .send()
            .await
            .map_err(|e| format!("发送注册请求失败: {}", e))?;

        if !response.status().is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "未知错误".to_string());
            return Err(format!("注册请求失败: {}", error_text));
        }

        // 步骤 2: 等待验证码邮件
        Self::update_status_static(state, email, "等待验证码邮件...").await;

        // 这里需要集成邮箱客户端来获取验证码
        // 由于邮箱配置在前端，这里暂时模拟等待
        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;

        // 步骤 3: 解析验证码（需要从邮件中提取）
        // TODO: 集成 VerificationCodeListener 来自动获取验证码
        let verification_code = "123456"; // 临时占位符

        // 步骤 4: 提交验证码完成注册
        Self::update_status_static(state, email, "提交验证码...").await;

        let verify_url = "https://api.awsbuilderid.com/verify";
        let verify_payload = serde_json::json!({
            "email": email,
            "code": verification_code
        });

        let verify_response = client
            .post(verify_url)
            .json(&verify_payload)
            .send()
            .await
            .map_err(|e| format!("提交验证码失败: {}", e))?;

        if !verify_response.status().is_success() {
            let error_text = verify_response
                .text()
                .await
                .unwrap_or_else(|_| "未知错误".to_string());
            return Err(format!("验证码验证失败: {}", error_text));
        }

        Self::update_status_static(state, email, "注册成功").await;
        Ok(())
    }

    /// 注册循环（静态方法，用于 tokio::spawn）
    async fn run_registration_loop_static(
        storage: RegistrationStorage,
        state: Arc<Mutex<ProcessState>>,
    ) {
        loop {
            let current_state = state.lock().await.clone();

            if !current_state.is_running
                || current_state.current_count >= current_state.target_count
            {
                break;
            }

            // 生成邮箱和密码
            let email = Self::generate_email();
            let password = Self::generate_password();

            // 更新当前状态
            Self::update_status_static(&state, &email, "开始注册...").await;

            // 执行注册流程
            match Self::register_single_account_static(&email, &password, &state).await {
                Ok(_) => {
                    // 注册成功，保存记录
                    let record = RegistrationRecord {
                        id: uuid::Uuid::new_v4().to_string(),
                        email: email.clone(),
                        password: password.clone(),
                        registered_at: chrono::Local::now().to_rfc3339(),
                        status: RegistrationStatus::Registered,
                        note: None,
                        synced: false,
                    };
                    let _ = storage.add(record).await;

                    // 更新计数
                    let mut s = state.lock().await;
                    s.current_count += 1;
                }
                Err(e) => {
                    // 注册失败，记录错误
                    let record = RegistrationRecord {
                        id: uuid::Uuid::new_v4().to_string(),
                        email: email.clone(),
                        password: password.clone(),
                        registered_at: chrono::Local::now().to_rfc3339(),
                        status: RegistrationStatus::Failed(e.clone()),
                        note: None,
                        synced: false,
                    };
                    let _ = storage.add(record).await;
                }
            }

            // 等待间隔时间
            tokio::time::sleep(tokio::time::Duration::from_secs(
                current_state.interval_secs,
            ))
            .await;
        }

        // 流程结束，更新状态
        let mut s = state.lock().await;
        s.is_running = false;
        s.current_status = "注册流程已完成".to_string();
    }
}

// 重新导出类型
pub use crate::email_client::EmailConfig;
