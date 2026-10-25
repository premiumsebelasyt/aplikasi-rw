export type IpkInputRow = { rt: string; terkumpul: number };
export type IpkRpcPayload = {
  p_bulan: string;
  p_rows: Array<{ rt: string; terkumpul: number; keterangan: string }>;
};
export function buildIpkRpcPayload(month: string, rows: IpkInputRow[], monthLabel: string): IpkRpcPayload;
