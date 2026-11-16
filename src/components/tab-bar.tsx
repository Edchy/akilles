import { usePathname, useRouter } from "expo-router";

import { TabButton } from "@/components/bottom-bar";
import type { IconName } from "@/components/icon";

type Tab = { href: string; label: string; icon: IconName };

const TABS: Tab[] = [
  { href: "/", label: "Next up", icon: "today" },
  { href: "/plan", label: "Plan", icon: "plan" },
  { href: "/profile", label: "Profile", icon: "profile" },
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
          // The workout's own screens — its Done among them — belong to Today;
          // Progress and Settings belong to Profile.
          active={
            pathname === tab.href ||
            (tab.href === "/" && pathname === "/workout") ||
            (tab.href === "/profile" && ["/settings", "/history"].includes(pathname))
          }
          onPress={() => {
            if (pathname !== tab.href) router.replace(tab.href as never);
          }}
        />
      ))}
    </>
  );
}
