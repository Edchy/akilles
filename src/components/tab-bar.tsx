import { usePathname, useRouter } from "expo-router";

import { BarButton } from "@/components/bottom-bar";

type Tab = { href: string; label: string; glyph: string };

const TABS: Tab[] = [
  { href: "/", label: "Today", glyph: "◎" },
  { href: "/history", label: "History", glyph: "▤" },
  { href: "/plan", label: "Plan", glyph: "☰" },
];

/** Default bar contents: the three tabs, whenever a screen has nothing else. */
export function TabButtons() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <>
      {TABS.map((tab) => (
        <BarButton
          key={tab.href}
          glyph={tab.glyph}
          label={tab.label}
          active={pathname === tab.href}
          onPress={() => router.replace(tab.href as never)}
        />
      ))}
    </>
  );
}
