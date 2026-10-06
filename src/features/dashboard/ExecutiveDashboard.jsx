import DirectorDashboard from "./DirectorDashboard";
import ViceDirectorDashboard from "./ViceDirectorDashboard";
import { normalizeRole } from "../shared/roles";

/**
 * ExecutiveDashboard: Dedicated router component for executive leadership.
 * Routes to DirectorDashboard for the Director role and ViceDirectorDashboard for the Vice Director role.
 *
 * @param {{ role?: string }} props
 */
export default function ExecutiveDashboard({ role = "director" }) {
  const normalized = normalizeRole(role);

  if (normalized === "vice_director") {
    return <ViceDirectorDashboard />;
  }

  return <DirectorDashboard />;
}

export { DirectorDashboard, ViceDirectorDashboard };
