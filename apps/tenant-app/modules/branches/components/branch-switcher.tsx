"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, GitBranch, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchBranch } from "../actions";

type Branch = {
  id: string;
  name: string;
  slug: string;
};

interface BranchSwitcherProps {
  tenantSlug: string;
  branches: Branch[];
  currentBranchId: string | null;
}

export function BranchSwitcher({ tenantSlug, branches, currentBranchId }: BranchSwitcherProps) {
  const [isPending, startTransition] = useTransition();

  const current = branches.find((b) => b.id === currentBranchId) ?? branches[0] ?? null;

  if (branches.length <= 1) return null;

  function handleSwitch(branchId: string) {
    if (branchId === currentBranchId) return;
    startTransition(async () => {
      try {
        await switchBranch(tenantSlug, branchId);
        window.location.reload();
      } catch {
        toast.error("Failed to switch branch");
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button
          type="button"
          className="flex w-full items-center gap-2 rounded-md border border-white/10 bg-white/6 px-3 py-2 text-left text-sm transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-sidebar-foreground/50" />
          ) : (
            <GitBranch className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50" />
          )}
          <span className="min-w-0 flex-1 truncate text-sidebar-foreground/85">
            {current?.name ?? "Select branch"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/40" />
        </button>
      }/>

      <DropdownMenuContent align="start" className="w-52">
        {branches.map((branch) => (
          <DropdownMenuItem
            key={branch.id}
            onClick={() => handleSwitch(branch.id)}
            className="flex items-center gap-2"
          >
            <span className="flex-1 truncate">{branch.name}</span>
            {branch.id === currentBranchId && (
              <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}

      </DropdownMenuContent>
    </DropdownMenu>
  );
}
