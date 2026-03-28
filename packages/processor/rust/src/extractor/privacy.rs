//! Detect privacy / PII annotations in Rust projects.
//!
//! @docspec:module {
//!   id: "docspec-rust-extractor-privacy",
//!   name: "Privacy Extractor",
//!   description: "Detects PII fields via doc_pii/doc_sensitive attributes and naming heuristics (email, ssn, phone, etc.) to populate the privacy section with GDPR-relevant metadata.",
//!   since: "3.0.0"
//! }
//!
//! Looks for:
//! - `#[doc_pii(...)]` custom attributes on struct fields
//! - `#[doc_sensitive]` marker attributes
//! - Field names that conventionally hold PII (email, ssn, phone, etc.)

use serde_json::Value;
use quote::ToTokens;
use crate::scanner::FileInfo;
use super::{DocSpecExtractor, ProcessorContext};

/// Field names that conventionally contain PII.
const PII_FIELD_NAMES: &[(&str, &str)] = &[
    ("email", "email"),
    ("e_mail", "email"),
    ("phone", "phone"),
    ("phone_number", "phone"),
    ("ssn", "ssn"),
    ("social_security", "ssn"),
    ("date_of_birth", "date-of-birth"),
    ("dob", "date-of-birth"),
    ("first_name", "name"),
    ("last_name", "name"),
    ("full_name", "name"),
    ("address", "address"),
    ("street_address", "address"),
    ("zip_code", "address"),
    ("postal_code", "address"),
    ("credit_card", "financial"),
    ("card_number", "financial"),
    ("bank_account", "financial"),
    ("iban", "financial"),
    ("passport", "government-id"),
    ("passport_number", "government-id"),
    ("driver_license", "government-id"),
    ("national_id", "government-id"),
    ("ip_address", "ip-address"),
    ("ip_addr", "ip-address"),
];

/// @docspec:boundary "PII and sensitive data detection from attributes and field-name heuristics"
pub struct PrivacyExtractor;

impl DocSpecExtractor for PrivacyExtractor {
    /// @docspec:deterministic
    fn is_available(&self, _ctx: &ProcessorContext) -> bool {
        // Privacy extraction is always available; it relies on custom doc_pii / doc_sensitive
        // attributes and field-name heuristics, not external crates.
        true
    }

