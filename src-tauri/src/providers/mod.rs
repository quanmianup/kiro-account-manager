// Providers 模块 - 认证提供者
// 参考 kiro-batch-login 的结构

mod base;
mod factory;
mod idc;
mod social;
pub mod web;

pub use base::{AuthProvider, AuthResult, RefreshMetadata};
pub use factory::*;
pub use idc::IdcProvider;
pub use social::SocialProvider;
