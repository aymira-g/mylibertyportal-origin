import { Loader2 } from "lucide-react";

/**
 * Standardized High-Frequency Primary Action Button.
 *
 * Provides a tactile, accessible (min 44px height), high-visibility button
 * designed for the top 3-4 recurring actions on each dashboard home screen.
 *
 * @param {object} props
 * @param {import("react").ComponentType<{ className?: string }>} [props.icon]
 * @param {string} props.label
 * @param {string} [props.description]
 * @param {() => void} [props.onClick]
 * @param {"primary" | "secondary" | "emerald" | "amber"} [props.variant="primary"]
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.loading=false]
 * @param {string | number} [props.badge]
 * @param {string} [props.className=""]
 * @param {"button" | "submit" | "reset"} [props.type="button"]
 */
export default function PrimaryActionButton({
  icon: Icon,
  label,
  description,
  onClick,
  variant = "primary",
  disabled = false,
  loading = false,
  badge = null,
  className = "",
  type = "button",
  ...rest
}) {
  const variantStyles = {
    primary:
      "bg-[#1a3a8f] text-white hover:bg-[#152e74] active:bg-[#11245a] border-transparent shadow-xs hover:shadow-sm",
    secondary:
      "bg-white text-slate-800 hover:bg-slate-50 active:bg-slate-100 border-slate-200/90 shadow-2xs hover:border-slate-300",
    emerald:
      "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 border-transparent shadow-xs hover:shadow-sm",
    amber:
      "bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 border-transparent shadow-xs hover:shadow-sm",
  };

  const iconBgStyles = {
    primary: "bg-white/15 text-white",
    secondary: "bg-[#1a3a8f]/10 text-[#1a3a8f]",
    emerald: "bg-white/20 text-white",
    amber: "bg-white/20 text-white",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`group relative flex items-center justify-between min-h-12 w-full px-3.5 py-2.5 rounded-2xl border text-left font-bold transition-all duration-150 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...rest}
    >
      <div className="flex items-center gap-3 min-w-0">
        {loading ? (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-white/20">
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          </div>
        ) : Icon ? (
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105 ${iconBgStyles[variant] || iconBgStyles.primary}`}
          >
            <Icon className="w-4 h-4" />
          </div>
        ) : null}

        <div className="min-w-0">
          <span className="block text-sm font-extrabold leading-snug truncate">{label}</span>
          {description && (
            <span
              className={`block text-[11px] font-medium leading-tight truncate mt-0.5 ${
                variant === "secondary" ? "text-slate-500" : "text-white/80"
              }`}
            >
              {description}
            </span>
          )}
        </div>
      </div>

      {badge !== null && badge !== undefined && (
        <span
          className={`ml-2 px-2 py-0.5 text-[10px] font-black rounded-full shrink-0 ${
            variant === "secondary"
              ? "bg-[#1a3a8f] text-white"
              : "bg-white/20 text-white backdrop-blur-xs"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
