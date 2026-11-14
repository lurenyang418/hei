use anyhow::{anyhow, Result};
use reqwest::header::{HeaderMap, HeaderName, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tracing::{debug, error, info, warn};

use crate::config::NotificationConfig;

// ========== Telegram API 请求/响应结构 ==========

#[derive(Serialize)]
struct TelegramSendMessageRequest {
    chat_id: String,
    text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    parse_mode: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    disable_web_page_preview: Option<bool>,
}

#[derive(Deserialize)]
struct TelegramResponse {
    ok: bool,
    description: Option<String>,
}

#[derive(Serialize, Clone)]
struct GenericWebhookRequest {
    source: String,
    title: String,
    content: String,
    channel: String,
    event: String,
    sent_at: String,
}

const DEFAULT_SYNOLOGY_CHAT_TEMPLATE: &str = ":loudspeaker: ------{{title}}------ :loudspeaker:\n{{content}}";

// 推送通知客户端
pub struct NotificationClient {
    client: Client,
    config: NotificationConfig,
}

// 扫描结果数据结构
#[derive(Debug, Clone)]
pub struct NewVideoInfo {
    pub title: String,
    pub bvid: String,
    pub pubtime: Option<String>, // 使用字符串格式的北京时间
    pub episode_number: Option<i32>,
    pub video_id: Option<i32>, // 添加视频ID字段，用于过滤删除队列中的视频
}

#[derive(Debug, Clone)]
pub struct SourceScanResult {
    pub source_type: String,
    pub source_name: String,
    pub new_videos: Vec<NewVideoInfo>,
}

#[derive(Debug, Clone)]
pub struct ScanSummary {
    pub total_sources: usize,
    pub total_new_videos: usize,
    pub scan_duration: Duration,
    pub source_results: Vec<SourceScanResult>,
}

fn compact_pubtime_text(pubtime: &str) -> String {
    let value = pubtime.trim();
    if value.len() == 14 && value.chars().all(|ch| ch.is_ascii_digit()) {
        return value.to_string();
    }
    if let Ok(datetime) = chrono::NaiveDateTime::parse_from_str(value, "%Y-%m-%d %H:%M:%S") {
        return datetime.format("%Y%m%d%H%M%S").to_string();
    }
    value.to_string()
}

impl NotificationClient {
    pub fn new(config: NotificationConfig) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(config.notification_timeout))
            .build()
            .expect("Failed to create HTTP client");

        Self { client, config }
    }

    pub async fn send_scan_completion(&self, summary: &ScanSummary) -> Result<()> {
        if !self.config.enable_scan_notifications {
            debug!("推送通知已禁用，跳过发送");
            return Ok(());
        }

        if summary.total_new_videos < self.config.notification_min_videos {
            // 阈值没达到时明确写一行 INFO：否则用户只会看到「没有推送」，
            // 分不清是没内容可推还是推送坏了。
            info!(
                "本轮新增视频 {} 个，未达到推送阈值 {}，跳过扫描完成推送",
                summary.total_new_videos, self.config.notification_min_videos
            );
            debug!(
                "新增视频数量({})未达到推送阈值({})",
                summary.total_new_videos, self.config.notification_min_videos
            );
            return Ok(());
        }

        let active_channel = self.config.active_channel.as_str();
        if active_channel == "none" {
            warn!("推送通知已启用但未选择通知渠道");
            return Ok(());
        }

        let (title, content) = self.format_scan_message(summary);

        // 只向选中的渠道发送
        match active_channel {
            "telegram" => {
                for attempt in 1..=self.config.notification_retry_count {
                    match self.send_to_telegram(&title, &content).await {
                        Ok(_) => {
                            info!("Telegram 推送发送成功");
                            return Ok(());
                        }
                        Err(e) => {
                            warn!(
                                "Telegram 推送发送失败 (尝试 {}/{}): {}",
                                attempt, self.config.notification_retry_count, e
                            );
                            if attempt < self.config.notification_retry_count {
                                tokio::time::sleep(Duration::from_secs(2)).await;
                            }
                        }
                    }
                }
                error!("Telegram 推送发送失败，已达最大重试次数");
            }
            "webhook" => {
                let Some(webhook_url) = self.get_runtime_webhook_url("扫描完成通知") else {
                    return Ok(());
                };

                for attempt in 1..=self.config.notification_retry_count {
                    match self
                        .send_to_webhook(webhook_url, &title, &content, "scan_completion")
                        .await
                    {
                        Ok(_) => {
                            info!("Webhook推送发送成功");
                            return Ok(());
                        }
                        Err(e) => {
                            warn!(
                                "Webhook推送发送失败 (尝试 {}/{}): {}",
                                attempt, self.config.notification_retry_count, e
                            );
                            if attempt < self.config.notification_retry_count {
                                tokio::time::sleep(Duration::from_secs(2)).await;
                            }
                        }
                    }
                }
                error!("Webhook推送发送失败，已达最大重试次数");
            }
            _ => {
                warn!("未知的通知渠道: {}", active_channel);
            }
        }

        Ok(())
    }

    /// 发送 Telegram 通知
    async fn send_to_telegram(&self, title: &str, content: &str) -> Result<()> {
        let bot_token = self
            .config
            .telegram_bot_token
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| anyhow!("未配置 Telegram Bot Token"))?;
        let chat_id = self
            .config
            .telegram_chat_id
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| anyhow!("未配置 Telegram Chat ID"))?;

        let api_base = self.config.telegram_api_base.trim().trim_end_matches('/');
        let api_base = if api_base.is_empty() {
            "https://api.telegram.org"
        } else {
            api_base
        };
        let url = format!("{}/bot{}/sendMessage", api_base, bot_token);
        let request = TelegramSendMessageRequest {
            chat_id: chat_id.to_string(),
            text: format!("{}\n\n{}", title, content),
            parse_mode: None,
            disable_web_page_preview: Some(true),
        };

        let response = self.client.post(&url).json(&request).send().await?;
        let status = response.status();
        let response_text = response.text().await?;
        let telegram_response: TelegramResponse = serde_json::from_str(&response_text)
            .map_err(|e| anyhow!("解析 Telegram 响应失败: {}, 响应内容: {}", e, response_text))?;
        if telegram_response.ok {
            Ok(())
        } else {
            Err(anyhow!(
                "Telegram 返回错误 (status: {}): {}",
                status,
                telegram_response.description.unwrap_or_default()
            ))
        }
    }

    async fn send_to_webhook(&self, url: &str, title: &str, content: &str, event: &str) -> Result<()> {
        let payload = GenericWebhookRequest {
            source: "hei".to_string(),
            title: title.to_string(),
            content: content.to_string(),
            channel: self.config.active_channel.clone(),
            event: event.to_string(),
            sent_at: chrono::Local::now().to_rfc3339(),
        };

        let webhook_format = Self::resolve_webhook_format(self.config.webhook_format.as_str(), url);
        let is_open_send = webhook_format == "opensend";
        let is_synology_chat = webhook_format == "synology_chat";
        let headers = self.build_webhook_headers(is_open_send, is_synology_chat)?;
        let req = self.client.post(url).headers(headers);

        let resp = if is_open_send {
            // openSend 兼容请求体：仅发送文档要求字段，避免字段校验导致误报
            req.json(&serde_json::json!({
                "title": title,
                "content": content,
                "imageUrl": serde_json::Value::Null,
                "proxy": false
            }))
            .send()
            .await?
        } else if webhook_format == "custom" {
            let custom_body = self
                .config
                .webhook_custom_body
                .as_deref()
                .filter(|v| !v.trim().is_empty())
                .ok_or_else(|| anyhow!("未配置自定义 POST Body"))?;
            let rendered = Self::render_custom_webhook_body(custom_body, &payload)?;
            req.body(rendered).send().await?
        } else if is_synology_chat {
            // Synology Chat 的 Incoming Webhook 不是 JSON API：它要求
            // application/x-www-form-urlencoded，且 JSON 必须作为 payload 字段的值。
            // 这里先序列化内层对象，再让 reqwest 对整个表单字段做一次 URL 编码，
            // 不能把 JSON 字符串再包进一个 JSON 对象，否则群晖会静默丢弃消息。
            let synology_payload = serde_json::to_string(&serde_json::json!({
                "text": self.render_synology_chat_text(&payload),
                "username": "hei"
            }))?;
            req.form(&[("payload", synology_payload)]).send().await?
        } else {
            req.json(&payload).send().await?
        };
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();

        if status.is_success() || Self::webhook_response_indicates_success(&body) {
            if !status.is_success() {
                warn!(
                    "Webhook返回非2xx但响应体判定为成功，按成功处理: status={}, body={}",
                    status, body
                );
            }
            Ok(())
        } else {
            Err(anyhow!("Webhook返回错误 (status: {}): {}", status, body))
        }
    }

    fn is_open_send_webhook(url: &str) -> bool {
        url.to_ascii_lowercase().contains("/api/v1/message/opensend")
    }

    fn resolve_webhook_format(configured: &str, url: &str) -> &'static str {
        match configured.trim().to_ascii_lowercase().as_str() {
            "generic" => "generic",
            "opensend" => "opensend",
            "custom" => "custom",
            "synology_chat" => "synology_chat",
            _ => {
                if Self::is_open_send_webhook(url) {
                    "opensend"
                } else {
                    "generic"
                }
            }
        }
    }

    fn get_runtime_webhook_url(&self, notification_name: &str) -> Option<&str> {
        let Some(webhook_url) = self.config.webhook_url.as_deref() else {
            debug!("Webhook渠道未配置URL，跳过{}", notification_name);
            return None;
        };

        if Self::resolve_webhook_format(self.config.webhook_format.as_str(), webhook_url) == "custom"
            && self
                .config
                .webhook_custom_body
                .as_ref()
                .is_none_or(|value| value.trim().is_empty())
        {
            debug!(
                "Webhook渠道使用自定义请求 但未配置 POST Body，跳过{}",
                notification_name
            );
            return None;
        }

        Some(webhook_url)
    }

    fn build_webhook_headers(&self, is_open_send: bool, is_synology_chat: bool) -> Result<HeaderMap> {
        let mut headers = HeaderMap::new();
        let content_type = if is_synology_chat {
            HeaderValue::from_static("application/x-www-form-urlencoded")
        } else {
            HeaderValue::from_static("application/json")
        };
        headers.insert(CONTENT_TYPE, content_type.clone());

        if let Some(token) = self
            .config
            .webhook_bearer_token
            .as_ref()
            .map(|v| v.trim())
            .filter(|v| !v.is_empty())
        {
            if is_open_send {
                headers.insert("apikey", HeaderValue::from_str(token)?);
            }
            headers.insert(AUTHORIZATION, HeaderValue::from_str(&format!("Bearer {}", token))?);
        }

        if let Some(custom_headers) = self
            .config
            .webhook_custom_headers
            .as_deref()
            .map(str::trim)
            .filter(|v| !v.is_empty())
        {
            for (name, value) in Self::parse_custom_webhook_headers(custom_headers)? {
                headers.insert(name, value);
            }
        }

        // Synology Chat 只接受表单；不允许自定义 Headers 把它改回 JSON。
        if is_synology_chat {
            headers.insert(CONTENT_TYPE, content_type);
        }

        Ok(headers)
    }

    fn parse_custom_webhook_headers(raw: &str) -> Result<Vec<(HeaderName, HeaderValue)>> {
        let value: serde_json::Value =
            serde_json::from_str(raw).map_err(|e| anyhow!("自定义 Headers JSON 解析失败: {}", e))?;
        let object = value
            .as_object()
            .ok_or_else(|| anyhow!("自定义 Headers 必须是 JSON 对象，例如 {{\"Authorization\":\"Bearer xxx\"}}"))?;

        let mut headers = Vec::with_capacity(object.len());
        for (name, value) in object {
            let header_name = name.trim();
            if header_name.is_empty() {
                return Err(anyhow!("自定义 Header 名称不能为空"));
            }
            let header_value = value
                .as_str()
                .ok_or_else(|| anyhow!("自定义 Header '{}' 的值必须是字符串", header_name))?
                .trim();
            let header_name = HeaderName::from_bytes(header_name.as_bytes())
                .map_err(|e| anyhow!("自定义 Header '{}' 名称无效: {}", header_name, e))?;
            let header_value = HeaderValue::from_str(header_value)
                .map_err(|e| anyhow!("自定义 Header '{}' 的值无效: {}", header_name, e))?;
            headers.push((header_name, header_value));
        }

        Ok(headers)
    }

    pub fn validate_custom_webhook_headers(raw: &str) -> Result<()> {
        Self::parse_custom_webhook_headers(raw).map(|_| ())
    }

    fn webhook_response_indicates_success(body: &str) -> bool {
        let trimmed = body.trim();
        if trimmed.is_empty() {
            return false;
        }

        if trimmed.eq_ignore_ascii_case("ok") || trimmed.eq_ignore_ascii_case("success") {
            return true;
        }

        let json: serde_json::Value = match serde_json::from_str(trimmed) {
            Ok(v) => v,
            Err(_) => return false,
        };

        if json.get("success").and_then(|v| v.as_bool()) == Some(true)
            || json.get("ok").and_then(|v| v.as_bool()) == Some(true)
        {
            return true;
        }

        for key in ["code", "errcode", "status", "status_code", "errno"] {
            if let Some(value) = json.get(key) {
                match value {
                    serde_json::Value::Number(n) => {
                        if n.as_i64() == Some(0) || n.as_i64() == Some(200) {
                            return true;
                        }
                    }
                    serde_json::Value::String(s) => {
                        let s_trimmed = s.trim();
                        if s_trimmed == "0"
                            || s_trimmed == "200"
                            || s_trimmed.eq_ignore_ascii_case("ok")
                            || s_trimmed.eq_ignore_ascii_case("success")
                        {
                            return true;
                        }
                    }
                    _ => {}
                }
            }
        }

        if let Some(msg) = json
            .get("message")
            .and_then(|v| v.as_str())
            .or_else(|| json.get("msg").and_then(|v| v.as_str()))
            .or_else(|| json.get("errmsg").and_then(|v| v.as_str()))
        {
            let msg_lower = msg.to_ascii_lowercase();
            if msg_lower.contains("success") || msg_lower.contains("ok") || msg_lower.contains("成功") {
                return true;
            }
        }

        false
    }

    fn placeholder_scalar_text(value: &serde_json::Value) -> String {
        match value {
            serde_json::Value::String(s) => s.clone(),
            serde_json::Value::Number(n) => n.to_string(),
            serde_json::Value::Bool(b) => b.to_string(),
            serde_json::Value::Null => "null".to_string(),
            _ => serde_json::to_string(value).unwrap_or_default(),
        }
    }

    fn apply_template_placeholders(
        value: serde_json::Value,
        context: &serde_json::Map<String, serde_json::Value>,
    ) -> serde_json::Value {
        match value {
            serde_json::Value::Object(map) => serde_json::Value::Object(
                map.into_iter()
                    .map(|(key, value)| (key, Self::apply_template_placeholders(value, context)))
                    .collect(),
            ),
            serde_json::Value::Array(values) => serde_json::Value::Array(
                values
                    .into_iter()
                    .map(|value| Self::apply_template_placeholders(value, context))
                    .collect(),
            ),
            serde_json::Value::String(text) => {
                let trimmed = text.trim();
                if trimmed.starts_with("{{") && trimmed.ends_with("}}") {
                    let key = trimmed.trim_start_matches("{{").trim_end_matches("}}").trim();
                    if let Some(value) = context.get(key) {
                        return value.clone();
                    }
                }

                let mut replaced = text;
                for (key, value) in context {
                    let placeholder = format!("{{{{{}}}}}", key);
                    if replaced.contains(&placeholder) {
                        replaced = replaced.replace(&placeholder, &Self::placeholder_scalar_text(value));
                    }
                }
                serde_json::Value::String(replaced)
            }
            other => other,
        }
    }

    fn build_custom_webhook_context(payload: &GenericWebhookRequest) -> serde_json::Map<String, serde_json::Value> {
        let serde_json::Value::Object(map) = serde_json::json!({
            "source": payload.source,
            "title": payload.title,
            "content": payload.content,
            "channel": payload.channel,
            "event": payload.event,
            "sent_at": payload.sent_at
        }) else {
            unreachable!()
        };
        map
    }

    fn render_custom_webhook_body(template: &str, payload: &GenericWebhookRequest) -> Result<String> {
        let context = Self::build_custom_webhook_context(payload);
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(template) {
            let rendered = Self::apply_template_placeholders(parsed, &context);
            return serde_json::to_string(&rendered).map_err(Into::into);
        }

        Ok(Self::apply_raw_webhook_template(template, &context))
    }

    fn apply_raw_webhook_template(template: &str, context: &serde_json::Map<String, serde_json::Value>) -> String {
        let mut rendered = template.to_string();
        for (key, value) in context {
            let text = Self::placeholder_scalar_text(value);
            let json_placeholder = format!("{{{{{}_json}}}}", key);
            let form_placeholder = format!("{{{{{}_urlencoded}}}}", key);
            let placeholder = format!("{{{{{}}}}}", key);
            let json_text = serde_json::to_string(&text).unwrap_or_default();
            rendered = rendered.replace(&json_placeholder, &json_text);
            rendered = rendered.replace(&form_placeholder, &Self::form_urlencode(&text));
            rendered = rendered.replace(&placeholder, &text);
        }
        rendered
    }

    fn form_urlencode(value: &str) -> String {
        let mut encoded = String::with_capacity(value.len());
        for byte in value.bytes() {
            match byte {
                b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'*' => encoded.push(byte as char),
                b' ' => encoded.push('+'),
                _ => {
                    use std::fmt::Write;
                    let _ = write!(encoded, "%{byte:02X}");
                }
            }
        }
        encoded
    }

    fn render_synology_chat_text(&self, payload: &GenericWebhookRequest) -> String {
        let template = self
            .config
            .webhook_synology_chat_template
            .as_deref()
            .filter(|value| !value.trim().is_empty())
            .unwrap_or(DEFAULT_SYNOLOGY_CHAT_TEMPLATE);
        let mut context = Self::build_custom_webhook_context(payload);
        context.insert(
            "content".to_string(),
            serde_json::Value::String(Self::plain_text_for_synology_chat(&payload.content)),
        );

        let mut rendered = template.to_string();
        for (key, value) in context {
            let placeholder = format!("{{{{{}}}}}", key);
            rendered = rendered.replace(&placeholder, &Self::placeholder_scalar_text(&value));
        }
        rendered
    }

    fn plain_text_for_synology_chat(content: &str) -> String {
        content
            .lines()
            .map(|line| {
                let trimmed = line.trim_start();
                let plain = if let Some(item) = trimmed.strip_prefix("- ") {
                    format!("• {}", item)
                } else {
                    let heading = trimmed.trim_start_matches('#');
                    if heading.len() != trimmed.len() && heading.chars().next().is_some_and(char::is_whitespace) {
                        heading.trim_start().to_string()
                    } else {
                        line.to_string()
                    }
                };
                plain.replace("**", "").replace('`', "")
            })
            .collect::<Vec<_>>()
            .join("\n")
    }

    pub fn validate_synology_chat_template(template: &str) -> Result<()> {
        if template.trim().is_empty() {
            return Err(anyhow!("Synology Chat 消息模板不能为空"));
        }

        let sample_payload = GenericWebhookRequest {
            source: "hei".to_string(),
            title: "测试推送".to_string(),
            content: "这是一条Webhook测试推送消息。".to_string(),
            channel: "webhook".to_string(),
            event: "test_notification".to_string(),
            sent_at: chrono::Local::now().to_rfc3339(),
        };
        let config = NotificationConfig {
            webhook_synology_chat_template: Some(template.to_string()),
            ..Default::default()
        };
        let client = Self::new(config);
        let rendered = client.render_synology_chat_text(&sample_payload);
        if rendered.trim().is_empty() {
            return Err(anyhow!("Synology Chat 消息模板渲染后不能为空"));
        }
        Ok(())
    }

    pub fn validate_custom_webhook_body_template(template: &str) -> Result<()> {
        if template.trim().is_empty() {
            return Err(anyhow!("自定义 POST Body 不能为空"));
        }
        let sample_payload = GenericWebhookRequest {
            source: "hei".to_string(),
            title: "测试推送".to_string(),
            content: "这是一条Webhook测试推送消息。".to_string(),
            channel: "webhook".to_string(),
            event: "test_notification".to_string(),
            sent_at: chrono::Local::now().to_rfc3339(),
        };
        Self::render_custom_webhook_body(template, &sample_payload).map(|_| ())
    }

    fn format_scan_message(&self, summary: &ScanSummary) -> (String, String) {
        let title = "扫描完成".to_string();

        // 限制最大内容长度为30KB（留一些余量）
        const MAX_CONTENT_LENGTH: usize = 30000;

        let mut content = format!(
            "📊 **扫描摘要**\n\n- 扫描视频源: {}个\n- 新增视频: {}个\n- 扫描耗时: {:.1}分钟\n\n",
            summary.total_sources,
            summary.total_new_videos,
            summary.scan_duration.as_secs_f64() / 60.0
        );

        if summary.total_new_videos > 0 {
            content.push_str("📹 **新增视频详情**\n\n");

            let mut videos_shown = 0;
            let mut sources_shown = 0;

            for source_result in &summary.source_results {
                if !source_result.new_videos.is_empty() {
                    // 如果内容已经很长，停止添加更多内容
                    if content.len() > MAX_CONTENT_LENGTH - 500 {
                        let remaining_videos = summary.total_new_videos - videos_shown;
                        let remaining_sources = summary
                            .source_results
                            .iter()
                            .filter(|s| !s.new_videos.is_empty())
                            .count()
                            - sources_shown;
                        content.push_str(&format!(
                            "\n...还有 {} 个视频源的 {} 个新视频（内容过长已省略）\n",
                            remaining_sources, remaining_videos
                        ));
                        break;
                    }

                    sources_shown += 1;

                    let icon = match source_result.source_type.as_str() {
                        "收藏夹" => "🎬",
                        "合集" => "📁",
                        "UP主投稿" => "🎯",
                        "稍后再看" => "⏰",
                        "番剧" => "📺",
                        _ => "📄",
                    };

                    // 清理源名称中的特殊字符
                    let clean_source_name = source_result.source_name.clone();

                    content.push_str(&format!(
                        "{} **{}** - {} ({}个新视频):\n",
                        icon,
                        source_result.source_type,
                        clean_source_name,
                        source_result.new_videos.len()
                    ));

                    // 按照视频类型进行排序
                    let mut sorted_videos = source_result.new_videos.clone();
                    if source_result.source_type == "番剧" {
                        // 番剧按集数降序排列（最新的集数在前）
                        sorted_videos.sort_by_key(|video| std::cmp::Reverse(video.episode_number.unwrap_or(0)));
                    } else {
                        // 其他视频按发布时间降序排列（最新的在前）
                        sorted_videos.sort_by(|a, b| {
                            b.pubtime
                                .as_ref()
                                .unwrap_or(&String::new())
                                .cmp(a.pubtime.as_ref().unwrap_or(&String::new()))
                        });
                    }

                    // 限制每个源显示的视频数量
                    let max_videos_per_source = 20;
                    let videos_to_show = sorted_videos.len().min(max_videos_per_source);

                    for (idx, video) in sorted_videos.iter().take(videos_to_show).enumerate() {
                        // 如果内容过长，提前结束
                        if content.len() > MAX_CONTENT_LENGTH - 1000 {
                            content.push_str(&format!(
                                "...还有 {} 个视频（内容过长已省略）\n",
                                sorted_videos.len() - idx
                            ));
                            break;
                        }

                        videos_shown += 1;

                        // 清理视频标题中的特殊字符
                        let clean_title = video.title.clone();
                        let video_url = format!("https://www.bilibili.com/video/{}", video.bvid);
                        let mut video_line = format!("- [{}]({})", clean_title, video_url);

                        // 添加额外信息
                        if let (true, Some(episode_number)) =
                            (source_result.source_type == "番剧", video.episode_number)
                        {
                            video_line.push_str(&format!(" (第{}集", episode_number));
                            if let Some(pubtime) = &video.pubtime {
                                video_line.push_str(&format!(", {}", compact_pubtime_text(pubtime)));
                            }
                            video_line.push(')');
                        } else if let Some(pubtime) = &video.pubtime {
                            video_line.push_str(&format!(" ({})", compact_pubtime_text(pubtime)));
                        }

                        content.push_str(&video_line);
                        content.push('\n');
                    }

                    // 如果有未显示的视频，添加提示
                    if sorted_videos.len() > videos_to_show {
                        content.push_str(&format!("...还有 {} 个视频\n", sorted_videos.len() - videos_to_show));
                    }

                    content.push('\n');
                }
            }
        }

        // 最终清理整个内容，确保没有问题字符
        let clean_content = content.clone();

        // 确保内容不超过限制
        let final_content = if clean_content.len() > MAX_CONTENT_LENGTH {
            let mut truncated = clean_content.chars().take(MAX_CONTENT_LENGTH - 100).collect::<String>();
            truncated.push_str("\n\n...内容过长，已截断");
            truncated
        } else {
            clean_content
        };

        (title, final_content)
    }

    pub async fn test_notification(&self) -> Result<()> {
        let active_channel = self.config.active_channel.as_str();

        if active_channel == "none" {
            return Err(anyhow!("未选择通知渠道"));
        }

        match active_channel {
            "telegram" => {
                let title = "测试推送";
                let content = "这是一条 Telegram 测试推送消息。\n\n如果您收到此消息，说明 Telegram 推送配置正确。\n\n🎉 推送功能工作正常！";

                self.send_to_telegram(title, content).await?;
                info!("Telegram 测试推送发送成功");
                Ok(())
            }
            "webhook" => {
                let Some(ref webhook_url) = self.config.webhook_url else {
                    return Err(anyhow!("Webhook渠道已选择但未配置URL"));
                };
                if Self::resolve_webhook_format(self.config.webhook_format.as_str(), webhook_url) == "custom"
                    && self
                        .config
                        .webhook_custom_body
                        .as_ref()
                        .is_none_or(|value| value.trim().is_empty())
                {
                    return Err(anyhow!("Webhook渠道已选择自定义请求 但未配置 POST Body"));
                }

                let title = "测试推送";
                let content = "这是一条Webhook测试推送消息。\n\n如果您收到此消息，说明Webhook推送配置正确。\n\n🎉 推送功能工作正常！";
                self.send_to_webhook(webhook_url, title, content, "test_notification")
                    .await?;
                info!("Webhook测试推送发送成功");
                Ok(())
            }
            _ => Err(anyhow!("未知的通知渠道: {}", active_channel)),
        }
    }

    pub async fn send_custom_test(&self, message: &str) -> Result<()> {
        let active_channel = self.config.active_channel.as_str();

        if active_channel == "none" {
            return Err(anyhow!("未选择通知渠道"));
        }

        let title = "自定义测试推送";
        let content = format!("🧪 **自定义测试消息**\n\n{}", message);

        match active_channel {
            "telegram" => {
                self.send_to_telegram(title, &content).await?;
                info!("Telegram 自定义测试推送发送成功");
                Ok(())
            }
            "webhook" => {
                let Some(ref webhook_url) = self.config.webhook_url else {
                    return Err(anyhow!("Webhook渠道已选择但未配置URL"));
                };
                if Self::resolve_webhook_format(self.config.webhook_format.as_str(), webhook_url) == "custom"
                    && self
                        .config
                        .webhook_custom_body
                        .as_ref()
                        .is_none_or(|value| value.trim().is_empty())
                {
                    return Err(anyhow!("Webhook渠道已选择自定义请求 但未配置 POST Body"));
                }
                self.send_to_webhook(webhook_url, title, &content, "custom_test_notification")
                    .await?;
                info!("Webhook自定义测试推送发送成功");
                Ok(())
            }
            _ => Err(anyhow!("未知的通知渠道: {}", active_channel)),
        }
    }

    /// 发送风控验证通知
    pub async fn send_risk_control(&self, mode: &str) -> Result<()> {
        let active_channel = self.config.active_channel.as_str();

        if active_channel == "none" {
            debug!("未选择通知渠道，跳过风控通知");
            return Ok(());
        }

        let title = "风控验证提醒";
        let content = match mode {
            "manual" => "检测到B站风控验证，需要手动完成验证码。\n\n请访问管理页面 /captcha 完成验证。".to_string(),
            "auto" => "检测到B站风控验证，正在自动处理验证码...".to_string(),
            _ => format!("检测到B站风控验证（模式: {}）", mode),
        };

        match active_channel {
            "telegram" => match self.send_to_telegram(title, &content).await {
                Ok(_) => {
                    info!("风控通知推送成功 (Telegram)");
                }
                Err(e) => {
                    warn!("风控通知推送失败 (Telegram): {}", e);
                }
            },
            "webhook" => {
                let Some(webhook_url) = self.get_runtime_webhook_url("风控通知") else {
                    return Ok(());
                };
                match self.send_to_webhook(webhook_url, title, &content, "risk_control").await {
                    Ok(_) => {
                        info!("风控通知推送成功 (Webhook)");
                    }
                    Err(e) => {
                        warn!("风控通知推送失败 (Webhook): {}", e);
                    }
                }
            }
            _ => {
                warn!("未知的通知渠道: {}", active_channel);
            }
        }

        Ok(())
    }

    /// 发送单P变多P通知
    pub async fn send_single_to_multi_page(
        &self,
        video_name: &str,
        bvid: &str,
        total_pages: usize,
        old_path: Option<&str>,
    ) -> Result<()> {
        let active_channel = self.config.active_channel.as_str();

        if active_channel == "none" {
            debug!("未选择通知渠道，跳过单P变多P通知");
            return Ok(());
        }

        let title = "视频结构变更提醒";
        let path_info = old_path
            .map(|p| format!("\n\n**原文件路径**: `{}`\n\n请手动清理原单P文件。", p))
            .unwrap_or_default();

        let content = format!(
            "检测到视频从单P变为多P，已自动重置下载状态。\n\n\
            **视频**: {}\n\
            **BVID**: [{}](https://www.bilibili.com/video/{})\n\
            **新分P数**: {}{}",
            video_name, bvid, bvid, total_pages, path_info
        );

        match active_channel {
            "telegram" => match self.send_to_telegram(title, &content).await {
                Ok(_) => {
                    info!("单P变多P通知推送成功 (Telegram)");
                }
                Err(e) => {
                    warn!("单P变多P通知推送失败 (Telegram): {}", e);
                }
            },
            "webhook" => {
                let Some(webhook_url) = self.get_runtime_webhook_url("单P变多P通知") else {
                    return Ok(());
                };
                match self
                    .send_to_webhook(webhook_url, title, &content, "single_to_multi_page")
                    .await
                {
                    Ok(_) => {
                        info!("单P变多P通知推送成功 (Webhook)");
                    }
                    Err(e) => {
                        warn!("单P变多P通知推送失败 (Webhook): {}", e);
                    }
                }
            }
            _ => {
                warn!("未知的通知渠道: {}", active_channel);
            }
        }

        Ok(())
    }

    /// 发送错误通知
    pub async fn send_error(&self, error_type: &str, error_message: &str, context: Option<&str>) -> Result<()> {
        let active_channel = self.config.active_channel.as_str();

        if active_channel == "none" {
            debug!("未选择通知渠道，跳过错误通知");
            return Ok(());
        }

        let title = format!("错误提醒 - {}", error_type);
        let context_info = context.map(|c| format!("\n\n**上下文**: {}", c)).unwrap_or_default();

        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

        let content = format!(
            "程序运行时发生错误，请及时检查。\n\n\
            **错误类型**: {}\n\
            **错误信息**: {}\n\
            **发生时间**: {}{}",
            error_type, error_message, timestamp, context_info
        );

        match active_channel {
            "telegram" => match self.send_to_telegram(&title, &content).await {
                Ok(_) => {
                    info!("错误通知推送成功 (Telegram)");
                }
                Err(e) => {
                    warn!("错误通知推送失败 (Telegram): {}", e);
                }
            },
            "webhook" => {
                let Some(webhook_url) = self.get_runtime_webhook_url("错误通知") else {
                    return Ok(());
                };
                match self.send_to_webhook(webhook_url, &title, &content, "error").await {
                    Ok(_) => {
                        info!("错误通知推送成功 (Webhook)");
                    }
                    Err(e) => {
                        warn!("错误通知推送失败 (Webhook): {}", e);
                    }
                }
            }
            _ => {
                warn!("未知的通知渠道: {}", active_channel);
            }
        }

        Ok(())
    }
}

