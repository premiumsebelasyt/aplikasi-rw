"use client";

import Image from "next/image";

export function SiteBrand() {
  return (
    <header className="border-b border-emerald-100 bg-white px-4 py-2.5">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <Image
          src="/rw16-nuansa-indah.png"
          alt="Logo Nuansa Indah Ciomas"
          width={64}
          height={56}
          unoptimized
          priority
          className="h-12 w-14 shrink-0 object-contain"
        />
        <div className="min-w-0 leading-tight">
          <p className="text-base font-bold text-slate-900">Nuansa Indah Ciomas</p>
          <p className="mt-1 text-[9px] font-medium leading-4 text-emerald-800 sm:text-[10px]">
            Desa Pagelaran, Kecamatan Ciomas, Kabupaten Bogor, Jawa Barat 16610
          </p>
        </div>
      </div>
    </header>
  );
}
