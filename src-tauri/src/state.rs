// 应用全局状态

use crate::account::AccountStore;
use crate::auth::AuthState;
use crate::registration::RegistrationProcess;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct PendingLogin {
    pub provider: String,
    pub code_verifier: String,
    pub state: String,
    pub machineid: String,
}

pub struct AppState {
    pub store: Mutex<AccountStore>,
    pub auth: AuthState,
    pub pending_login: Mutex<Option<PendingLogin>>,
    pub registration_process: Arc<RegistrationProcess>,
}