// 便捷函数
pub async fn send_scan_notification(summary: ScanSummary) -> Result<()> {
    let config = crate::config::reload_config().notification;
    let client = NotificationClient::new(config);
    client.send_scan_completion(&summary).await
}

/// 发送风控验证通知的便捷函数
pub async fn send_risk_control_notification(mode: &str) -> Result<()> {
    let config = crate::config::reload_config().notification;
    let client = NotificationClient::new(config);
    client.send_risk_control(mode).await
}

/// 发送单P变多P通知的便捷函数
pub async fn send_single_to_multi_page_notification(
    video_name: &str,
    bvid: &str,
    total_pages: usize,
    old_path: Option<&str>,
) -> Result<()> {
    let config = crate::config::reload_config().notification;
    let client = NotificationClient::new(config);
    client
        .send_single_to_multi_page(video_name, bvid, total_pages, old_path)
        .await
}

/// 发送错误通知的便捷函数
pub async fn send_error_notification(error_type: &str, error_message: &str, context: Option<&str>) -> Result<()> {
    let config = crate::config::reload_config().notification;
    let client = NotificationClient::new(config);
    client.send_error(error_type, error_message, context).await
}

/// 发送 DeepSeek Token 过期通知的便捷函数
pub async fn send_deepseek_token_expired_notification() -> Result<()> {
    let config = crate::config::reload_config().notification;
    let client = NotificationClient::new(config);
    client.send_error(
        "DeepSeek Token 过期",
        "DeepSeek Web Token 已过期或无效，AI 重命名功能将暂停工作。",
        Some("请在设置页面重新配置 Token。获取方法：浏览器打开 chat.deepseek.com 登录后，F12 开发者工具 → Network → 找到任意请求的 Authorization 头 → 复制 Bearer 后面的值"),
    ).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::extract::{Form, State};
    use axum::http::HeaderMap as AxumHeaderMap;
    use axum::response::IntoResponse;
    use axum::routing::post;
    use axum::Json;
    use axum::Router;
    use serde_json::json;
    use std::collections::HashMap;
    use std::sync::Arc;
    use tokio::net::TcpListener;
    use tokio::sync::Mutex;

    #[test]
    fn test_notification_config_validation() {
        let mut config = NotificationConfig {
            enable_scan_notifications: true,
            ..Default::default()
        };

        // 未配置任何渠道应该失败
        assert!(config.validate().is_err());

        // 配置 Telegram 后应该通过
        config.telegram_bot_token = Some("token".to_string());
        config.telegram_chat_id = Some("chat".to_string());
        config.active_channel = "telegram".to_string();
        assert!(config.validate().is_ok());

        // API 地址格式错误应该失败
        config.telegram_api_base = "api.telegram.org".to_string();
        assert!(config.validate().is_err());

        config.telegram_api_base = "https://api.telegram.org".to_string();
        assert!(config.validate().is_ok());

        // Webhook 缺少 URL 应该失败
        config.active_channel = "webhook".to_string();
        assert!(config.validate().is_err());
    }

    #[derive(Debug, Clone)]
    struct CapturedTelegramRequest {
        path: String,
        body: serde_json::Value,
    }

    async fn capture_telegram_request(
        State(captured): State<Arc<Mutex<Option<CapturedTelegramRequest>>>>,
        uri: axum::http::Uri,
        Json(body): Json<serde_json::Value>,
    ) -> impl IntoResponse {
        *captured.lock().await = Some(CapturedTelegramRequest {
            path: uri.path().to_string(),
            body,
        });
        Json(json!({ "ok": true }))
    }

    #[tokio::test]
    async fn test_send_to_telegram_posts_expected_payload() -> Result<()> {
        let captured = Arc::new(Mutex::new(None));
        let app = Router::new()
            .route("/bottest-token/sendMessage", post(capture_telegram_request))
            .with_state(captured.clone());
        let listener = TcpListener::bind("127.0.0.1:0").await?;
        let addr = listener.local_addr()?;
        tokio::spawn(async move {
            let _ = axum::serve(listener, app).await;
        });

        let config = NotificationConfig {
            active_channel: "telegram".to_string(),
            telegram_bot_token: Some("test-token".to_string()),
            telegram_chat_id: Some("123456".to_string()),
            telegram_api_base: format!("http://{addr}"),
            ..Default::default()
        };
        let client = NotificationClient::new(config);
        client.send_to_telegram("标题", "正文").await?;

        let captured = captured.lock().await.clone().expect("应捕获 Telegram 请求");
        assert_eq!(captured.path, "/bottest-token/sendMessage");
        assert_eq!(captured.body["chat_id"], "123456");
        assert_eq!(captured.body["text"], "标题\n\n正文");
        Ok(())
    }

    #[test]
    fn test_validate_custom_webhook_headers() {
        assert!(NotificationClient::validate_custom_webhook_headers(
            r#"{"Authorization":"Bearer test","X-Channel":"clawbot"}"#
        )
        .is_ok());

        assert!(NotificationClient::validate_custom_webhook_headers(r#"[]"#).is_err());
        assert!(NotificationClient::validate_custom_webhook_headers(r#"{"Authorization":123}"#).is_err());
        assert!(NotificationClient::validate_custom_webhook_headers(r#"{"Bad Header":"value"}"#).is_err());
    }

    #[test]
    fn test_custom_webhook_body_allows_raw_templates() {
        let payload = GenericWebhookRequest {
            source: "hei".to_string(),
            title: "测试标题".to_string(),
            content: "测试正文".to_string(),
            channel: "webhook".to_string(),
            event: "test_notification".to_string(),
            sent_at: "2026-07-28T00:00:00+08:00".to_string(),
        };

        assert!(
            NotificationClient::validate_custom_webhook_body_template("payload={{title}}&message={{content}}").is_ok()
        );
        assert_eq!(
            NotificationClient::render_custom_webhook_body(
                "payload={{title_urlencoded}}&message={{content_urlencoded}}&json={{content_json}}",
                &payload,
            )
            .expect("raw template should render"),
            "payload=%E6%B5%8B%E8%AF%95%E6%A0%87%E9%A2%98&message=%E6%B5%8B%E8%AF%95%E6%AD%A3%E6%96%87&json=\"测试正文\""
        );
    }

    #[test]
    fn test_synology_chat_default_template_uses_plain_text() {
        let client = NotificationClient::new(NotificationConfig::default());
        let payload = GenericWebhookRequest {
            source: "hei".to_string(),
            title: "扫描完成".to_string(),
            content: "📊 **扫描摘要**\n- 新增视频: 1个".to_string(),
            channel: "webhook".to_string(),
            event: "scan_completion".to_string(),
            sent_at: "2026-07-28T00:00:00+08:00".to_string(),
        };

        assert_eq!(
            client.render_synology_chat_text(&payload),
            ":loudspeaker: ------扫描完成------ :loudspeaker:\n📊 扫描摘要\n• 新增视频: 1个"
        );
    }

    #[derive(Debug, Clone)]
    struct CapturedWebhookRequest {
        authorization: Option<String>,
        apikey: Option<String>,
        x_channel: Option<String>,
        content_type: Option<String>,
        body: serde_json::Value,
    }

    async fn capture_webhook_request(
        State(captured): State<Arc<Mutex<Option<CapturedWebhookRequest>>>>,
        headers: AxumHeaderMap,
        Json(body): Json<serde_json::Value>,
    ) -> impl IntoResponse {
        let request = CapturedWebhookRequest {
            authorization: headers
                .get(AUTHORIZATION)
                .and_then(|value| value.to_str().ok())
                .map(ToString::to_string),
            apikey: headers
                .get("apikey")
                .and_then(|value| value.to_str().ok())
                .map(ToString::to_string),
            x_channel: headers
                .get("x-channel")
                .and_then(|value| value.to_str().ok())
                .map(ToString::to_string),
            content_type: headers
                .get(CONTENT_TYPE)
                .and_then(|value| value.to_str().ok())
                .map(ToString::to_string),
            body,
        };
        *captured.lock().await = Some(request);
        Json(json!({ "success": true }))
    }

    async fn spawn_capture_server(route_path: &str) -> Result<(String, Arc<Mutex<Option<CapturedWebhookRequest>>>)> {
        let captured = Arc::new(Mutex::new(None));
        let app = Router::new()
            .route(route_path, post(capture_webhook_request))
            .with_state(captured.clone());

        let listener = TcpListener::bind("127.0.0.1:0").await?;
        let addr = listener.local_addr()?;
        tokio::spawn(async move {
            let _ = axum::serve(listener, app).await;
        });

        Ok((format!("http://{}{}", addr, route_path), captured))
    }

    #[derive(Debug, Clone)]
    struct CapturedSynologyChatRequest {
        content_type: Option<String>,
        payload: Option<String>,
    }

    async fn capture_synology_chat_request(
        State(captured): State<Arc<Mutex<Option<CapturedSynologyChatRequest>>>>,
        headers: AxumHeaderMap,
        Form(form): Form<HashMap<String, String>>,
    ) -> impl IntoResponse {
        *captured.lock().await = Some(CapturedSynologyChatRequest {
            content_type: headers
                .get(CONTENT_TYPE)
                .and_then(|value| value.to_str().ok())
                .map(ToString::to_string),
            payload: form.get("payload").cloned(),
        });
        Json(json!({ "success": true }))
    }

    async fn spawn_synology_chat_capture_server(
        route_path: &str,
    ) -> Result<(String, Arc<Mutex<Option<CapturedSynologyChatRequest>>>)> {
        let captured = Arc::new(Mutex::new(None));
        let app = Router::new()
            .route(route_path, post(capture_synology_chat_request))
            .with_state(captured.clone());

        let listener = TcpListener::bind("127.0.0.1:0").await?;
        let addr = listener.local_addr()?;
        tokio::spawn(async move {
            let _ = axum::serve(listener, app).await;
        });

        Ok((format!("http://{}{}", addr, route_path), captured))
    }

    #[tokio::test(flavor = "current_thread")]
    async fn test_send_to_webhook_sends_custom_headers() {
        let (url, captured) = spawn_capture_server("/notify").await.expect("start capture server");

        let mut config = NotificationConfig {
            active_channel: "webhook".to_string(),
            ..Default::default()
        };
        config.webhook_url = Some(url);
        config.webhook_custom_headers =
            Some(r#"{"Authorization":"Bearer custom-token","X-Channel":"clawbot"}"#.to_string());

        let client = NotificationClient::new(config);
        client
            .send_to_webhook(
                client.config.webhook_url.as_deref().unwrap(),
                "测试标题",
                "测试正文",
                "test_notification",
            )
            .await
            .expect("send webhook");

        let request = captured.lock().await.clone().expect("captured webhook request");

        assert_eq!(request.authorization.as_deref(), Some("Bearer custom-token"));
        assert_eq!(request.x_channel.as_deref(), Some("clawbot"));
        assert_eq!(request.apikey, None);
        assert_eq!(request.content_type.as_deref(), Some("application/json"));
        assert_eq!(request.body.get("title").and_then(|v| v.as_str()), Some("测试标题"));
        assert_eq!(request.body.get("content").and_then(|v| v.as_str()), Some("测试正文"));
        assert_eq!(
            request.body.get("event").and_then(|v| v.as_str()),
            Some("test_notification")
        );
    }

    #[tokio::test(flavor = "current_thread")]
    async fn test_custom_headers_override_default_bearer_and_opensend_apikey() {
        let (url, captured) = spawn_capture_server("/api/v1/message/opensend")
            .await
            .expect("start capture server");

        let mut config = NotificationConfig {
            active_channel: "webhook".to_string(),
            ..Default::default()
        };
        config.webhook_url = Some(url);
        config.webhook_bearer_token = Some("default-token".to_string());
        config.webhook_custom_headers =
            Some(r#"{"Authorization":"Bearer override-token","apikey":"override-key"}"#.to_string());

        let client = NotificationClient::new(config);
        client
            .send_to_webhook(
                client.config.webhook_url.as_deref().unwrap(),
                "openSend标题",
                "openSend正文",
                "test_notification",
            )
            .await
            .expect("send opensend webhook");

        let request = captured
            .lock()
            .await
            .clone()
            .expect("captured opensend webhook request");

        assert_eq!(request.authorization.as_deref(), Some("Bearer override-token"));
        assert_eq!(request.apikey.as_deref(), Some("override-key"));
        assert_eq!(request.body.get("title").and_then(|v| v.as_str()), Some("openSend标题"));
        assert_eq!(
            request.body.get("content").and_then(|v| v.as_str()),
            Some("openSend正文")
        );
        assert_eq!(request.body.get("proxy").and_then(|v| v.as_bool()), Some(false));
        assert!(request.body.get("imageUrl").is_some());
    }

    #[tokio::test(flavor = "current_thread")]
    async fn test_send_to_synology_chat_uses_form_payload() {
        let (url, captured) = spawn_synology_chat_capture_server("/webhook")
            .await
            .expect("start Synology Chat capture server");

        let mut config = NotificationConfig {
            active_channel: "webhook".to_string(),
            ..Default::default()
        };
        config.webhook_url = Some(url);
        config.webhook_format = "synology_chat".to_string();
        config.webhook_custom_headers = Some(r#"{"Content-Type":"application/json"}"#.to_string());
        config.webhook_synology_chat_template =
            Some(":loudspeaker: {{title}}\n:mailbox_closed: {{content}}\n{{event}}".to_string());

        let client = NotificationClient::new(config);
        client
            .send_to_webhook(
                client.config.webhook_url.as_deref().unwrap(),
                "群晖标题",
                "**群晖正文**\n- 第二项",
                "test_notification",
            )
            .await
            .expect("send Synology Chat webhook");

        let request = captured
            .lock()
            .await
            .clone()
            .expect("captured Synology Chat webhook request");
        assert_eq!(
            request.content_type.as_deref(),
            Some("application/x-www-form-urlencoded")
        );

        let payload: serde_json::Value =
            serde_json::from_str(request.payload.as_deref().expect("form must contain payload"))
                .expect("payload must be a JSON object, not an escaped JSON string");
        assert_eq!(payload.get("username").and_then(|value| value.as_str()), Some("hei"));
        assert_eq!(
            payload.get("text").and_then(|value| value.as_str()),
            Some(":loudspeaker: 群晖标题\n:mailbox_closed: 群晖正文\n• 第二项\ntest_notification")
        );
    }

    #[tokio::test(flavor = "current_thread")]
    async fn test_send_error_skips_webhook_when_custom_body_missing() {
        let (url, captured) = spawn_capture_server("/notify").await.expect("start capture server");

        let mut config = NotificationConfig {
            active_channel: "webhook".to_string(),
            ..Default::default()
        };
        config.webhook_url = Some(url);
        config.webhook_format = "custom".to_string();

        let client = NotificationClient::new(config);
        client
            .send_error("测试错误", "测试内容", Some("这是一条运行时错误通知"))
            .await
            .expect("skip incomplete webhook config");

        assert!(
            captured.lock().await.is_none(),
            "incomplete custom webhook should not send any request"
        );
    }

    #[tokio::test(flavor = "current_thread")]
    async fn test_test_notification_errors_when_custom_body_missing() {
        let mut config = NotificationConfig {
            active_channel: "webhook".to_string(),
            ..Default::default()
        };
        config.webhook_url = Some("http://127.0.0.1:65535/notify".to_string());
        config.webhook_format = "custom".to_string();

        let client = NotificationClient::new(config);
        let err = client
            .test_notification()
            .await
            .expect_err("test notification should reject incomplete custom webhook config");

        assert!(err.to_string().contains("未配置 POST Body"));
    }
}
