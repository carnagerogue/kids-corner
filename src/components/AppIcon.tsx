import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  Gift,
  Globe2,
  Heart,
  Home,
  Image,
  Inbox,
  LockKeyhole,
  LayoutGrid,
  MessageCircle,
  MoreHorizontal,
  Paintbrush,
  Phone,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type AppIconName =
  | "arrow-left"
  | "arrow-right"
  | "home"
  | "calendar"
  | "apps"
  | "target"
  | "person"
  | "world"
  | "trophy"
  | "heart"
  | "message"
  | "lock"
  | "inbox"
  | "users"
  | "chart"
  | "gift"
  | "broom"
  | "image"
  | "phone"
  | "shield"
  | "settings"
  | "plus"
  | "sparkle"
  | "check"
  | "more";

const ICONS: Record<AppIconName, LucideIcon> = {
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  home: Home,
  calendar: CalendarDays,
  apps: LayoutGrid,
  target: Target,
  person: UserRound,
  world: Globe2,
  trophy: Trophy,
  heart: Heart,
  message: MessageCircle,
  lock: LockKeyhole,
  inbox: Inbox,
  users: UsersRound,
  chart: BarChart3,
  gift: Gift,
  broom: Paintbrush,
  image: Image,
  phone: Phone,
  shield: ShieldCheck,
  settings: Settings,
  plus: Plus,
  sparkle: Sparkles,
  check: Check,
  more: MoreHorizontal,
};

export function AppIcon({
  name,
  className = "",
}: {
  name: AppIconName;
  className?: string;
}) {
  const Icon = ICONS[name];
  return <Icon className={`appicon ${className}`.trim()} aria-hidden="true" />;
}
