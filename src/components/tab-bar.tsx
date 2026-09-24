import { usePathname, useRouter } from "expo-router";

import { TabButton } from "@/components/bottom-bar";
import type { IconName } from "@/components/icon";

type Tab = { href: string; label: string; icon: IconName };

const TABS: Tab[] = [
  { href: "/", label: "Today", icon: "today" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/plan", label: "Plan", icon: "plan" },
];

/** Default bar contents: the three tabs, whenever a screen has nothing else. */
export function TabButtons() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <>
      {TABS.map((tab) => (
        <TabButton
          key={tab.href}
          icon={tab.icon}
          label={tab.label}
          active={pathname === tab.href}
          onPress={() => router.replace(tab.href as never)}
        />
      ))}
    </>
  );
}
