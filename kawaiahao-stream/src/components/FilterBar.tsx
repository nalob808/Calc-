"use client";

export interface ActiveFilters {
  speaker: string;
  year: string;
  eventType: string;
}

interface FilterBarProps {
  speakers: string[];
  years: string[];
  eventTypes: string[];
  onFilterChange: (filters: ActiveFilters) => void;
  activeFilters: ActiveFilters;
}

export default function FilterBar({
  speakers,
  years,
  eventTypes,
  onFilterChange,
  activeFilters,
}: FilterBarProps) {
  const allEventTypes = ["All", ...eventTypes];

  const handleChange = (key: keyof ActiveFilters, value: string) => {
    onFilterChange({ ...activeFilters, [key]: value });
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
      {/* Speaker Dropdown */}
      <select
        value={activeFilters.speaker}
        onChange={(e) => handleChange("speaker", e.target.value)}
        className="input-field w-full sm:w-48 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23888888%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.75rem_center] bg-no-repeat pr-8"
      >
        <option value="">All Speakers</option>
        {speakers.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* Year Dropdown */}
      <select
        value={activeFilters.year}
        onChange={(e) => handleChange("year", e.target.value)}
        className="input-field w-full sm:w-36 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23888888%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.75rem_center] bg-no-repeat pr-8"
      >
        <option value="">All Years</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      {/* Event Type Pill Tabs */}
      <div className="flex flex-wrap gap-2">
        {allEventTypes.map((type) => {
          const isActive =
            type === "All"
              ? activeFilters.eventType === ""
              : activeFilters.eventType === type;
          return (
            <button
              key={type}
              onClick={() => handleChange("eventType", type === "All" ? "" : type)}
              className={isActive ? "pill-tab pill-tab-active" : "pill-tab"}
            >
              {type}
            </button>
          );
        })}
      </div>
    </div>
  );
}
