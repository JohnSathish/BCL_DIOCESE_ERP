import type { ComponentType } from 'react';
import {
  BarChart3 as BarChart3Raw,
  Bell as BellRaw,
  BookOpen as BookOpenRaw,
  Building2 as Building2Raw,
  Calendar as CalendarRaw,
  Church as ChurchRaw,
  Cross as CrossRaw,
  FileText as FileTextRaw,
  Heart as HeartRaw,
  Home as HomeRaw,
  Image as ImageIcon,
  LayoutDashboard as LayoutDashboardRaw,
  LogIn as LogInRaw,
  LogOut as LogOutRaw,
  Mail as MailRaw,
  MapPin as MapPinRaw,
  Menu as MenuRaw,
  Phone as PhoneRaw,
  Play as PlayRaw,
  Search as SearchRaw,
  Settings as SettingsRaw,
  Sparkles as SparklesRaw,
  User as UserRaw,
  Users as UsersRaw,
} from 'lucide-react-native';

export type AppIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
};

function wrap(Raw: unknown): ComponentType<AppIconProps> {
  return Raw as ComponentType<AppIconProps>;
}

export const BarChart3 = wrap(BarChart3Raw);
export const Bell = wrap(BellRaw);
export const BookOpen = wrap(BookOpenRaw);
export const Building2 = wrap(Building2Raw);
export const Calendar = wrap(CalendarRaw);
export const Church = wrap(ChurchRaw);
export const Cross = wrap(CrossRaw);
export const FileText = wrap(FileTextRaw);
export const Heart = wrap(HeartRaw);
export const Home = wrap(HomeRaw);
export const LayoutDashboard = wrap(LayoutDashboardRaw);
export const LogOut = wrap(LogOutRaw);
export const Menu = wrap(MenuRaw);
export const Search = wrap(SearchRaw);
export const Settings = wrap(SettingsRaw);
export const Sparkles = wrap(SparklesRaw);
export const User = wrap(UserRaw);
export const Users = wrap(UsersRaw);
export const Mail = wrap(MailRaw);
export const Phone = wrap(PhoneRaw);
export const MapPin = wrap(MapPinRaw);
export const Play = wrap(PlayRaw);
export const Images = wrap(ImageIcon);
export const LogIn = wrap(LogInRaw);
