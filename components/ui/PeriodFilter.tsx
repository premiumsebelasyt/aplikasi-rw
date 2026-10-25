"use client";

import { getReportPeriodRange, type ReportPeriodSelection } from "@/lib/report-period.mjs";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const MODES = [
  { value: "monthly", label: "Bulanan" },
  { value: "three-months", label: "3 Bulan" },
  { value: "six-months", label: "6 Bulan" },
  { value: "yearly", label: "Tahunan" },
] as const;

export function PeriodFilter({
  value,
  onChange,
}: {
  value: ReportPeriodSelection;
  onChange: (selection: ReportPeriodSelection) => void;
}) {
  const period = getReportPeriodRange(value);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 22 }, (_, index) => currentYear + 1 - index);

  return (
    <section aria-label="Filter periode laporan" className="period-filter rounded-2xl border border-[var(--border)] bg-white p-4 shadow-[var(--card-shadow)]">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1.5 text-slate-700">
          <span className="type-eyebrow">Jenis periode</span>
          <select
            aria-label="Jenis periode"
            value={value.mode}
            onChange={(event) => onChange({ ...value, mode: event.target.value as ReportPeriodSelection["mode"] })}
            className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-slate-900 focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            {MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
          </select>
        </label>

        {value.mode !== "yearly" && <label className="grid gap-1.5 text-slate-700">
          <span className="type-eyebrow">Bulan akhir periode</span>
          <select
            aria-label="Bulan akhir periode"
            value={value.month}
            onChange={(event) => onChange({ ...value, month: Number(event.target.value) })}
            className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-slate-900 focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            {MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
          </select>
        </label>}

        <label className="grid gap-1.5 text-slate-700">
          <span className="type-eyebrow">Tahun</span>
          <select
            aria-label="Tahun periode"
            value={value.year}
            onChange={(event) => onChange({ ...value, year: Number(event.target.value) })}
            className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-slate-900 focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
      </div>
      <p role="status" className="type-helper mt-3 break-words text-slate-600">
        Periode aktif: <strong className="font-semibold text-slate-900">{period.label}</strong> ({period.start} – {period.end}).
      </p>
    </section>
  );
}