    /// @docspec:deterministic
    fn extractor_name(&self) -> &'static str {
        "privacy"
    }

    /// @docspec:intentional "Extract PII fields from doc_pii/doc_sensitive attributes and field-name heuristics on struct fields"
    fn extract(&self, files: &[FileInfo], ctx: &mut ProcessorContext) {
        let mut privacy_fields: Vec<Value> = Vec::new();

        for file_info in files {
            let syntax = match syn::parse_file(&file_info.source) {
                Ok(s) => s,
                Err(_) => continue,
            };

            for item in &syntax.items {
                if let syn::Item::Struct(s) = item {
                    let struct_name = s.ident.to_string();
                    let qualified = format!("{}::{}", file_info.module, struct_name);

                    for field in &s.fields {
                        if let Some(ident) = &field.ident {
                            let field_name = ident.to_string();
                            let full_field = format!("{}.{}", qualified, field_name);

                            // Check for #[doc_pii(...)]
                            if let Some(pii_info) = extract_doc_pii(&field.attrs) {
                                let mut pf = serde_json::json!({
                                    "field": full_field,
                                    "piiType": pii_info.pii_type,
                                });
                                let map = pf.as_object_mut().unwrap();
                                if let Some(retention) = &pii_info.retention {
                                    map.insert("retention".to_string(), Value::String(retention.clone()));
                                }
                                if let Some(basis) = &pii_info.gdpr_basis {
                                    map.insert("gdprBasis".to_string(), Value::String(basis.clone()));
                                }
                                if pii_info.encrypted {
                                    map.insert("encrypted".to_string(), Value::Bool(true));
                                }
                                if pii_info.never_log {
                                    map.insert("neverLog".to_string(), Value::Bool(true));
                                }
                                if pii_info.never_return {
                                    map.insert("neverReturn".to_string(), Value::Bool(true));
                                }
                                privacy_fields.push(pf);
                                continue;
                            }

                            // Check for #[doc_sensitive]
                            if has_attr(&field.attrs, "doc_sensitive") {
                                privacy_fields.push(serde_json::json!({
                                    "field": full_field,
                                    "piiType": "other",
                                    "neverLog": true,
                                }));
                                continue;
                            }

                            // Heuristic: check field name against known PII patterns
                            for (pattern, pii_type) in PII_FIELD_NAMES {
                                if field_name == *pattern || field_name.ends_with(pattern) {
                                    privacy_fields.push(serde_json::json!({
                                        "field": full_field,
                                        "piiType": pii_type,
                                        "detectedBy": "naming-heuristic",
                                    }));
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        if !privacy_fields.is_empty() {
            ctx.privacy = privacy_fields;
        }
    }
}

/// Parsed PII annotation data.
///
/// @docspec:boundary "Carries parsed PII metadata including type, retention, GDPR basis, and masking flags"
struct PiiInfo {
    pii_type: String,
    retention: Option<String>,
    gdpr_basis: Option<String>,
    encrypted: bool,
    never_log: bool,
    never_return: bool,
}

/// Extract `#[doc_pii(type = "email", retention = "30d", ...)]` from attributes.
///
/// @docspec:intentional "Parse doc_pii attribute key-value pairs into PiiInfo with type, retention, GDPR basis, and masking flags"
fn extract_doc_pii(attrs: &[syn::Attribute]) -> Option<PiiInfo> {
    for attr in attrs {
        if let Some(ident) = attr.path().get_ident() {
            if ident == "doc_pii" {
                let tokens = attr.meta.to_token_stream().to_string();
                let pii_type = extract_kv(&tokens, "type")
                    .or_else(|| extract_kv(&tokens, "value"))
                    .unwrap_or_else(|| "other".to_string());
                let retention = extract_kv(&tokens, "retention");
                let gdpr_basis = extract_kv(&tokens, "gdpr_basis")
                    .or_else(|| extract_kv(&tokens, "gdprBasis"));
                let encrypted = extract_bool_kv(&tokens, "encrypted");
                let never_log = extract_bool_kv(&tokens, "never_log")
                    || extract_bool_kv(&tokens, "neverLog");
                let never_return = extract_bool_kv(&tokens, "never_return")
                    || extract_bool_kv(&tokens, "neverReturn");

                return Some(PiiInfo {
                    pii_type,
                    retention,
                    gdpr_basis,
                    encrypted,
                    never_log,
                    never_return,
                });
            }
        }
    }
    None
}

/// Check if an attribute with the given name is present.
///
/// @docspec:deterministic
fn has_attr(attrs: &[syn::Attribute], name: &str) -> bool {
    attrs.iter().any(|a| {
        a.path().get_ident().map(|i| i == name).unwrap_or(false)
    })
}

/// Extract a key-value pair `key = "value"` from an attribute token string.
///
/// @docspec:deterministic
fn extract_kv(tokens: &str, key: &str) -> Option<String> {
    let pattern = format!("{} = \"", key);
    if let Some(pos) = tokens.find(&pattern) {
        let start = pos + pattern.len();
        let rest = &tokens[start..];
        if let Some(end) = rest.find('"') {
            let value = &rest[..end];
            if !value.is_empty() {
                return Some(value.to_string());
            }
        }
    }
    None
}

/// Extract a boolean key-value pair `key = true` from an attribute token string.
///
/// @docspec:deterministic
fn extract_bool_kv(tokens: &str, key: &str) -> bool {
    let pattern_true = format!("{} = true", key);
    tokens.contains(&pattern_true)
}
