// 邮箱客户端模块

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use async_trait::async_trait;
use base64::Engine;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// 邮箱协议类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum EmailProtocol {
    #[serde(rename = "imap")]
    Imap,
    #[serde(rename = "pop3")]
    Pop3,
}

/// 邮箱配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailConfig {
    pub protocol: EmailProtocol,
    pub host: String,
    pub port: u16,
    pub ssl: bool,
    pub username: String,
    pub password: String,
}

/// 邮件结构
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct Email {
    pub from: String,
    pub subject: String,
    pub body: String,
    pub received_at: String,
}

/// 邮箱客户端 trait
#[async_trait]
pub trait EmailClient: Send + Sync {
    /// 连接到邮箱服务器
    async fn connect(&mut self) -> Result<(), String>;

    /// 获取最新的邮件
    #[allow(dead_code)]
    async fn fetch_latest_emails(&mut self, count: usize) -> Result<Vec<Email>, String>;

    /// 断开连接
    async fn disconnect(&mut self) -> Result<(), String>;
}

/// IMAP 客户端实现
pub struct ImapClient {
    config: EmailConfig,
}

impl ImapClient {
    pub fn new(config: EmailConfig) -> Self {
        Self { config }
    }
}

#[async_trait]
impl EmailClient for ImapClient {
    async fn connect(&mut self) -> Result<(), String> {
        let config = self.config.clone();

        // 使用 tokio::task::spawn_blocking 在阻塞线程中执行 async-std 代码
        let result = tokio::task::spawn_blocking(move || {
            // 使用 async-std 运行时
            async_std::task::block_on(async {
                let addr = format!("{}:{}", config.host, config.port);

                // 连接到服务器
                let tcp_stream = async_std::net::TcpStream::connect(&addr)
                    .await
                    .map_err(|e| format!("连接服务器失败: {}", e))?;

                // 如果启用 SSL，使用 TLS 包装
                let tls = async_native_tls::TlsConnector::new();

                let tls_stream = tls
                    .connect(&config.host, tcp_stream)
                    .await
                    .map_err(|e| format!("TLS 连接失败: {}", e))?;

                // 创建 IMAP 客户端
                let client = async_imap::Client::new(tls_stream);

                // 登录测试
                let mut session = client
                    .login(&config.username, &config.password)
                    .await
                    .map_err(|e| format!("登录失败: {:?}", e))?;

                // 登出
                let _ = session.logout().await;

                Ok::<(), String>(())
            })
        })
        .await
        .map_err(|e| format!("任务执行失败: {}", e))?;

        result
    }

    async fn fetch_latest_emails(&mut self, count: usize) -> Result<Vec<Email>, String> {
        let config = self.config.clone();

        // 使用 tokio::task::spawn_blocking 在阻塞线程中执行
        let emails = tokio::task::spawn_blocking(move || {
            async_std::task::block_on(async {
                use futures::stream::StreamExt;

                let addr = format!("{}:{}", config.host, config.port);

                // 连接
                let tcp_stream = async_std::net::TcpStream::connect(&addr)
                    .await
                    .map_err(|e| format!("连接服务器失败: {}", e))?;

                let tls = async_native_tls::TlsConnector::new();
                let tls_stream = tls
                    .connect(&config.host, tcp_stream)
                    .await
                    .map_err(|e| format!("TLS 连接失败: {}", e))?;

                let client = async_imap::Client::new(tls_stream);
                let mut session = client
                    .login(&config.username, &config.password)
                    .await
                    .map_err(|e| format!("登录失败: {:?}", e))?;

                // 选择收件箱
                session
                    .select("INBOX")
                    .await
                    .map_err(|e| format!("选择收件箱失败: {:?}", e))?;

                // 搜索最新的邮件
                let search_result = session
                    .search("ALL")
                    .await
                    .map_err(|e| format!("搜索邮件失败: {:?}", e))?;

                let mut emails = Vec::new();
                let total = search_result.len();

                if total == 0 {
                    let _ = session.logout().await;
                    return Ok(emails);
                }

                // 获取最新的 count 封邮件
                let start = total.saturating_sub(count);
                let message_ids: Vec<_> = search_result
                    .iter()
                    .skip(start)
                    .map(|id| id.to_string())
                    .collect();

                if message_ids.is_empty() {
                    let _ = session.logout().await;
                    return Ok(emails);
                }

                // 批量获取邮件
                let sequence = message_ids.join(",");
                let mut messages = session
                    .fetch(&sequence, "RFC822")
                    .await
                    .map_err(|e| format!("获取邮件失败: {:?}", e))?;

                // 解析邮件（使用 Stream）
                while let Some(fetch_result) = messages.next().await {
                    match fetch_result {
                        Ok(msg) => {
                            if let Some(body) = msg.body() {
                                let body_str = String::from_utf8_lossy(body);

                                let from = extract_header(&body_str, "From:")
                                    .unwrap_or_else(|| "Unknown".to_string());

                                let subject = extract_header(&body_str, "Subject:")
                                    .unwrap_or_else(|| "No Subject".to_string());

                                let received_at = extract_header(&body_str, "Date:")
                                    .unwrap_or_else(|| chrono::Utc::now().to_rfc2822());

                                emails.push(Email {
                                    from,
                                    subject,
                                    body: body_str.to_string(),
                                    received_at,
                                });
                            }
                        }
                        Err(e) => {
                            eprintln!("获取邮件失败: {:?}", e);
                        }
                    }
                }

                // 显式 drop messages 以释放 session 的借用
                drop(messages);

                // 登出
                let _ = session.logout().await;

                Ok::<Vec<Email>, String>(emails)
            })
        })
        .await
        .map_err(|e| format!("任务执行失败: {}", e))??;

        Ok(emails)
    }

