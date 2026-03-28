//! Detect data store usage in Rust projects.
//!
//! @docspec:module {
//!   id: "docspec-rust-extractor-datastore",
//!   name: "Data Store Extractor",
//!   description: "Detects RDBMS (Diesel, SQLx, SeaORM), cache (Redis), document store (MongoDB), and message broker (Kafka, RabbitMQ, NATS) usage from derive macros, attributes, and source patterns.",
//!   since: "3.0.0"
//! }
//!
//! Looks for:
//! - Diesel ORM: `#[derive(Queryable)]`, `#[table_name]`, `diesel::table!`
//! - SQLx: `sqlx::query`, `#[sqlx(rename_all)]`, `Pool<Postgres>` / `Pool<Sqlite>`
//! - SeaORM: `#[derive(DeriveEntityModel)]`, `#[sea_orm(table_name)]`
//! - Redis: `redis` crate, `deadpool-redis`, `bb8-redis`
//! - Message brokers: `rdkafka`, `lapin` (RabbitMQ), `async-nats`

use serde_json::Value;
use quote::ToTokens;
use crate::scanner::FileInfo;
use super::{DocSpecExtractor, ProcessorContext};

/// Derive macros that indicate a database model.
const DB_DERIVES: &[&str] = &[
    "Queryable",
    "Insertable",
    "AsChangeset",
    "Identifiable",
    "Associations",
    "Selectable",
    "DeriveEntityModel",   // SeaORM
    "FromRow",             // SQLx
];

/// Attribute names that carry table name information.
const TABLE_ATTRS: &[&str] = &[
    "table_name",
    "diesel",
    "sea_orm",
    "sqlx",
];

/// @docspec:boundary "Data store detection across RDBMS, cache, document store, and message broker categories"
pub struct DataStoreExtractor;

impl DocSpecExtractor for DataStoreExtractor {
    /// @docspec:intentional "Check if any data store crate (diesel, sqlx, redis, kafka, etc.) is in Cargo.toml"
    fn is_available(&self, ctx: &ProcessorContext) -> bool {
        ctx.has_dependency("diesel")
            || ctx.has_dependency("sqlx")
            || ctx.has_dependency("sea-orm")
            || ctx.has_dependency("redis")
            || ctx.has_dependency("deadpool-redis")
            || ctx.has_dependency("rdkafka")
            || ctx.has_dependency("lapin")
            || ctx.has_dependency("async-nats")
            || ctx.has_dependency("rusqlite")
            || ctx.has_dependency("tokio-postgres")
            || ctx.has_dependency("mongodb")
    }

    /// @docspec:deterministic
    fn extractor_name(&self) -> &'static str {
        "data-store"
    }

    /// @docspec:intentional "Detect RDBMS tables, Redis, Kafka topics, RabbitMQ, NATS, and MongoDB from source patterns"
    fn extract(&self, files: &[FileInfo], ctx: &mut ProcessorContext) {
        let mut rdbms_tables: Vec<String> = Vec::new();
        let mut has_redis = false;
        let mut has_kafka = false;
        let mut kafka_topics: Vec<String> = Vec::new();
        let mut has_rabbitmq = false;
        let mut has_nats = false;
        let mut has_mongodb = false;
        let mut rdbms_type = detect_rdbms_type(ctx);

        for file_info in files {
            let syntax = match syn::parse_file(&file_info.source) {
                Ok(s) => s,
                Err(_) => continue,
            };

            for item in &syntax.items {
                match item {
                    syn::Item::Struct(s) => {
                        // Check if struct has DB model derives
                        if has_db_derive(&s.attrs) {
                            let table = extract_table_name(&s.attrs)
                                .unwrap_or_else(|| snake_case(&s.ident.to_string()));
                            if !rdbms_tables.contains(&table) {
                                rdbms_tables.push(table);
                            }
                        }
                    }
                    // Detect diesel::table! macro invocations
                    syn::Item::Macro(m) => {
                        let path_str = m.mac.path.to_token_stream().to_string();
                        if path_str.contains("table") {
                            let tokens = m.mac.tokens.to_string();
                            // First identifier in `table! { users { ... } }` is the table name
                            if let Some(name) = tokens.split_whitespace().next() {
                                let clean = name.trim_matches(|c: char| !c.is_alphanumeric() && c != '_');
                                if !clean.is_empty() && !rdbms_tables.contains(&clean.to_string()) {
                                    rdbms_tables.push(clean.to_string());
                                }
                            }
                        }
                    }
                    _ => {}
                }

                // Scan all items for Redis/Kafka/RabbitMQ/NATS/MongoDB usage
                let source = quote::quote!(#item).to_string();
                if source.contains("RedisConnection")
                    || source.contains("redis::cmd")
                    || source.contains("redis::Client")
                    || source.contains("redis::aio")
                    || source.contains("ConnectionManager")
                {
                    has_redis = true;
                }
                if source.contains("rdkafka")
                    || source.contains("StreamConsumer")
                    || source.contains("FutureProducer")
                    || source.contains("BaseProducer")
                {
                    has_kafka = true;
                    // Try to extract topic names from string literals near produce/subscribe calls
                    extract_kafka_topics(&source, &mut kafka_topics);
                }
                if source.contains("lapin") || source.contains("Channel") && source.contains("queue_declare") {
                    has_rabbitmq = true;
                }
                if source.contains("async_nats") || source.contains("nats::") {
                    has_nats = true;
                }
                if source.contains("mongodb::") || source.contains("Collection") && source.contains("Database") {
                    has_mongodb = true;
                }
            }
        }

        // Build data store entries
        if !rdbms_tables.is_empty() {
            rdbms_tables.sort();
            rdbms_tables.dedup();
            ctx.data_stores.push(serde_json::json!({
                "id": "rdbms",
                "name": rdbms_type,
                "type": "rdbms",
                "tables": rdbms_tables,
            }));
        }

        if has_redis {
            ctx.data_stores.push(serde_json::json!({
                "id": "redis",
                "name": "Redis",
                "type": "cache",
            }));
        }

        if has_kafka {
            kafka_topics.sort();
            kafka_topics.dedup();
            let mut store = serde_json::json!({
                "id": "kafka",
                "name": "Kafka",
                "type": "message-broker",
            });
            if !kafka_topics.is_empty() {
                let topics: Vec<Value> = kafka_topics.into_iter()
                    .map(|t| serde_json::json!({"name": t}))
                    .collect();
                store.as_object_mut().unwrap()
                    .insert("topics".to_string(), Value::Array(topics));
            }
            ctx.data_stores.push(store);
        }

        if has_rabbitmq {
            ctx.data_stores.push(serde_json::json!({
                "id": "rabbitmq",
                "name": "RabbitMQ",
                "type": "message-broker",
            }));
        }

        if has_nats {
            ctx.data_stores.push(serde_json::json!({
                "id": "nats",
                "name": "NATS",
                "type": "message-broker",
            }));
        }

        if has_mongodb {
            ctx.data_stores.push(serde_json::json!({
                "id": "mongodb",
                "name": "MongoDB",
                "type": "document-store",
            }));
        }
    }
}

