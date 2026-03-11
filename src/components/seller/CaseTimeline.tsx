import { CheckCircle2, Circle, Send, FileSearch, CheckCircle, XCircle, AlertTriangle, FileText, PenLine, Upload, FileCheck, CreditCard, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export const TIMELINE_STEPS = [
  { key: "draft", label: "Piszkozat", icon: Circle, description: "Az ügy létrejött, de még nincs beküldve." },
  { key: "submitted", label: "Beküldve", icon: Send, description: "Az ügy sikeresen beküldve." },
  { key: "ai_processing", label: "AI feldolgozás", icon: FileSearch, description: "Automatikus feldolgozás alatt." },
  { key: "green_approved", label: "Jóváhagyva", icon: CheckCircle, description: "Az ügy jóváhagyásra került.", branch: "approved" },
  { key: "red_rejected", label: "Elutasítva", icon: XCircle, description: "Az ügy elutasításra került.", branch: "rejected" },
  { key: "yellow_review", label: "Manuális ellenőrzés szükséges", icon: AlertTriangle, description: "Kézi ellenőrzés szükséges.", branch: "manual" },
  { key: "contract_generated", label: "Szerződés generálva", icon: FileText, description: "Az adásvételi szerződés elkészült.", branch: "approved" },
  { key: "awaiting_signed_contract", label: "Aláírásra vár", icon: PenLine, description: "Az aláírt szerződés feltöltése szükséges.", branch: "approved" },
  { key: "signed_contract_uploaded", label: "Aláírt szerződés feltöltve", icon: Upload, description: "Az aláírt szerződés beérkezett.", branch: "approved" },
  { key: "service_agreement_accepted", label: "Szolgáltatási szerződés elfogadása", icon: FileCheck, description: "A szolgáltatási szerződés elfogadása.", branch: "approved" },
  { key: "payment_pending", label: "Fizetés függőben", icon: CreditCard, description: "A fizetés még nem érkezett meg.", branch: "approved" },
  { key: "paid", label: "Fizetve", icon: CreditCard, description: "A fizetés megérkezett.", branch: "approved" },
  { key: "closed", label: "Lezárva", icon: Lock, description: "Az ügy sikeresen lezárult." },
] as const;

// Map case status to timeline step index
const STATUS_TO_STEP: Record<string, number> = {};
TIMELINE_STEPS.forEach((s, i) => { STATUS_TO_STEP[s.key] = i; });

// Determine which branch is active based on status
function getActiveBranch(status: string): "approved" | "rejected" | "manual" | null {
  const rejectedStatuses = ["red_rejected"];
  const manualStatuses = ["yellow_review"];
  const approvedStatuses = [
    "green_approved", "contract_generated", "awaiting_signed_contract",
    "signed_contract_uploaded", "service_agreement_accepted",
    "payment_pending", "paid", "closed",
  ];

  if (rejectedStatuses.includes(status)) return "rejected";
  if (manualStatuses.includes(status)) return "manual";
  if (approvedStatuses.includes(status)) return "approved";
  return null;
}

// Determine which steps to render (filter by active branch)
function getVisibleSteps(status: string) {
  const activeBranch = getActiveBranch(status);
  
  return TIMELINE_STEPS.filter((step) => {
    if (!step.branch) return true; // always show non-branched steps
    if (!activeBranch) return step.branch === "approved"; // default: show approved path
    return step.branch === activeBranch;
  });
}

type StepState = "completed" | "current" | "future" | "warning" | "danger";

function getStepState(stepKey: string, currentStatus: string, visibleSteps: typeof TIMELINE_STEPS[number][]): StepState {
  const currentIdx = visibleSteps.findIndex((s) => s.key === currentStatus);
  const stepIdx = visibleSteps.findIndex((s) => s.key === stepKey);

  if (stepIdx < 0) return "future";
  if (stepIdx < currentIdx) return "completed";
  if (stepIdx === currentIdx) {
    if (stepKey === "red_rejected") return "danger";
    if (stepKey === "yellow_review") return "warning";
    return "current";
  }
  return "future";
}

const stateStyles: Record<StepState, { circle: string; line: string; label: string }> = {
  completed: {
    circle: "bg-primary border-primary text-primary-foreground",
    line: "bg-primary",
    label: "text-primary",
  },
  current: {
    circle: "bg-secondary border-secondary text-secondary-foreground",
    line: "bg-border",
    label: "text-foreground font-semibold",
  },
  future: {
    circle: "bg-muted border-border text-muted-foreground",
    line: "bg-border",
    label: "text-muted-foreground",
  },
  warning: {
    circle: "bg-warning border-warning text-warning-foreground",
    line: "bg-border",
    label: "text-warning font-semibold",
  },
  danger: {
    circle: "bg-destructive border-destructive text-destructive-foreground",
    line: "bg-border",
    label: "text-destructive font-semibold",
  },
};

interface CaseTimelineProps {
  status: string;
}

export default function CaseTimeline({ status }: CaseTimelineProps) {
  const visibleSteps = getVisibleSteps(status);

  return (
    <div className="relative">
      {visibleSteps.map((step, i) => {
        const state = getStepState(step.key, status, visibleSteps);
        const styles = stateStyles[state];
        const Icon = step.icon;
        const isLast = i === visibleSteps.length - 1;

        return (
          <div key={step.key} className="flex gap-4 relative">
            {!isLast && (
              <div
                className={cn(
                  "absolute left-[17px] top-[36px] w-0.5 h-[calc(100%-12px)]",
                  state === "completed" ? styles.line : "bg-border",
                )}
              />
            )}

            <div
              className={cn(
                "relative z-10 flex items-center justify-center h-9 w-9 rounded-full shrink-0 border-2 transition-colors",
                styles.circle,
              )}
            >
              {state === "completed" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : state === "current" || state === "warning" || state === "danger" ? (
                <Icon className="h-4 w-4" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
            </div>

            <div className={cn("pb-7", isLast && "pb-0")}>
              <p className={cn("text-sm leading-tight", styles.label)}>
                {step.label}
              </p>
              <p className={cn("text-xs mt-0.5", state === "future" ? "text-muted-foreground/50" : "text-muted-foreground")}>
                {step.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
