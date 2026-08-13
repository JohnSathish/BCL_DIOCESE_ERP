import { PremiumBishopDashboard } from './PremiumBishopDashboard';
import { PremiumParishionerHome } from './PremiumParishionerHome';
import { PremiumPriestDashboard } from './PremiumPriestDashboard';

export function ParishionerHome() {
  return <PremiumParishionerHome />;
}

export function PriestHome() {
  return <PremiumPriestDashboard />;
}

export function BishopHome() {
  return <PremiumBishopDashboard />;
}
