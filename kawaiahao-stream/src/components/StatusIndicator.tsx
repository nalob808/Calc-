"use client";

export interface PipelineStep {
  name: string;
  status: "pending" | "success" | "error" | "running";
}

interface StatusIndicatorProps {
  steps: PipelineStep[];
}

const statusConfig: Record<PipelineStep["status"], { color: string; pulse: boolean; label: string }> = {
  pending: { color: "bg-[#555555]", pulse: false, label: "Pending" },
  running: { color: "bg-[#eab308]", pulse: true, label: "Running" },
  success: { color: "bg-[#22c55e]", pulse: false, label: "Success" },
  error: { color: "bg-[#ef4444]", pulse: false, label: "Error" },
};

export default function StatusIndicator({ steps }: StatusIndicatorProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
      {steps.map((step, i) => {
        const cfg = statusConfig[step.status];
        return (
          <div key={i} className="flex items-center gap-2">
            {/* Connector line (not on first) */}
            {i > 0 && (
              <div className="hidden sm:block w-6 h-px bg-[#2a2a2a]" />
            )}
            {/* Dot */}
            <span className="relative flex h-3 w-3">
              {cfg.pulse && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.color} opacity-75`} />
              )}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${cfg.color}`} />
            </span>
            {/* Label */}
            <span className="text-xs sm:text-sm text-[#888888] whitespace-nowrap">
              {step.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