    async fn disconnect(&mut self) -> Result<(), String> {
        Ok(())
    }
}

/// 从邮件头中提取字段
fn extract_header(email_text: &str, header_name: &str) -> Option<String> {
    for line in email_text.lines() {
        if let Some(stripped) = line.strip_prefix(header_name) {
            return Some(stripped.trim().to_string());
        }
    }
    None
}

/// POP3 客户端实现（预留）
pub struct Pop3Client {
    #[allow(dead_code)]
    config: EmailConfig,
}

impl Pop3Client {
    pub fn new(config: EmailConfig) -> Self {
        Self { config }
    }
}

#[async_trait]
impl EmailClient for Pop3Client {
    async fn connect(&mut self) -> Result<(), String> {
        // TODO: 实现 POP3 连接逻辑
        Err("POP3 协议暂未实现".to_string())
    }

    async fn fetch_latest_emails(&mut self, _count: usize) -> Result<Vec<Email>, String> {
        Err("POP3 协议暂未实现".to_string())
    }

    async fn disconnect(&mut self) -> Result<(), String> {
        Ok(())
    }
}

/// 创建邮箱客户端
pub fn create_email_client(config: EmailConfig) -> Result<Box<dyn EmailClient>, String> {
    match config.protocol {
        EmailProtocol::Imap => Ok(Box::new(ImapClient::new(config))),
        EmailProtocol::Pop3 => Ok(Box::new(Pop3Client::new(config))),
    }
}

/// 生成加密密钥（基于机器唯一标识）
fn generate_encryption_key() -> [u8; 32] {
    // 使用机器 GUID 作为密钥种子
    let machine_id = std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "default-machine-id".to_string());

    // 使用 SHA-256 生成固定长度的密钥
    let mut hasher = Sha256::new();
    hasher.update(machine_id.as_bytes());
    hasher.update(b"kiro-account-manager-email-encryption");
    let result = hasher.finalize();

    let mut key = [0u8; 32];
    key.copy_from_slice(&result);
    key
}

/// 加密邮箱密码
pub fn encrypt_password(password: &str) -> Result<String, String> {
    let key = generate_encryption_key();
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| format!("创建加密器失败: {}", e))?;

    // 使用固定的 nonce（在实际应用中应该使用随机 nonce）
    let nonce = Nonce::from_slice(b"unique12byte");

    let ciphertext = cipher
        .encrypt(nonce, password.as_bytes())
        .map_err(|e| format!("加密失败: {}", e))?;

    Ok(base64::engine::general_purpose::STANDARD.encode(ciphertext))
}

/// 解密邮箱密码
pub fn decrypt_password(encrypted: &str) -> Result<String, String> {
    let key = generate_encryption_key();
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| format!("创建解密器失败: {}", e))?;

    let nonce = Nonce::from_slice(b"unique12byte");

    let ciphertext = base64::engine::general_purpose::STANDARD
        .decode(encrypted)
        .map_err(|e| format!("Base64 解码失败: {}", e))?;

    let plaintext = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|e| format!("解密失败: {}", e))?;

    String::from_utf8(plaintext).map_err(|e| format!("UTF-8 转换失败: {}", e))
}
