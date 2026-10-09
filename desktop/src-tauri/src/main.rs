// VANTS Desktop — Tauri + Auth0 (PKCE flow nativo)
// Auth0 OAuth2 con PKCE: abre el navegador del sistema, callback en localhost:1420/callback
// Tokens guardados en store de Tauri (persistente entre sesiones)

use oauth2::{
    AuthUrl, AuthorizationCode, ClientId, ClientSecret, CsrfToken, PkceCodeChallenge,
    PkceCodeVerifier, RedirectUrl, Scope, TokenResponse, TokenUrl,
};
use oauth2::basic::BasicClient;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State};
use url::Url;

const AUTH0_DOMAIN: &str = "vants.eu.auth0.com";
const AUTH0_CLIENT_ID: &str = "oaOmNizh7HrASWfmfM29bN284IMJvqPG";
const CALLBACK_PORT: u16 = 1420;
const CALLBACK_PATH: &str = "/callback";
const NEON_DATA_API: &str = "https://ep-autumn-scene-b4opu2ip.apirest.c-6.us-east-2.aws.neon.tech/neondb/rest/v1";

// ---------- Estado global de auth ----------
#[derive(Debug, Clone, Serialize, Deserialize)]
struct AuthTokens {
    access_token: String,
    id_token: String,
    refresh_token: Option<String>,
    expires_at: i64,
}

struct AuthState {
    tokens: Mutex<Option<AuthTokens>>,
    pkce_verifier: Mutex<Option<PkceCodeVerifier>>,
    csrf_token: Mutex<Option<CsrfToken>>,
}

impl Default for AuthState {
    fn default() -> Self {
        Self {
            tokens: Mutex::new(None),
            pkce_verifier: Mutex::new(None),
            csrf_token: Mutex::new(None),
        }
    }
}

// ---------- Auth0 PKCE flow ----------
fn build_auth_url() -> (Url, PkceCodeVerifier, CsrfToken) {
    let client = BasicClient::new(
        ClientId::new(AUTH0_CLIENT_ID.to_string()),
        None::<ClientSecret>,
        AuthUrl::new(format!("https://{}/authorize", AUTH0_DOMAIN)).unwrap(),
        Some(TokenUrl::new(format!("https://{}/oauth/token", AUTH0_DOMAIN)).unwrap()),
    )
    .set_redirect_uri(RedirectUrl::new(format!("http://localhost:{}{}", CALLBACK_PORT, CALLBACK_PATH)).unwrap());

    let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();

    let (auth_url, csrf_token) = client
        .authorize_url(CsrfToken::new_random)
        .add_scope(Scope::new("openid".to_string()))
        .add_scope(Scope::new("profile".to_string()))
        .add_scope(Scope::new("email".to_string()))
        .set_pkce_challenge(pkce_challenge)
        .url();

    (auth_url, pkce_verifier, csrf_token)
}

async fn exchange_code_for_tokens(code: AuthorizationCode, verifier: PkceCodeVerifier) -> Result<AuthTokens, String> {
    let client = BasicClient::new(
        ClientId::new(AUTH0_CLIENT_ID.to_string()),
        None::<ClientSecret>,
        AuthUrl::new(format!("https://{}/authorize", AUTH0_DOMAIN)).unwrap(),
        Some(TokenUrl::new(format!("https://{}/oauth/token", AUTH0_DOMAIN)).unwrap()),
    )
    .set_redirect_uri(RedirectUrl::new(format!("http://localhost:{}{}", CALLBACK_PORT, CALLBACK_PATH)).unwrap());

    let http_client = oauth2::reqwest::async_http_client;
    let token_result = client
        .exchange_code(code)
        .set_pkce_verifier(verifier)
        .request_async(&http_client)
        .await
        .map_err(|e| format!("Token exchange failed: {}", e))?;

    let now = chrono::Utc::now().timestamp();
    Ok(AuthTokens {
        access_token: token_result.access_token().secret().to_string(),
        id_token: token_result.id_token().map(|t| t.to_string()).unwrap_or_default(),
        refresh_token: token_result.refresh_token().map(|t| t.secret().to_string()),
        expires_at: now + token_result.expires_in().map(|d| d.as_secs() as i64).unwrap_or(3600),
    })
}

