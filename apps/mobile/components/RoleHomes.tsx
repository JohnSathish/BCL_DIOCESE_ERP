import { PremiumBishopDashboard } from './PremiumBishopDashboard';
import { PremiumPriestDashboard } from './PremiumPriestDashboard';
import { ParishHomeScreen } from './parish/ParishHomeScreen';

export function ParishionerHome() {
  return <ParishHomeScreen />;
}

export function PriestHome() {
  return <PremiumPriestDashboard />;
}

export function BishopHome() {
  return <PremiumBishopDashboard />;
}
