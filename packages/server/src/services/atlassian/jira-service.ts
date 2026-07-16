import { fetchJiraApi } from "./atlassian-client.js";

export interface JiraIssueInfo {
  key: string;
  summary: string;
  status: string;
  statusColor: string;
  assignee: string;
  priority: string;
  priorityIcon: string;
  issueType: string;
  issueTypeIcon: string;
  url: string;
}

const STATUS_COLORS: Record<string, string> = {
  "to do": "#dfe1e6",
  "in progress": "#0052cc",
  "in review": "#7b4cf5",
  done: "#00875a",
  cancelled: "#8993a4",
  backlog: "#8993a4",
  selected: "#8993a4",
  open: "#dfe1e6",
  resolved: "#00875a",
  closed: "#00875a",
  reopened: "#0052cc",
};

function statusColor(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, color] of Object.entries(STATUS_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return "#8993a4";
}

const PRIORITY_ICONS: Record<string, string> = {
  highest: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🟢",
  lowest: "⚪",
};

const ISSUE_TYPE_ICONS: Record<string, string> = {
  Epic: "⚡",
  Story: "📖",
  Task: "✅",
  Bug: "🐛",
  SubTask: "📋",
  Initiative: "🎯",
};

export async function testConnection(): Promise<{ user: string; displayName: string } | null> {
  try {
    const result = await fetchJiraApi("/myself") as {
      emailAddress?: string;
      displayName?: string;
    };
    return {
      user: result.emailAddress ?? "",
      displayName: result.displayName ?? "",
    };
  } catch {
    return null;
  }
}

export async function getIssue(key: string): Promise<JiraIssueInfo> {
  const fieldList = "summary,status,assignee,priority,issuetype";
  const issue = await fetchJiraApi(
    `/issue/${encodeURIComponent(key)}?fields=${fieldList}`,
  ) as {
    key: string;
    fields: {
      summary: string;
      status: { name: string; statusCategory?: { colorName?: string } };
      assignee?: { displayName: string; emailAddress?: string };
      priority?: { name: string; iconUrl?: string };
      issuetype: { name: string; iconUrl?: string };
    };
  };

  const f = issue.fields;

  return {
    key: issue.key,
    summary: f.summary ?? "",
    status: f.status.name,
    statusColor: statusColor(f.status.name),
    assignee: f.assignee?.displayName ?? "Unassigned",
    priority: f.priority?.name ?? "None",
    priorityIcon: f.priority?.name
      ? PRIORITY_ICONS[f.priority.name.toLowerCase()] ?? ""
      : "",
    issueType: f.issuetype.name,
    issueTypeIcon: ISSUE_TYPE_ICONS[f.issuetype.name] ?? "",
    url: "",
  };
}