// ---------- Comandos Tauri (llamados desde el frontend JS) ----------
#[tauri::command]
async fn auth0_login(app: AppHandle, state: State<'_, Arc<AuthState>>) -> Result<String, String> {
    let (auth_url, verifier, csrf) = build_auth_url();

    *state.pkce_verifier.lock().unwrap() = Some(verifier);
    *state.csrf_token.lock().unwrap() = Some(csrf.clone());

    if let Err(e) = open::that(auth_url.as_str()) {
        return Err(format!("Failed to open browser: {}", e));
    }

    let app_handle = app.clone();
    let state_clone = state.inner().clone();
    tokio::spawn(async move {
        let server = tiny_http::Server::http(format!("0.0.0.0:{}", CALLBACK_PORT)).unwrap();
        for request in server.incoming_requests() {
            if request.url().starts_with(CALLBACK_PATH) {
                let url = Url::parse(&format!("http://localhost:{}{}", CALLBACK_PORT, request.url())).unwrap();
                let code = url.query_pairs().find(|(k, _)| k == "code").map(|(_, v)| v.into_owned());

                if let Some(code) = code {
                    let verifier = state_clone.pkce_verifier.lock().unwrap().take();
                    if let Some(verifier) = verifier {
                        match exchange_code_for_tokens(AuthorizationCode::new(code), verifier).await {
                            Ok(tokens) => {
                                *state_clone.tokens.lock().unwrap() = Some(tokens.clone());
                                if let Some(store) = app_handle.store("auth.json") {
                                    let _ = store.set("tokens", serde_json::to_value(&tokens).unwrap());
                                    let _ = store.save();
                                }
                                let _ = app_handle.emit_all("auth0-logged-in", tokens.access_token.clone());
                            }
                            Err(e) => {
                                let _ = app_handle.emit_all("auth0-error", e);
                            }
                        }
                    }
                }
                break;
            }
        }
    });

    Ok(auth_url.to_string())
}

#[tauri::command]
async fn auth0_get_token(state: State<'_, Arc<AuthState>>) -> Result<Option<String>, String> {
    let tokens = state.tokens.lock().unwrap().clone();
    Ok(tokens.map(|t| t.access_token))
}

#[tauri::command]
async fn auth0_logout(app: AppHandle, state: State<'_, Arc<AuthState>>) -> Result<(), String> {
    *state.tokens.lock().unwrap() = None;
    if let Some(store) = app.store("auth.json") {
        let _ = store.clear();
        let _ = store.save();
    }
    Ok(())
}

#[tauri::command]
async fn auth0_restore_session(app: AppHandle, state: State<'_, Arc<AuthState>>) -> Result<Option<String>, String> {
    if let Some(store) = app.store("auth.json") {
        if let Some(tokens_val) = store.get("tokens") {
            if let Ok(tokens) = serde_json::from_value::<AuthTokens>(tokens_val.clone()) {
                let now = chrono::Utc::now().timestamp();
                if tokens.expires_at > now {
                    *state.tokens.lock().unwrap() = Some(tokens.clone());
                    return Ok(Some(tokens.access_token));
                }
            }
        }
    }
    Ok(None)
}

#[tauri::command]
async fn neon_query(state: State<'_, Arc<AuthState>>, table: String, select: Option<String>, filters: Option<Vec<String>>) -> Result<serde_json::Value, String> {
    let token = state.tokens.lock().unwrap().clone();
    let mut url = Url::parse(&format!("{}/{}", NEON_DATA_API, table)).unwrap();

    if let Some(sel) = select {
        url.query_pairs_mut().append_pair("select", &sel);
    }
    if let Some(f) = filters {
        for filter in f {
            let parts: Vec<&str> = filter.splitn(3, '.').collect();
            if parts.len() == 3 {
                url.query_pairs_mut().append_pair(parts[0], &format!("{}.{}", parts[1], parts[2]));
            }
        }
    }

    let client = reqwest::Client::new();
    let mut req = client.get(url);
    if let Some(t) = token {
        req = req.header("Authorization", format!("Bearer {}", t.access_token));
    }

    let res = req.send().await.map_err(|e| format!("Request failed: {}", e))?;
    if !res.status().is_success() {
        return Err(format!("API error: {}", res.status()));
    }
    let data: serde_json::Value = res.json().await.map_err(|e| format!("JSON error: {}", e))?;
    Ok(data)
}

// ---------- Punto de entrada ----------
fn main() {
    let auth_state = Arc::new(AuthState::default());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .manage(auth_state)
        .invoke_handler(tauri::generate_handler![
            auth0_login,
            auth0_get_token,
            auth0_logout,
            auth0_restore_session,
            neon_query,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
