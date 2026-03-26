//! Tier 1 DocSpec example: minimal annotations in Rust.
//!
//! Demonstrates `#[doc_module]` for grouping and `#[doc_hidden]` for excluding internals.

use docspec_macros::{doc_hidden, doc_module};

/// Service that handles user authentication and session management.
#[doc_module(id = "rust-minimal", name = "Auth Service", description = "Handles user authentication and session tokens")]
pub struct AuthService {
    session_ttl_secs: u64,
}

impl AuthService {
    /// Create a new AuthService with the given session time-to-live.
    ///
    /// # Arguments
    ///
    /// * `session_ttl_secs` - How long sessions remain valid, in seconds.
    pub fn new(session_ttl_secs: u64) -> Self {
        Self { session_ttl_secs }
    }

    /// Authenticate a user with the given credentials.
    ///
    /// Returns a session token on success, or an error message on failure.
    ///
    /// # Arguments
    ///
    /// * `username` - The user's login name.
    /// * `password` - The user's password (plaintext — hashed internally).
    pub fn login(&self, username: &str, password: &str) -> Result<SessionToken, AuthError> {
        if username.is_empty() || password.is_empty() {
            return Err(AuthError::InvalidCredentials);
        }

        let hash = self.hash_password(password);
        let token = self.generate_token(username, &hash);
        Ok(token)
    }

    /// Terminate an active session.
    ///
    /// # Arguments
    ///
    /// * `token` - The session token to invalidate.
    pub fn logout(&self, token: &SessionToken) -> Result<(), AuthError> {
        if token.value.is_empty() {
            return Err(AuthError::InvalidToken);
        }
        Ok(())
    }

    /// Validate whether a session token is still active.
    ///
    /// # Arguments
    ///
    /// * `token` - The session token to verify.
    pub fn validate_session(&self, token: &SessionToken) -> bool {
        !token.value.is_empty()
    }

    /// Refresh an existing session token, extending its TTL.
    ///
    /// # Arguments
    ///
    /// * `token` - The current session token.
    pub fn refresh_session(&self, token: &SessionToken) -> Result<SessionToken, AuthError> {
        if !self.validate_session(token) {
            return Err(AuthError::InvalidToken);
        }
        Ok(SessionToken {
            value: format!("{}_refreshed", token.value),
            ttl_secs: self.session_ttl_secs,
        })
    }

    #[doc_hidden]
    fn hash_password(&self, password: &str) -> String {
        format!("hashed_{}", password)
    }

    #[doc_hidden]
    fn generate_token(&self, username: &str, _hash: &str) -> SessionToken {
        SessionToken {
            value: format!("tok_{}_{}", username, self.session_ttl_secs),
            ttl_secs: self.session_ttl_secs,
        }
    }

    #[doc_hidden]
    fn constant_time_compare(&self, a: &[u8], b: &[u8]) -> bool {
        if a.len() != b.len() {
            return false;
        }
        a.iter().zip(b.iter()).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
    }
}

/// An active session token issued after successful authentication.
pub struct SessionToken {
    /// The opaque token value.
    pub value: String,
    /// Time-to-live in seconds.
    pub ttl_secs: u64,
}

/// Errors that can occur during authentication operations.
#[derive(Debug)]
pub enum AuthError {
    /// The provided username or password was invalid.
    InvalidCredentials,
    /// The session token is missing or expired.
    InvalidToken,
}