/// Check if a struct has any database model derive macro.
///
/// @docspec:deterministic
fn has_db_derive(attrs: &[syn::Attribute]) -> bool {
    for attr in attrs {
        if attr.path().is_ident("derive") {
            let tokens = attr.meta.to_token_stream().to_string();
            for derive in DB_DERIVES {
                if tokens.contains(derive) {
                    return true;
                }
            }
        }
    }
    false
}

/// Extract a table name from `#[table_name = "users"]`, `#[diesel(table_name = users)]`,
/// or `#[sea_orm(table_name = "users")]`.
///
/// @docspec:deterministic
fn extract_table_name(attrs: &[syn::Attribute]) -> Option<String> {
    for attr in attrs {
        if let Some(ident) = attr.path().get_ident() {
            let name = ident.to_string();
            if TABLE_ATTRS.contains(&name.as_str()) {
                let tokens = attr.meta.to_token_stream().to_string();
                // Look for table_name = "..." or table_name = ident
                if let Some(pos) = tokens.find("table_name") {
                    let rest = &tokens[pos + 10..];
                    // Skip whitespace and = sign
                    let rest = rest.trim_start().trim_start_matches('=').trim_start();
                    if rest.starts_with('"') {
                        // Quoted string
                        if let Some(end) = rest[1..].find('"') {
                            return Some(rest[1..1 + end].to_string());
                        }
                    } else {
                        // Bare identifier
                        let ident_end = rest.find(|c: char| !c.is_alphanumeric() && c != '_')
                            .unwrap_or(rest.len());
                        let table = &rest[..ident_end];
                        if !table.is_empty() {
                            return Some(table.to_string());
                        }
                    }
                }
            }
        }
    }
    None
}

/// Convert CamelCase to snake_case for default table name derivation.
///
/// @docspec:deterministic
fn snake_case(s: &str) -> String {
    let mut result = String::new();
    for (i, c) in s.chars().enumerate() {
        if c.is_uppercase() && i > 0 {
            result.push('_');
        }
        result.push(c.to_lowercase().next().unwrap_or(c));
    }
    result
}

/// Detect the primary RDBMS type from Cargo.toml dependencies.
///
/// @docspec:deterministic
/// @docspec:intentional "Infers the RDBMS vendor (PostgreSQL, MySQL, SQLite) from Cargo.toml dependency names"
fn detect_rdbms_type(ctx: &ProcessorContext) -> String {
    if ctx.has_dependency("tokio-postgres") || ctx.cargo_toml.contains("Postgres") {
        "PostgreSQL".to_string()
    } else if ctx.cargo_toml.contains("Mysql") || ctx.cargo_toml.contains("mysql") {
        "MySQL".to_string()
    } else if ctx.has_dependency("rusqlite") || ctx.cargo_toml.contains("Sqlite") {
        "SQLite".to_string()
    } else {
        "Primary Database".to_string()
    }
}

/// Try to extract Kafka topic names from source text.
///
/// @docspec:intentional "Scan source text for topic/create_topic/subscribe keywords and extract quoted topic names"
fn extract_kafka_topics(source: &str, topics: &mut Vec<String>) {
    // Look for patterns like .create_topic("name", ...) or topic = "name"
    for keyword in &["topic", "create_topic", "subscribe"] {
        let mut search_from = 0;
        while let Some(pos) = source[search_from..].find(keyword) {
            let abs_pos = search_from + pos + keyword.len();
            if abs_pos < source.len() {
                let rest = &source[abs_pos..];
                // Find next quoted string
                if let Some(q_start) = rest.find('"') {
                    if let Some(q_end) = rest[q_start + 1..].find('"') {
                        let topic = &rest[q_start + 1..q_start + 1 + q_end];
                        if !topic.is_empty() && !topics.contains(&topic.to_string()) {
                            topics.push(topic.to_string());
                        }
                    }
                }
            }
            search_from = abs_pos;
        }
    }
}
