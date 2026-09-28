export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function toLocalMonthString(date: Date = new Date()): string {
  return toLocalDateString(date).slice(0, 7);
}

export function getMonthDateRange(month: string): {
  start: string;
  end: string;
} {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) {
    throw new Error("Format bulan harus YYYY-MM.");
  }

  const [, year, monthNumber] = match;
  const lastDay = new Date(Number(year), Number(monthNumber), 0).getDate();

  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}
