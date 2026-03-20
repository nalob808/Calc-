"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import StatusIndicator, { PipelineStep } from "@/components/StatusIndicator";
import VideoCard from "@/components/VideoCard";
import VideoModal from "@/components/VideoModal";

type Tab = "live" | "week" | "archive" | "special" | "log";

interface LogEntry {
  timestamp: string;
  step: string;
  status: "success" | "pending" | "error";
  details: string;
}

interface ArchiveVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  duration: string;
  viewCount: string;
  eventType: string;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "live", label: "Live" },
  { key: "week", label: "This Week" },
  { key: "archive", label: "Archive" },
  { key: "special", label: "Special Events" },
  { key: "log", label: "Log" },
];

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

/* ---------- Sub-components for each tab ---------- */

function LiveTab() {
  const [embedUrl, setEmbedUrl] = useState("");
  const [overrideUrl, setOverrideUrl] = useState("");
  const [goLiveTime, setGoLiveTime] = useState("Sunday 9:00 AM HST");
  const [pushing, setPushing] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([
    { name: "Gmail", status: "success" },
    { name: "Bulletin", status: "success" },
    { name: "YouTube", status: "success" },
    { name: "Teradek", status: "pending" },
    { name: "WordPress", status: "pending" },
  ]);

  useEffect(() => {
    fetch("/api/youtube/archive?limit=1", { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        const id = data?.videos?.[0]?.videoId;
        if (id) setEmbedUrl(`https://www.youtube.com/watch?v=${id}`);
      })
      .catch(() => {});
  }, []);

  async function pushLive() {
    if (!overrideUrl.trim()) return;
    setPushing(true);
    try {
      // Extract video ID from URL
      const url = new URL(overrideUrl);
      const videoId = url.searchParams.get("v") || url.pathname.split("/").pop() || "";
      await fetch("/api/youtube/live", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ videoId }),
      });
      setEmbedUrl(overrideUrl);
      setOverrideUrl("");
    } catch {
      /* handled by status */
    } finally {
      setPushing(false);
    }
  }

  async function retriggerStep(stepName: string) {
    setPipelineSteps((prev) =>
      prev.map((s) => (s.name === stepName ? { ...s, status: "running" as const } : s))
    );
    try {
      await fetch(`/api/admin/retrigger`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ step: stepName.toLowerCase() }),
      });
      setPipelineSteps((prev) =>
        prev.map((s) => (s.name === stepName ? { ...s, status: "success" as const } : s))
      );
    } catch {
      setPipelineSteps((prev) =>
        prev.map((s) => (s.name === stepName ? { ...s, status: "error" as const } : s))
      );
    }
  }

  return (
    <div className="space-y-8">
      {/* Current Embed */}
      <div className="card">
        <h3 className="text-sm font-semibold text-[#e8e8e8] uppercase tracking-wider mb-3">Current Embed</h3>
        <p className="text-sm text-[#888888] break-all">{embedUrl || "No live stream set"}</p>
      </div>

      {/* Manual Override */}
      <div className="card">
        <h3 className="text-sm font-semibold text-[#e8e8e8] uppercase tracking-wider mb-3">Manual Override</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            value={overrideUrl}
            onChange={(e) => setOverrideUrl(e.target.value)}
            placeholder="Paste YouTube URL..."
            className="input-field flex-1"
          />
          <button onClick={pushLive} disabled={pushing || !overrideUrl.trim()} className="btn-gold whitespace-nowrap disabled:opacity-50">
            {pushing ? "Pushing..." : "Push Live"}
          </button>
        </div>
      </div>

      {/* Scheduled Go-Live */}
      <div className="card">
        <h3 className="text-sm font-semibold text-[#e8e8e8] uppercase tracking-wider mb-3">Scheduled Go-Live</h3>
        <p className="text-[#c9972b] font-medium">{goLiveTime}</p>
      </div>

      {/* Pipeline Status */}
      <div className="card">
        <h3 className="text-sm font-semibold text-[#e8e8e8] uppercase tracking-wider mb-4">Pipeline Status</h3>
        <StatusIndicator steps={pipelineSteps} />
        <div className="flex flex-wrap gap-2 mt-4">
          {pipelineSteps.map((step) => (
            <button
              key={step.name}
              onClick={() => retriggerStep(step.name)}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-[#888888] hover:text-[#e8e8e8] hover:border-[#c9972b] transition-all"
            >
              Re-trigger {step.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ThisWeekTab() {
  const [sermonTitle, setSermonTitle] = useState("");
  const [pastor, setPastor] = useState("");
  const [date, setDate] = useState("");
  const [times, setTimes] = useState("9:00 AM HST");
  const [bulletinPreview, setBulletinPreview] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/this-week", { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        setSermonTitle(data.sermonTitle || "");
        setPastor(data.pastor || "");
        setDate(data.date || "");
        setTimes(data.times || "9:00 AM HST");
        setBulletinPreview(data.bulletinPreview || "");
      })
      .catch(() => {});
  }, []);

  async function saveWeek() {
    setSaving(true);
    try {
      await fetch("/api/admin/this-week", {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ sermonTitle, pastor, date, times }),
      });
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-5">
        <h3 className="text-sm font-semibold text-[#e8e8e8] uppercase tracking-wider">Service Details</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[#888888] mb-1">Sermon Title</label>
            <input value={sermonTitle} onChange={(e) => setSermonTitle(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-[#888888] mb-1">Pastor</label>
            <input value={pastor} onChange={(e) => setPastor(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-[#888888] mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-[#888888] mb-1">Times</label>
            <input value={times} onChange={(e) => setTimes(e.target.value)} className="input-field" />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={saveWeek} disabled={saving} className="btn-gold disabled:opacity-50">
            {saving ? "Saving..." : "Save & Push"}
          </button>
        </div>
      </div>

      {/* Bulletin Preview */}
      <div className="card">
        <h3 className="text-sm font-semibold text-[#e8e8e8] uppercase tracking-wider mb-3">Bulletin / Order of Service</h3>
        {bulletinPreview ? (
          <div className="text-sm text-[#888888] whitespace-pre-wrap leading-relaxed">{bulletinPreview}</div>
        ) : (
          <p className="text-sm text-[#555555]">No bulletin data available yet.</p>
        )}
        <div className="mt-4">
          <a
            href="/api/admin/bulletin-pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline text-sm inline-block"
          >
            Download Bulletin PDF
          </a>
        </div>
      </div>
    </div>
  );
}

function ArchiveTab() {
  const [videos, setVideos] = useState<ArchiveVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<{ videoId: string; title: string } | null>(null);
  const [newVideoId, setNewVideoId] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetch("/api/youtube/archive", { headers: authHeaders() });
      const data = await res.json();
      setVideos(data.videos || []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  async function addVideo() {
    if (!newVideoId.trim()) return;
    setAdding(true);
    try {
      await fetch("/api/admin/archive/add", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ videoId: newVideoId.trim() }),
      });
      setNewVideoId("");
      fetchVideos();
    } catch {
      /* silent */
    } finally {
      setAdding(false);
    }
  }

  async function toggleEventType(videoId: string, currentType: string) {
    const types = ["Sunday Service", "Concert", "Special Event", ""];
    const idx = types.indexOf(currentType);
    const nextType = types[(idx + 1) % types.length];
    try {
      await fetch("/api/admin/archive/tag", {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ videoId, eventType: nextType }),
      });
      setVideos((prev) =>
        prev.map((v) => (v.videoId === videoId ? { ...v, eventType: nextType } : v))
      );
    } catch {
      /* silent */
    }
  }

  return (
    <div className="space-y-6">
      {/* Add video */}
      <div className="card">
        <h3 className="text-sm font-semibold text-[#e8e8e8] uppercase tracking-wider mb-3">Add Video</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newVideoId}
            onChange={(e) => setNewVideoId(e.target.value)}
            placeholder="YouTube Video ID"
            className="input-field flex-1"
          />
          <button onClick={addVideo} disabled={adding || !newVideoId.trim()} className="btn-gold whitespace-nowrap disabled:opacity-50">
            {adding ? "Adding..." : "Add Video"}
          </button>
        </div>
      </div>

      {/* Video Grid */}
      {loading ? (
        <p className="text-[#888888]">Loading archive...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div key={video.videoId} className="relative group/admin">
              <VideoCard
                videoId={video.videoId}
                thumbnail={video.thumbnail}
                title={video.title}
                pastor=""
                date={new Date(video.publishedAt).toLocaleDateString()}
                duration={video.duration}
                viewCount={video.viewCount}
                eventType={video.eventType}
                onPlay={(id) => setActiveVideo({ videoId: id, title: video.title })}
              />
              {/* Admin overlay: toggle event type */}
              <button
                onClick={() => toggleEventType(video.videoId, video.eventType)}
                className="absolute top-2 left-2 z-10 text-xs px-2 py-1 rounded bg-[#1a1a1a]/90 border border-[#2a2a2a] text-[#c9972b] hover:bg-[#2a2a2a] transition-all opacity-0 group-hover/admin:opacity-100"
              >
                Tag: {video.eventType || "None"}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeVideo && (
        <VideoModal videoId={activeVideo.videoId} title={activeVideo.title} onClose={() => setActiveVideo(null)} />
      )}
    </div>
  );
}

function SpecialEventsTab() {
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [visibility, setVisibility] = useState<"public" | "unlisted">("public");
  const [eventType, setEventType] = useState("Special Event");
  const [submitting, setSubmitting] = useState(false);
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!eventName.trim() || !eventDate) return;
    setSubmitting(true);
    setSubmitted(false);
    setSteps([
      { name: "Create Event", status: "running" },
      { name: "YouTube", status: "pending" },
      { name: "WordPress", status: "pending" },
      { name: "Notifications", status: "pending" },
    ]);

    try {
      const res = await fetch("/api/admin/special-event", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ eventName, eventDate, eventTime, visibility, eventType }),
      });
      const data = await res.json();

      // Simulate pipeline completion updates
      setSteps([
        { name: "Create Event", status: "success" },
        { name: "YouTube", status: data.youtubeStatus || "success" },
        { name: "WordPress", status: data.wordpressStatus || "success" },
        { name: "Notifications", status: data.notifyStatus || "success" },
      ]);
      setSubmitted(true);
    } catch {
      setSteps((prev) =>
        prev.map((s) => (s.status === "running" || s.status === "pending" ? { ...s, status: "error" as const } : s))
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-5">
        <h3 className="text-sm font-semibold text-[#e8e8e8] uppercase tracking-wider">Create Special Event</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm text-[#888888] mb-1">Event Name</label>
            <input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g., Easter Cantata" className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-[#888888] mb-1">Date</label>
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-[#888888] mb-1">Time</label>
            <input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-[#888888] mb-1">Visibility</label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === "public"}
                  onChange={() => setVisibility("public")}
                  className="accent-[#c9972b]"
                />
                <span className="text-sm text-[#e8e8e8]">Public</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === "unlisted"}
                  onChange={() => setVisibility("unlisted")}
                  className="accent-[#c9972b]"
                />
                <span className="text-sm text-[#e8e8e8]">Unlisted</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#888888] mb-1">Event Type</label>
            <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="input-field cursor-pointer">
              <option value="Special Event">Special Event</option>
              <option value="Concert">Concert</option>
              <option value="Memorial">Memorial</option>
              <option value="Wedding">Wedding</option>
              <option value="Community">Community</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || !eventName.trim() || !eventDate}
          className="btn-gold disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Event & Start Automation"}
        </button>
      </div>

      {/* Pipeline Status */}
      {steps.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-[#e8e8e8] uppercase tracking-wider mb-4">Automation Status</h3>
          <StatusIndicator steps={steps} />
          {submitted && (
            <p className="text-sm text-[#22c55e] mt-4">Event created successfully.</p>
          )}
        </div>
      )}
    </div>
  );
}

function LogTab() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/logs", { headers: authHeaders() });
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const statusColor: Record<string, string> = {
    success: "text-[#22c55e]",
    pending: "text-[#eab308]",
    error: "text-[#ef4444]",
  };

  return (
    <div className="card overflow-hidden p-0">
      <div className="px-6 py-4 border-b border-[#2a2a2a]">
        <h3 className="text-sm font-semibold text-[#e8e8e8] uppercase tracking-wider">Activity Log</h3>
      </div>

      {loading ? (
        <div className="p-6 text-[#888888]">Loading logs...</div>
      ) : logs.length === 0 ? (
        <div className="p-6 text-center text-[#555555]">No log entries yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-left text-xs text-[#555555] uppercase tracking-wider">
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Step</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((entry, i) => (
                <tr key={i} className="border-b border-[#2a2a2a]/50 hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-6 py-3 text-[#888888] whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-[#e8e8e8] whitespace-nowrap">{entry.step}</td>
                  <td className={`px-6 py-3 font-medium whitespace-nowrap ${statusColor[entry.status] || "text-[#888888]"}`}>
                    {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                  </td>
                  <td className="px-6 py-3 text-[#888888]">{entry.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- Main Admin Dashboard ---------- */

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("live");
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push("/admin/login");
    } else {
      setAuthed(true);
    }
  }, [router]);

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-[#c9972b] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-[#2a2a2a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <span className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[#c9972b]">
                Kawaiahao Admin
              </span>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("admin_token");
                router.push("/admin/login");
              }}
              className="text-sm text-[#888888] hover:text-[#e8e8e8] transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={activeTab === tab.key ? "pill-tab pill-tab-active" : "pill-tab"}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "live" && <LiveTab />}
        {activeTab === "week" && <ThisWeekTab />}
        {activeTab === "archive" && <ArchiveTab />}
        {activeTab === "special" && <SpecialEventsTab />}
        {activeTab === "log" && <LogTab />}
      </div>
    </div>
  );
}
