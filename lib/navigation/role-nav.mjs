const navigationByRole = {
  WARGA: [
    { title: "Beranda", href: "/", icon: "home" },
    { title: "Surat", href: "/surat", icon: "file" },
    { title: "Ajukan", href: "/buat-surat", icon: "file" },
    { title: "Profil", href: "/pengaturan/profil", icon: "user" },
    { title: "Menu", href: "/menu", icon: "menu" },
  ],
  RT: [
    { title: "Beranda", href: "/rt", icon: "home" },
    { title: "Surat", href: "/surat", icon: "file" },
    { title: "Warga", href: "/warga", icon: "people" },
    { title: "Profil", href: "/pengaturan/profil", icon: "user" },
    { title: "Menu", href: "/menu", icon: "menu" },
  ],
  RW: [
    { title: "Beranda", href: "/", icon: "home" },
    { title: "Surat", href: "/rw/surat", icon: "inbox" },
    { title: "Warga", href: "/warga", icon: "people" },
    { title: "Data RT", href: "/rt", icon: "home" },
    { title: "Menu", href: "/menu", icon: "menu" },
  ],
  BENDAHARA: [
    { title: "Kas", href: "/kas", icon: "wallet" },
    { title: "Transaksi", href: "/kas/transaksi", icon: "file" },
    { title: "IPK", href: "/kas/ipk", icon: "wallet" },
    { title: "Laporan", href: "/kas/laporan", icon: "chart" },
    { title: "Menu", href: "/menu", icon: "menu" },
  ],
  ADMIN: [
    { title: "Menu", href: "/menu", icon: "menu" },
    { title: "Surat", href: "/surat", icon: "file" },
    { title: "Warga", href: "/warga", icon: "people" },
    { title: "Kas", href: "/kas", icon: "wallet" },
    { title: "Profil", href: "/pengaturan/profil", icon: "user" },
  ],
};

export function navigationItemsForRole(role) {
  return navigationByRole[role] ?? [];
}
