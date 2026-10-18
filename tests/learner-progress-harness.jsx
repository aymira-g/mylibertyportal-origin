import { createRoot } from "react-dom/client";
import LearnerProgressTab from "../src/features/reports/tabs/LearnerProgressTab";

export function Harness() {
  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <LearnerProgressTab branchFilter="all" isAdminView={false} />
    </div>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<Harness />);
}
