import { motion } from "framer-motion";
import { Check, Loader2, Circle, AlertCircle } from "lucide-react";
import type { WorkflowStep } from "./Dashboard";

type WorkflowProgressProps = {
  steps: WorkflowStep[];
};

const getStepIcon = (status: WorkflowStep["status"]) => {
  switch (status) {
    case "completed":
      return <Check className="w-4 h-4" />;
    case "active":
      return <Loader2 className="w-4 h-4 animate-spin" />;
    case "error":
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <Circle className="w-4 h-4" />;
  }
};

export const WorkflowProgress = ({ steps }: WorkflowProgressProps) => {
  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">ワークフロー</h2>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={`workflow-step border ${
              step.status === "active"
                ? "bg-primary/10 border-primary/30"
                : step.status === "completed"
                ? "bg-success/10 border-success/30"
                : step.status === "error"
                ? "bg-destructive/10 border-destructive/30"
                : "bg-muted/50 border-border/50"
            }`}
          >
            <div
              className={`step-indicator ${
                step.status === "active"
                  ? "bg-primary text-primary-foreground"
                  : step.status === "completed"
                  ? "bg-success text-success-foreground"
                  : step.status === "error"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {getStepIcon(step.status)}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-foreground">{step.title}</h3>
              <p className="text-xs text-muted-foreground truncate">{step.description}</p>
            </div>

            {step.status === "active" && (
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </motion.div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="mt-6">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>進捗</span>
          <span>
            {steps.filter((s) => s.status === "completed").length}/{steps.length}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-[hsl(180_70%_45%)] rounded-full"
            initial={{ width: 0 }}
            animate={{
              width: `${(steps.filter((s) => s.status === "completed").length / steps.length) * 100}%`,
            }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </div>
  );
};
