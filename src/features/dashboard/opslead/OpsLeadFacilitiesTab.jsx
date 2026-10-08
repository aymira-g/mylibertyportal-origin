import { useState, useMemo } from "react";
import {
  Wrench,
  CheckCircle2,
  Plus,
  Trash2,
} from "lucide-react";
import { useToast } from "../../shared";
import { filterBranchStaffByRole } from "./opsLeadUtils";

/**
 * OpsLeadFacilitiesTab
 *
 * Implements Blueprint §6.8 & §6.10:
 * Facility maintenance coordination, site cleanliness tracking,
 * and task coordination for Office Support (Office Boy / Facilities staff).
 */
export default function OpsLeadFacilitiesTab({
  todos = [],
  users = [],
  myBranch = "Kota Gorontalo",
  onAddTodo = null,
  onToggleTodo = null,
  onDeleteTodo = null,
}) {
  const toast = useToast();
  const [taskText, setTaskText] = useState("");
  const [assignedUid, setAssignedUid] = useState("");

  // Office Boy & support staff at this branch (strictly branch-scoped, including in Executive preview mode)
  const officeSupportStaff = useMemo(() => {
    return filterBranchStaffByRole(users, myBranch).officeSupport;
  }, [users, myBranch]);

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!taskText.trim()) return;

    if (onAddTodo) {
      onAddTodo({
        title: taskText.trim(),
        assignedTo: assignedUid || null,
        category: "facilities",
        branch: myBranch,
      });
      setTaskText("");
      setAssignedUid("");
      toast("Facility task assigned.", "success");
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-[#1a3a8f]" />
            <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
              Branch Facilities &amp; Maintenance Coordination
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Operational coordination of Office Boy / Facilities tasks, site logistics, and building cleanliness (Blueprint §6.8).
          </p>
        </div>

        <span className="self-start sm:self-auto text-xs font-bold text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
          {officeSupportStaff.length} Office Support on duty
        </span>
      </div>

      {/* Dispatch New Task Form */}
      <form onSubmit={handleCreateTask} className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
        <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">
          Dispatch Site Maintenance / Cleaning Task
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <input
            type="text"
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            placeholder="e.g. Clean Room 3 whiteboards, check AC remote in Hall B, restock water..."
            className="sm:col-span-6 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:border-[#1a3a8f] outline-none"
          />

          <select
            value={assignedUid}
            onChange={(e) => setAssignedUid(e.target.value)}
            className="sm:col-span-4 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:border-[#1a3a8f] outline-none cursor-pointer"
          >
            <option value="">Assign to Support Staff...</option>
            {officeSupportStaff.map((ob) => (
              <option key={ob.id} value={ob.id}>
                {ob.displayName || ob.firstName || "Office Boy"}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={!taskText.trim()}
            className="sm:col-span-2 px-4 py-2 bg-[#1a3a8f] hover:bg-[#152e74] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Dispatch</span>
          </button>
        </div>
      </form>

      {/* Active Tasks List */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
          Active Maintenance &amp; Site Tasks ({todos.length})
        </h4>

        {todos.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 font-medium">
            All facility and cleanliness tasks are clear!
          </div>
        ) : (
          <div className="space-y-2">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                  todo.completed
                    ? "bg-slate-50/50 border-slate-200/60 opacity-60"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onToggleTodo && onToggleTodo(todo.id)}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center cursor-pointer transition ${
                      todo.completed
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-slate-300 hover:border-[#1a3a8f]"
                    }`}
                  >
                    {todo.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                  <div>
                    <p
                      className={`text-xs font-bold text-slate-800 ${
                        todo.completed ? "line-through text-slate-400" : ""
                      }`}
                    >
                      {todo.title || todo.text || "Untitled Task"}
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {todo.assignedToName ? `Assigned to: ${todo.assignedToName}` : "Unassigned"}
                    </span>
                  </div>
                </div>

                {onDeleteTodo && (
                  <button
                    onClick={() => onDeleteTodo(todo.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
