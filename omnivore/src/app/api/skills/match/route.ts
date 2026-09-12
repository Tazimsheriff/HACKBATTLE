import { NextResponse } from "next/server";
import { SKILLS_SH_CATALOG, AgentSkill } from "@/skills/registry";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mission = "", agentName = "", apiKey, endpoint, model } = body;

    const rawQuery = (agentName + " " + mission).toLowerCase();
    // Normalize common typos (e.g. weahter -> weather, wahtsapp -> whatsapp, watsapp -> whatsapp)
    const query = rawQuery
      .replace(/\bweahter\b/g, "weather")
      .replace(/\bwahtsapp\b/g, "whatsapp")
      .replace(/\bwatsapp\b/g, "whatsapp")
      .replace(/\btelegrame\b/g, "telegram");

    // 1. High-precision rule & keyword matching
    const scoredSkills = SKILLS_SH_CATALOG.map((skill) => {
      let score = 0;
      const haystack = (
        skill.id +
        " " +
        skill.name +
        " " +
        skill.description +
        " " +
        skill.category +
        " " +
        skill.functionName
      ).toLowerCase();

      // --- WEATHER INTENT ---
      if (
        query.includes("weather") ||
        query.includes("forecast") ||
        query.includes("temperature") ||
        query.includes("rain") ||
        query.includes("climate") ||
        query.includes("storm")
      ) {
        if (skill.id === "weather_forecast") score += 50;
      }

      // --- TELEGRAM INTENT ---
      if (query.includes("telegram") || query.includes("tg bot")) {
        if (skill.id === "telegram_send_message") score += 50;
        if (skill.id === "send_notification") score += 20;
        // Penalize Slack if Telegram was requested and Slack wasn't
        if (skill.id === "slack_post_message" && !query.includes("slack")) score -= 50;
      }

      // --- WHATSAPP INTENT ---
      if (query.includes("whatsapp") || query.includes("wa alert")) {
        if (skill.id === "whatsapp_send_message") score += 50;
        if (skill.id === "send_notification") score += 20;
        // Penalize Slack if WhatsApp was requested and Slack wasn't
        if (skill.id === "slack_post_message" && !query.includes("slack")) score -= 50;
      }

      // --- DISCORD INTENT ---
      if (query.includes("discord")) {
        if (skill.id === "discord_send_message") score += 50;
        if (skill.id === "send_notification") score += 20;
        if (skill.id === "slack_post_message" && !query.includes("slack")) score -= 50;
      }

      // --- SLACK INTENT (Strict: only match Slack if user specifically asks for Slack) ---
      if (query.includes("slack")) {
        if (skill.id === "slack_post_message") score += 50;
      }

      // --- GENERAL NOTIFICATION / ALERTS ---
      if (
        query.includes("notify") ||
        query.includes("notification") ||
        query.includes("alert") ||
        query.includes("updates") ||
        query.includes("broadcast")
      ) {
        if (skill.id === "send_notification") score += 25;
      }

      // --- EMAIL / GMAIL INTENT ---
      if (
        query.includes("email") ||
        query.includes("gmail") ||
        query.includes("inbox") ||
        query.includes("newsletter")
      ) {
        if (skill.id === "gmail_read_inbox") score += 40;
        if (skill.id === "gmail_send_digest") score += 35;
      }

      // --- CALENDAR INTENT ---
      if (
        query.includes("calendar") ||
        query.includes("schedule") ||
        query.includes("meeting") ||
        query.includes("agenda")
      ) {
        if (skill.id === "google_calendar_events") score += 45;
      }

      // --- NOTION INTENT ---
      if (query.includes("notion") || query.includes("workspace page")) {
        if (skill.id === "notion_update_page") score += 45;
      }

      // --- JIRA INTENT ---
      if (query.includes("jira") || query.includes("ticket") || query.includes("bug report")) {
        if (skill.id === "jira_create_issue") score += 45;
      }

      // --- WEB SEARCH & SCRAPING ---
      if (
        query.includes("search") ||
        query.includes("research") ||
        query.includes("web") ||
        query.includes("scrape") ||
        query.includes("news") ||
        query.includes("lookup")
      ) {
        if (skill.id === "web_search") score += 35;
        if (skill.id === "fetch_live_news" && query.includes("news")) score += 35;
        if (skill.id === "web_scraper_dynamic" && query.includes("scrape")) score += 35;
        if (skill.id === "pdf_doc_reader" && (query.includes("pdf") || query.includes("doc"))) score += 35;
      }

      // --- DEVOPS & GITHUB INTENT ---
      if (
        query.includes("github") ||
        query.includes("pull request") ||
        query.includes("pr ") ||
        query.includes("ci/cd") ||
        query.includes("deploy")
      ) {
        if (skill.id === "github_issue_monitor") score += 40;
        if (skill.id === "github_code_search") score += 30;
      }
      if (query.includes("docker") || query.includes("container")) {
        if (skill.id === "docker_container_ops") score += 40;
      }
      if (query.includes("aws") || query.includes("cloudwatch")) {
        if (skill.id === "aws_cloudwatch_query") score += 40;
      }

      // --- HARDWARE & IOT INTENT ---
      if (
        query.includes("sensor") ||
        query.includes("esp32") ||
        query.includes("iot") ||
        query.includes("relay") ||
        query.includes("hardware") ||
        query.includes("microcontroller")
      ) {
        if (skill.id === "get_sensor_data") score += 45;
        if (skill.id === "emergency_relay_cutoff") score += 35;
        if (skill.id === "mqtt_publish_telemetry") score += 30;
      }

      // --- DATA VISUALIZATION, CHARTS & FLOWCHARTS ---
      if (
        query.includes("chart") ||
        query.includes("pie") ||
        query.includes("bar") ||
        query.includes("diagram") ||
        query.includes("flowchart") ||
        query.includes("visual") ||
        query.includes("graph") ||
        query.includes("mermaid")
      ) {
        if (skill.id === "visual_chart_generator") score += 60;
        if (skill.id === "flowchart_diagram_builder") score += 55;
        if (skill.id === "mermaid_architect") score += 45;
      }

      // --- DATABASE & SQL & BI ---
      if (
        query.includes("database") ||
        query.includes("sql") ||
        query.includes("postgres") ||
        query.includes("csv") ||
        query.includes("table") ||
        query.includes("bi")
      ) {
        if (skill.id === "database_bi_reporter") score += 50;
        if (skill.id === "database_query") score += 40;
        if (skill.id === "csv_tabular_analyzer" && query.includes("csv")) score += 40;
      }

      return { skill, score };
    });

    // 2. Filter skills with positive relevance
    let matchedSkills = scoredSkills
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.skill);

    // Limit to top 5 most relevant tools
    if (matchedSkills.length > 5) {
      matchedSkills = matchedSkills.slice(0, 5);
    }

    // Fallback if no specific keyword matched at all
    if (matchedSkills.length === 0) {
      matchedSkills = [
        SKILLS_SH_CATALOG.find((s) => s.id === "send_notification") || SKILLS_SH_CATALOG[0],
        SKILLS_SH_CATALOG.find((s) => s.id === "query_memory") || SKILLS_SH_CATALOG[1],
      ];
    }

    return NextResponse.json({
      success: true,
      matchedCount: matchedSkills.length,
      matchedIds: matchedSkills.map((s) => s.id),
      skills: matchedSkills,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to match skills" },
      { status: 500 }
    );
  }
}
