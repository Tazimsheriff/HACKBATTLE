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
  // Productivity & Email
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

  // Search & Web Intelligence
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

  // Communications & Alerting
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

  // Memory & Continuous Learning
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

  // Data & DevOps
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

  // Hardware & IoT (Optional)
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
];
