import {
  CheckCircle2,
  Circle,
  Send,
  FileSearch,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  PenLine,
  Upload,
  FileCheck,
  CreditCard,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TimelineStep = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  branch?: "approved" | "rejected" | "manual";
};

export const TIMELINE_STEPS: TimelineStep[] = [
  {
    key: "draft",
    label: "Piszkozat",
    icon: Circle,
    description: "Az ügy létrejött.",
  },
  {
    key: "submitted",
    label: "Beküldve",
    icon: Send,
    description: "Az ügy sikeresen beküldve.",
  },
  {
    key: "ai_processing",
    label: "AI feldolgozás",
    icon: FileSearch,
    description: "Az ügy automatikus feldolgozása folyamatban van.",
  },
  {
    key: "green_approved",
    label: "Jóváhagyva",
    icon: CheckCircle,
    description: "Az ügy jóváhagyásra került.",
    branch: "approved",
  },
  {
    key: "red_rejected",
    label: "Elutasítva",
    icon: XCircle,
    description: "Az ügy elutasításra került.",
    branch: "rejected",
  },
  {
    key: "yellow_review",
    label: "Manuális ellenőrzés szükséges",
    icon: AlertTriangle,
    description: "Az ügy kézi ellenőrzést igényel.",
    branch: "manual",
  },
  {
    key: "contract_generated",
    label: "Szerződés generálva",
    icon: FileText,
    description: "Az adásvételi szerződés elkészült.",
    branch: "approved",
  },
  {
    key: "awaiting_signed_contract",
    label: "Aláírásra vár",
    icon: PenLine,
    description: "Az aláírt szerződés feltöltése szükséges.",
    branch: "approved",
  },
  {
    key: "signed_contract_uploaded",
    label: "Aláírt szerződés feltöltve",
    icon: Upload,
    description: "Az aláírt szerződés beérkezett.",
    branch: "approved",
  },
  {
    key: "service_agreement_accepted",
    label: "Szolgáltatási szerződés elfogadva",
    icon: FileCheck,
    description: "A szolgáltatási szerződés elfogadása megtörtént.",
    branch: "approved",
  },
  {
    key: "payment_pending",
    label: "Fizetés függőben",
    icon: CreditCard,
    description: "A szolgáltatási díj megfizetése következik.",
    branch: "approved",
  },
  {
    key: "paid",
    label: "Fizetve",
    icon: CreditCard,
    description: "A fizetés megérkezett.",
    branch: "approved",
  },
  {
    key: "closed",
    label: "Lezárva",
    icon: Lock,
    description: "Az ügy sikeresen lezárult.",
  },
];

function normalizeTimelineStatus(status: string): string {
  const map: Record<string, string> = {
    documents_uploaded: "docs_uploaded",
    review_in_progress: "ai_processing",
    in_review: "ai_processing",
    approved: "green_approved",
    rejected: "red_rejected",
    ready_for_contract: "green_approved",
    contract_preparing: "contract_generated",
    signed: "signed_contract_uploaded",
    waiting_payment: "payment_pending",
    completed: "closed",
  };

  return map[status] ?? status;
}

function getActiveBranch(status: string): "approved" | "rejected" | "manual" | null {
  const s = normalizeTimelineStatus(status);

  if (s === "red_rejected") return "rejected";
  if (s === "yellow_review") return "manual";

  const approvedStatuses = [
    "green_approved",
    "contract_generated",
    "awaiting_signed_contract",
    "signed_contract_uploaded",
    "service_agreement_accepted",
    "payment_pending",
    "paid",
    "closed",
  ];

  if (approvedStatuses.includes(s)) return "approved";
  return null;
}

function getVisibleSteps(status: string) {
  const normalized = normalizeTimelineStatus(status);
  const activeBranch = getActiveBranch(normalized);

  return TIMELINE_STEPS.filter((step) => {
    if (!step.branch) return true;
    if (!activeBranch) return step.branch === "approved";
    return step.branch === activeBranch;
  });
}

type StepState = "completed" | "current" | "future" | "warning" | "danger";

function getStepState(stepKey: string, currentStatus: string, visibleSteps: TimelineStep[]): StepState {
  const normalized = normalizeTimelineStatus(currentStatus);
  const currentIdx = visibleSteps.findIndex((s) => s.key === normalized);
  const stepIdx = visibleSteps.findIndex((s) => s.key === stepKey);

  if (stepIdx < 0) return "future";
  if (currentIdx === -1) return stepIdx === 0 ? "current" : "future";
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
    <div className="space-y-0">
      {visibleSteps.map((step, i) => {
        const state = getStepState(step.key, status, visibleSteps);
        const styles = stateStyles[state];
        const Icon = step.icon;
        const isLast = i === visibleSteps.length - 1;

        return (
          <div key={step.key} className="relative flex gap-4 pb-6">
            {!isLast && <div className={cn("absolute left-[18px] top-10 h-full w-0.5", styles.line)} />}

            <div
              className={cn(
                "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                styles.circle,
              )}
            >
              {state === "completed" ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>

            <div className="space-y-1 pt-1">
              <div className={cn("text-sm", styles.label)}>{step.label}</div>
              <div className="text-sm text-muted-foreground">{step.description}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
