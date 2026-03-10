// 验证码解析模块

use crate::email_client::{Email, EmailClient};
use regex::Regex;
use std::time::{Duration, Instant};

/// 从邮件内容中解析验证码
#[allow(dead_code)]
pub fn parse_verification_code(email_body: &str) -> Option<String> {
    // 正则匹配 6 位数字验证码
    let re = Regex::new(r"\b(\d{6})\b").ok()?;

    // 优先查找包含 "verification code" 或 "验证码" 的行
    for line in email_body.lines() {
        let line_lower = line.to_lowercase();
        if line_lower.contains("verification code")
            || line_lower.contains("verify code")
            || line_lower.contains("验证码")
            || line_lower.contains("code:")
        {
            if let Some(caps) = re.captures(line) {
                return Some(caps[1].to_string());
            }
        }
    }

    // 如果没找到，尝试全文匹配第一个 6 位数字
    re.captures(email_body).map(|caps| caps[1].to_string())
}

/// 验证码监听器
#[allow(dead_code)]
pub struct VerificationCodeListener {
    email_client: Box<dyn EmailClient>,
    timeout: Duration,
}

impl VerificationCodeListener {
    /// 创建新的验证码监听器
    #[allow(dead_code)]
    pub fn new(email_client: Box<dyn EmailClient>, timeout_secs: u64) -> Self {
        Self {
            email_client,
            timeout: Duration::from_secs(timeout_secs),
        }
    }

    /// 等待验证码(轮询方式)
    #[allow(dead_code)]
    pub async fn wait_for_code(&mut self) -> Result<String, String> {
        let start = Instant::now();

        loop {
            // 检查超时
            if start.elapsed() > self.timeout {
                return Err("获取验证码超时".to_string());
            }

            // 获取最新邮件
            let emails = self.email_client.fetch_latest_emails(10).await?;

            // 查找 AWS 发送的邮件
            for email in emails {
                if self.is_aws_email(&email) {
                    if let Some(code) = parse_verification_code(&email.body) {
                        return Ok(code);
                    }
                }
            }

            // 等待 5 秒后重试
            tokio::time::sleep(Duration::from_secs(5)).await;
        }
    }

    /// 判断是否为 AWS 发送的邮件
    #[allow(dead_code)]
    fn is_aws_email(&self, email: &Email) -> bool {
        let from_lower = email.from.to_lowercase();
        let subject_lower = email.subject.to_lowercase();

        // 检查发件人
        if from_lower.contains("aws")
            || from_lower.contains("amazon")
            || from_lower.contains("no-reply@")
        {
            return true;
        }

        // 检查主题
        if subject_lower.contains("verification")
            || subject_lower.contains("verify")
            || subject_lower.contains("code")
            || subject_lower.contains("builder id")
        {
            return true;
        }

        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_verification_code_with_keyword() {
        let body = "Your verification code is: 123456\nPlease enter this code to continue.";
        assert_eq!(parse_verification_code(body), Some("123456".to_string()));
    }

    #[test]
    fn test_parse_verification_code_chinese() {
        let body = "您的验证码是：654321\n请在 5 分钟内输入。";
        assert_eq!(parse_verification_code(body), Some("654321".to_string()));
    }

    #[test]
    fn test_parse_verification_code_plain() {
        let body = "Hello, your code: 999888";
        assert_eq!(parse_verification_code(body), Some("999888".to_string()));
    }

    #[test]
    fn test_parse_verification_code_not_found() {
        let body = "This is a regular email without any code.";
        assert_eq!(parse_verification_code(body), None);
    }

    #[test]
    fn test_parse_verification_code_wrong_length() {
        let body = "Your code is 12345 (only 5 digits)";
        assert_eq!(parse_verification_code(body), None);
    }
}
