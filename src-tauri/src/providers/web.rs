// Web OAuth Provider - Google/Github Web 登录
// 用于 Web OAuth 流程

use serde::{Deserialize, Serialize};
use super::AuthResult;

/// Web OAuth 初始化结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebOAuthInitResult {
    pub authorize_url: String,
    pub state: String,
    pub code_verifier: String,
    pub provider_id: String,
    pub idp: String,
}

/// 用户信息响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub email: Option<String>,
    pub user_id: String,
}

/// 用户配额信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserUsage {
    pub main_quota: Option<i64>,
    pub trial_quota: Option<i64>,
    pub reward_quota: Option<i64>,
    pub subscription_type: Option<String>,
}

pub struct WebOAuthProvider {
    provider_id: String,
}

impl WebOAuthProvider {
    pub fn new(provider_id: &str) -> Self {
        Self {
            provider_id: provider_id.to_string(),
        }
    }

    /// 初始化登录流程
    pub async fn initiate_login(&self) -> Result<WebOAuthInitResult, String> {
        let state = uuid::Uuid::new_v4().to_string();
        let code_verifier = generate_code_verifier();
        let code_challenge = generate_code_challenge(&code_verifier);
        
        let idp = match self.provider_id.as_str() {
            "Github" => "Github",
            "Google" => "Google",
            _ => return Err(format!("Unsupported provider: {}", self.provider_id)),
        };

        let authorize_url = format!(
            "https://app.kiro.dev/signin/oauth?provider={}&code_challenge={}&state={}",
            idp, code_challenge, state
        );

        Ok(WebOAuthInitResult {
            authorize_url,
            state,
            code_verifier,
            provider_id: self.provider_id.clone(),
            idp: idp.to_string(),
        })
    }

    /// 完成登录流程
    pub async fn complete_login(
        &self,
        code: &str,
        returned_state: &str,
        code_verifier: &str,
        expected_state: &str,
    ) -> Result<AuthResult, String> {
        if returned_state != expected_state {
            return Err("State mismatch".to_string());
        }

        let client = reqwest::Client::new();
        let response = client
            .post("https://api.kiro.dev/oauth/token")
            .json(&serde_json::json!({
                "code": code,
                "code_verifier": code_verifier,
                "grant_type": "authorization_code",
            }))
            .send()
            .await
            .map_err(|e| format!("Token exchange failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Token exchange failed: {}", error_text));
        }

        let token_data: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse token response: {}", e))?;

        let access_token = token_data["accessToken"].as_str().ok_or("No accessToken in response")?.to_string();
        let refresh_token = token_data["refreshToken"].as_str().ok_or("No refreshToken in response")?.to_string();
        let expires_in = token_data["expiresIn"].as_i64().unwrap_or(3600);
        let csrf_token = token_data["csrfToken"].as_str().map(|s| s.to_string());
        let profile_arn = token_data["profileArn"].as_str().map(|s| s.to_string());
        let expires_at = chrono::Local::now() + chrono::Duration::seconds(expires_in);

        Ok(AuthResult {
            access_token,
            refresh_token,
            expires_at: expires_at.to_rfc3339(),
            expires_in,
            provider: self.provider_id.clone(),
            auth_method: "web_oauth".to_string(),
            token_type: Some("Bearer".to_string()),
            id_token: None,
            region: None,
            client_id: None,
            client_secret: None,
            client_id_hash: None,
            sso_session_id: None,
            profile_arn,
            csrf_token,
            session_token: None,
        })
    }

    /// 刷新 token
    pub async fn refresh_token_impl(&self, _access_token: &str, _csrf_token: &str, refresh_token: &str) -> Result<AuthResult, String> {
        let client = reqwest::Client::new();
        let response = client
            .post("https://api.kiro.dev/oauth/refresh")
            .json(&serde_json::json!({"refresh_token": refresh_token, "grant_type": "refresh_token"}))
            .send()
            .await
            .map_err(|e| format!("Token refresh failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Token refresh failed: {}", error_text));
        }

        let token_data: serde_json::Value = response.json().await.map_err(|e| format!("Failed to parse refresh response: {}", e))?;
        let access_token = token_data["accessToken"].as_str().ok_or("No accessToken in response")?.to_string();
        let refresh_token = token_data["refreshToken"].as_str().ok_or("No refreshToken in response")?.to_string();
        let expires_in = token_data["expiresIn"].as_i64().unwrap_or(3600);
        let csrf_token = token_data["csrfToken"].as_str().map(|s| s.to_string());
        let profile_arn = token_data["profileArn"].as_str().map(|s| s.to_string());
        let expires_at = chrono::Local::now() + chrono::Duration::seconds(expires_in);

        Ok(AuthResult {
            access_token,
            refresh_token,
            expires_at: expires_at.to_rfc3339(),
            expires_in,
            provider: self.provider_id.clone(),
            auth_method: "web_oauth".to_string(),
            token_type: Some("Bearer".to_string()),
            id_token: None,
            region: None,
            client_id: None,
            client_secret: None,
            client_id_hash: None,
            sso_session_id: None,
            profile_arn,
            csrf_token,
            session_token: None,
        })
    }
}

pub struct KiroWebPortalClient;

impl KiroWebPortalClient {
    pub fn new() -> Self { Self }

    pub async fn get_user_info(&self, access_token: &str, _csrf_token: &str, _refresh_token: &str, _idp: &str) -> Result<UserInfo, String> {
        let client = reqwest::Client::new();
        let response = client.get("https://api.kiro.dev/user/info").bearer_auth(access_token).send().await.map_err(|e| format!("Get user info failed: {}", e))?;
        if !response.status().is_success() {
            return Err(format!("Get user info failed: {}", response.text().await.unwrap_or_default()));
        }
        let user_data: serde_json::Value = response.json().await.map_err(|e| format!("Failed to parse user info: {}", e))?;
        Ok(UserInfo {
            email: user_data["email"].as_str().map(|s| s.to_string()),
            user_id: user_data["userId"].as_str().unwrap_or("unknown").to_string(),
        })
    }

    pub async fn get_user_usage_and_limits(&self, access_token: &str, _csrf_token: &str, _refresh_token: &str, _idp: &str) -> Result<UserUsage, String> {
        let client = reqwest::Client::new();
        let response = client.get("https://api.kiro.dev/user/usage").bearer_auth(access_token).send().await.map_err(|e| format!("Get user usage failed: {}", e))?;
        if !response.status().is_success() {
            return Err(format!("Get user usage failed: {}", response.text().await.unwrap_or_default()));
        }
        let usage_data: serde_json::Value = response.json().await.map_err(|e| format!("Failed to parse usage data: {}", e))?;
        Ok(UserUsage {
            main_quota: usage_data["mainQuota"].as_i64(),
            trial_quota: usage_data["trialQuota"].as_i64(),
            reward_quota: usage_data["rewardQuota"].as_i64(),
            subscription_type: usage_data["subscriptionType"].as_str().map(|s| s.to_string()),
        })
    }
}

fn generate_code_verifier() -> String {
    use rand::Rng;
    use base64::{Engine as _, engine::general_purpose};
    let random_bytes: Vec<u8> = (0..32).map(|_| rand::thread_rng().gen()).collect();
    general_purpose::URL_SAFE_NO_PAD.encode(&random_bytes)
}

fn generate_code_challenge(verifier: &str) -> String {
    use sha2::{Sha256, Digest};
    use base64::{Engine as _, engine::general_purpose};
    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let hash = hasher.finalize();
    general_purpose::URL_SAFE_NO_PAD.encode(&hash)
}