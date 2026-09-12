export interface AgentSkill {
  id: string;
  name: string;
  functionName: string;
  description: string;
  category: "productivity" | "search" | "devops" | "data" | "communications" | "iot" | "custom";
  risk: "LOW" | "MEDIUM" | "HIGH";
  source: "skills.sh" | "native" | "custom";
  sourceUrl?: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  sampleCode?: string;
}

export const SKILLS_SH_CATALOG: AgentSkill[] = [
  // ─────────────────────────────────────────────────────────────
  // 1. PRODUCTIVITY & APPS
  // ─────────────────────────────────────────────────────────────
  {
    id: "gmail_read_inbox",
    name: "Gmail Inbox Reader",
    functionName: "read_emails()",
    description: "Connect to Gmail via OAuth/App Passwords to fetch, parse, and filter unread messages by importance.",
    category: "productivity",
    risk: "LOW",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/gmail-reader",
    parameters: [
      { name: "query", type: "string", required: false, description: "Search query e.g. 'is:unread label:urgent'" },
      { name: "maxResults", type: "number", required: false, description: "Maximum messages to inspect (default 10)" },
    ],
  },
  {
    id: "gmail_send_digest",
    name: "Email Digest Dispatcher",
    functionName: "send_email_digest()",
    description: "Format high-priority emails into an executive Markdown digest and dispatch to recipient.",
    category: "productivity",
    risk: "MEDIUM",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/email-digest",
    parameters: [
      { name: "recipient", type: "string", required: true, description: "Destination email address" },
      { name: "summaryMarkdown", type: "string", required: true, description: "Digest contents" },
    ],
  },
  {
    id: "google_calendar_events",
    name: "Calendar Agenda Inspector",
    functionName: "read_calendar()",
    description: "Query Google Calendar for upcoming meetings, conflicts, and scheduling opportunities.",
    category: "productivity",
    risk: "LOW",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/google-calendar",
    parameters: [
      { name: "timeMin", type: "string", required: false, description: "Start time filter (ISO string)" },
      { name: "timeMax", type: "string", required: false, description: "End time filter (ISO string)" },
    ],
  },
  {
    id: "slack_post_message",
    name: "Slack Channel Dispatcher",
    functionName: "post_slack_message()",
    description: "Dispatch rich alert cards, thread replies, and interactive blocks to targeted Slack channels.",
    category: "productivity",
    risk: "MEDIUM",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/slack-dispatcher",
    parameters: [
      { name: "channel", type: "string", required: true, description: "Slack channel ID or #name" },
      { name: "message", type: "string", required: true, description: "Formatted markdown text or BlockKit payload" },
    ],
  },
  {
    id: "notion_update_page",
    name: "Notion Workspace Sync",
    functionName: "update_notion_page()",
    description: "Append structured research notes, action items, or database records into designated Notion pages.",
    category: "productivity",
    risk: "LOW",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/notion-sync",
    parameters: [
      { name: "pageId", type: "string", required: true, description: "Notion Target Page or Database ID" },
      { name: "content", type: "string", required: true, description: "Markdown text or properties to append" },
    ],
  },
  {
    id: "jira_create_issue",
    name: "Jira Issue & Incident Creator",
    functionName: "create_jira_issue()",
    description: "Create, assign, or escalate engineering incident tickets and bug reports on Jira Cloud.",
    category: "productivity",
    risk: "MEDIUM",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/jira-issues",
    parameters: [
      { name: "projectKey", type: "string", required: true, description: "Jira Project Key e.g. 'OPS' or 'ENG'" },
      { name: "summary", type: "string", required: true, description: "Issue headline summary" },
      { name: "priority", type: "string", required: false, description: "Critical | High | Medium | Low" },
    ],
  },
  {
    id: "google_drive_export",
    name: "Google Drive File Sync",
    functionName: "export_to_drive()",
    description: "Upload synthesized reports, raw datasets, or markdown summaries to Google Drive.",
    category: "productivity",
    risk: "LOW",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/google-drive",
    parameters: [
      { name: "folderId", type: "string", required: true, description: "Google Drive parent folder ID" },
      { name: "fileName", type: "string", required: true, description: "Name of the file to save" },
      { name: "fileContent", type: "string", required: true, description: "Content body to write" },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 2. SEARCH & WEB INTELLIGENCE
  // ─────────────────────────────────────────────────────────────
  {
    id: "web_search",
    name: "Web Search & Extraction",
    functionName: "web_search()",
    description: "Search live web documents, scrape clean markdown, and cross-reference factual claims.",
    category: "search",
    risk: "LOW",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/web-search",
    parameters: [
      { name: "query", type: "string", required: true, description: "Search query string" },
      { name: "domains", type: "array", required: false, description: "Optional whitelist of trusted domains" },
    ],
  },
  {
    id: "pdf_doc_reader",
    name: "Document & PDF Parser",
    functionName: "parse_document()",
    description: "Extract text, tables, and metadata from PDF files, research papers, and spreadsheets.",
    category: "search",
    risk: "LOW",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/pdf-reader",
    parameters: [
      { name: "fileUrl", type: "string", required: true, description: "URL or local path to document" },
    ],
  },
  {
    id: "serp_news_monitor",
    name: "Live News & SERP Feed",
    functionName: "fetch_live_news()",
    description: "Stream breaking domain news, geopolitical updates, and industry press releases via SERP / RSS.",
    category: "search",
    risk: "LOW",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/live-news",
    parameters: [
      { name: "topic", type: "string", required: true, description: "Industry or topic keyword e.g. 'cold chain logistics'" },
      { name: "timeframe", type: "string", required: false, description: "Past 24h, past week, or latest" },
    ],
  },
  {
    id: "github_code_search",
    name: "GitHub Codebase Explorer",
    functionName: "search_github_code()",
    description: "Search public or private repositories, inspect source files, commit histories, and AST diffs.",
    category: "search",
    risk: "LOW",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/github-search",
    parameters: [
      { name: "query", type: "string", required: true, description: "Search pattern, symbol, or filename" },
      { name: "repo", type: "string", required: false, description: "Optional scoped repository 'org/repo'" },
    ],
  },
  {
    id: "web_scraper_dynamic",
    name: "Dynamic Browser Scraper",
    functionName: "scrape_dynamic_webpage()",
    description: "Headless browser DOM extraction for JavaScript-rendered SPAs, extracting selectors and clean text.",
    category: "search",
    risk: "LOW",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/browser-scraper",
    parameters: [
      { name: "url", type: "string", required: true, description: "Webpage URL to inspect" },
      { name: "selector", type: "string", required: false, description: "CSS selector to target" },
    ],
  },
  {
    id: "weather_forecast",
    name: "Weather & Forecast Lookup",
    functionName: "get_weather_forecast()",
    description: "Query real-time weather conditions, forecasts, precipitation, temperature, and storm alerts for any city or location.",
    category: "search",
    risk: "LOW",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/weather-forecast",
    parameters: [
      { name: "location", type: "string", required: true, description: "City name, zip code, or latitude/longitude coordinates" },
      { name: "days", type: "number", required: false, description: "Forecast days (default 1, up to 7)" },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 3. COMMUNICATIONS & ALERTING
  // ─────────────────────────────────────────────────────────────
  {
    id: "whatsapp_send_message",
    name: "WhatsApp Direct Dispatcher",
    functionName: "send_whatsapp_message()",
    description: "Dispatch direct WhatsApp messages, alerts, and markdown updates to mobile numbers via WhatsApp API.",
    category: "communications",
    risk: "MEDIUM",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/whatsapp-dispatcher",
    parameters: [
      { name: "recipient", type: "string", required: true, description: "Phone number with country code e.g. '+1234567890'" },
      { name: "message", type: "string", required: true, description: "Text or markdown message body" },
    ],
  },
  {
    id: "telegram_send_message",
    name: "Telegram Bot Dispatcher",
    functionName: "send_telegram_message()",
    description: "Deliver instant notifications, summaries, and formatted markdown alerts to Telegram chats or channels via Bot API.",
    category: "communications",
    risk: "MEDIUM",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/telegram-dispatcher",
    parameters: [
      { name: "chatId", type: "string", required: true, description: "Telegram chat ID or @channelusername" },
      { name: "message", type: "string", required: true, description: "Markdown formatted alert text" },
    ],
  },
  {
    id: "discord_send_message",
    name: "Discord Webhook Dispatcher",
    functionName: "send_discord_message()",
    description: "Send rich embed messages, summaries, and notifications to Discord channels via webhook.",
    category: "communications",
    risk: "MEDIUM",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/discord-dispatcher",
    parameters: [
      { name: "channel", type: "string", required: false, description: "Target channel name or webhook" },
      { name: "message", type: "string", required: true, description: "Message content or embed payload" },
    ],
  },
  {
    id: "send_notification",
    name: "Multi-Channel Broadcast",
    functionName: "send_notification()",
    description: "Dispatch urgent alerts across WhatsApp, Telegram, or Discord webhook channels.",
    category: "communications",
    risk: "MEDIUM",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/notification-broadcast",
    parameters: [
      { name: "channel", type: "string", required: true, description: "Target channel (whatsapp | telegram | discord)" },
      { name: "message", type: "string", required: true, description: "Notification payload" },
      { name: "priority", type: "string", required: false, description: "high | normal | low" },
    ],
  },
  {
    id: "twilio_sms_voice",
    name: "Twilio SMS & Voice Escalation",
    functionName: "dispatch_urgent_call()",
    description: "Trigger outbound phone calls or SMS text messages for Tier-1 critical emergency breaches.",
    category: "communications",
    risk: "HIGH",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/twilio-alerts",
    parameters: [
      { name: "phoneNumber", type: "string", required: true, description: "Recipient mobile phone number (E.164)" },
      { name: "message", type: "string", required: true, description: "Voice synthesis text or SMS body" },
    ],
  },
  {
    id: "pagerduty_trigger_incident",
    name: "PagerDuty Incident Escalation",
    functionName: "trigger_pagerduty()",
    description: "Escalate critical hardware or medical cold-chain temperature breaches directly to on-call duty engineers.",
    category: "communications",
    risk: "HIGH",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/pagerduty",
    parameters: [
      { name: "summary", type: "string", required: true, description: "Incident description" },
      { name: "severity", type: "string", required: true, description: "critical | error | warning | info" },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 4. DATA, ANALYTICS & MEMORY
  // ─────────────────────────────────────────────────────────────
  {
    id: "query_memory",
    name: "Episodic Memory Query",
    functionName: "query_memory()",
    description: "Retrieve past experiences, incident outcomes, and approved behavioral policies.",
    category: "data",
    risk: "LOW",
    source: "native",
    parameters: [
      { name: "query", type: "string", required: true, description: "Situation to match against memory" },
      { name: "category", type: "string", required: false, description: "Filter category" },
    ],
  },
  {
    id: "database_query",
    name: "Database Query Engine",
    functionName: "database_query()",
    description: "Read-only SQL inspection of system tables, audit trails, and application records.",
    category: "data",
    risk: "LOW",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/sql-query",
    parameters: [
      { name: "table", type: "string", required: true, description: "Target database table" },
      { name: "limit", type: "number", required: false, description: "Row limit (default 20)" },
    ],
  },
  {
    id: "vector_semantic_search",
    name: "Vector Semantic Embeddings",
    functionName: "query_vector_db()",
    description: "Execute cosine similarity search across pgvector, Pinecone, or Chroma vector embeddings.",
    category: "data",
    risk: "LOW",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/vector-search",
    parameters: [
      { name: "prompt", type: "string", required: true, description: "Input sentence or query to vectorize" },
      { name: "topK", type: "number", required: false, description: "Number of nearest neighbors to return" },
    ],
  },
  {
    id: "csv_tabular_analyzer",
    name: "CSV & Tabular Data Analyzer",
    functionName: "analyze_tabular_data()",
    description: "Perform automated statistical summaries, outlier anomaly detection, and pivot metrics on CSV data.",
    category: "data",
    risk: "LOW",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/csv-analyzer",
    parameters: [
      { name: "csvData", type: "string", required: true, description: "Raw CSV string or cloud file URL" },
      { name: "analysisType", type: "string", required: false, description: "summary | outliers | correlation" },
    ],
  },
  {
    id: "stripe_payment_check",
    name: "Stripe Billing & Invoices",
    functionName: "query_stripe_charges()",
    description: "Inspect customer transaction histories, dispute flags, and invoice statuses via Stripe API.",
    category: "data",
    risk: "LOW",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/stripe-billing",
    parameters: [
      { name: "customerId", type: "string", required: true, description: "Stripe customer ID (cus_...)" },
      { name: "limit", type: "number", required: false, description: "Number of recent invoices" },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 5. DEVOPS & CLOUD INFRASTRUCTURE
  // ─────────────────────────────────────────────────────────────
  {
    id: "github_issue_monitor",
    name: "GitHub Issues & PR Watcher",
    functionName: "github_monitor()",
    description: "Fetch new GitHub issues, review pull request diffs, and check CI workflow statuses.",
    category: "devops",
    risk: "LOW",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/github",
    parameters: [
      { name: "repo", type: "string", required: true, description: "Owner/Repo format e.g. 'org/repo'" },
      { name: "event", type: "string", required: false, description: "issues | pulls | runs" },
    ],
  },
  {
    id: "docker_container_ops",
    name: "Docker Container Inspector",
    functionName: "inspect_docker_containers()",
    description: "Query Docker daemon for container health, inspect logs, and safely restart halted worker services.",
    category: "devops",
    risk: "MEDIUM",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/docker-ops",
    parameters: [
      { name: "containerName", type: "string", required: true, description: "Target container name or ID" },
      { name: "action", type: "string", required: false, description: "status | logs | restart" },
    ],
  },
  {
    id: "aws_cloudwatch_query",
    name: "AWS CloudWatch Metrics",
    functionName: "query_cloudwatch_metrics()",
    description: "Pull AWS Lambda, RDS, and EC2 latency, CPU utilization, and error telemetry.",
    category: "devops",
    risk: "LOW",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/aws-cloudwatch",
    parameters: [
      { name: "namespace", type: "string", required: true, description: "AWS namespace e.g. 'AWS/Lambda'" },
      { name: "metricName", type: "string", required: true, description: "Metric e.g. 'Duration' or 'Errors'" },
    ],
  },
  {
    id: "ssh_remote_diagnostics",
    name: "SSH Remote Diagnostics",
    functionName: "run_ssh_diagnostics()",
    description: "Securely execute read-only diagnostic commands on remote Linux servers over SSH.",
    category: "devops",
    risk: "MEDIUM",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/ssh-diagnostics",
    parameters: [
      { name: "host", type: "string", required: true, description: "Remote hostname or IP address" },
      { name: "command", type: "string", required: true, description: "Read-only command (e.g. 'df -h', 'uptime')" },
    ],
  },
  {
    id: "ssl_cert_domain_health",
    name: "SSL Certificate & DNS Health",
    functionName: "check_ssl_and_dns()",
    description: "Inspect domain DNS records, SSL/TLS certificate expiry, and HTTP latency.",
    category: "devops",
    risk: "LOW",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/dns-ssl-health",
    parameters: [
      { name: "domain", type: "string", required: true, description: "Target domain name e.g. 'example.com'" },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 6. HARDWARE & EDGE IOT
  // ─────────────────────────────────────────────────────────────
  {
    id: "get_sensor_data",
    name: "IoT Microcontroller Telemetry",
    functionName: "get_sensor_data()",
    description: "Sample real-time temperature, humidity, and door aperture from ESP32 / Arduino devices.",
    category: "iot",
    risk: "LOW",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/esp32-telemetry",
    parameters: [
      { name: "deviceId", type: "string", required: true, description: "Microcontroller device ID" },
      { name: "limit", type: "number", required: false, description: "Number of samples" },
    ],
  },
  {
    id: "emergency_relay_cutoff",
    name: "Hardware Breaker Actuator",
    functionName: "emergency_relay_cutoff()",
    description: "Trip physical power relay or compressor circuit. STRICT HUMAN APPROVAL GATED.",
    category: "iot",
    risk: "HIGH",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/hardware-relay",
    parameters: [
      { name: "relayPin", type: "string", required: true, description: "GPIO pin or actuator ID" },
      { name: "reason", type: "string", required: true, description: "Audit rationale for emergency cutoff" },
    ],
  },
  {
    id: "mqtt_publish_telemetry",
    name: "MQTT Broker Telemetry Publisher",
    functionName: "publish_mqtt()",
    description: "Publish sensor telemetry payloads or actuation triggers to industrial MQTT brokers.",
    category: "iot",
    risk: "MEDIUM",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/mqtt-publisher",
    parameters: [
      { name: "topic", type: "string", required: true, description: "MQTT topic path e.g. 'telemetry/cold-chain'" },
      { name: "payload", type: "string", required: true, description: "JSON stringified telemetry payload" },
    ],
  },
  {
    id: "modbus_plc_reader",
    name: "Industrial Modbus PLC Reader",
    functionName: "read_modbus_registers()",
    description: "Read industrial PLC holding registers, flow meters, and HVAC controllers over Modbus TCP/RTU.",
    category: "iot",
    risk: "LOW",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/modbus-plc",
    parameters: [
      { name: "unitId", type: "number", required: true, description: "Modbus slave unit ID" },
      { name: "registerAddress", type: "number", required: true, description: "Register offset address" },
      { name: "count", type: "number", required: false, description: "Number of registers to read" },
    ],
  },
  {
    id: "esp32_cam_ocr",
    name: "ESP32-CAM Visual Inspection",
    functionName: "capture_camera_ocr()",
    description: "Capture frame from ESP32-CAM or RTSP IP camera to perform optical character recognition or seal inspection.",
    category: "iot",
    risk: "LOW",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/esp32-cam-ocr",
    parameters: [
      { name: "cameraEndpoint", type: "string", required: true, description: "HTTP or RTSP streaming endpoint" },
      { name: "inspectionTarget", type: "string", required: false, description: "digital_gauge | container_seal | barcode" },
    ],
  },
  {
    id: "gps_geofence_monitor",
    name: "GPS Geofence Tracking Unit",
    functionName: "verify_gps_geofence()",
    description: "Read real-time coordinates from asset tracker and verify cold-chain vehicle perimeter compliance.",
    category: "iot",
    risk: "LOW",
    source: "skills.sh",
    sourceUrl: "https://skills.sh/skills/gps-geofence",
    parameters: [
      { name: "assetId", type: "string", required: true, description: "Asset or vehicle identifier" },
      { name: "maxAllowedRadiusKm", type: "number", required: false, description: "Max perimeter radius in km" },
    ],
  },
];
