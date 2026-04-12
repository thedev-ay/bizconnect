"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface PaginatorProps {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}

function getPageWindow(page: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i);

  const pages: (number | "ellipsis")[] = [0];
  if (page > 2) pages.push("ellipsis");
  for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) {
    pages.push(i);
  }
  if (page < totalPages - 3) pages.push("ellipsis");
  pages.push(totalPages - 1);
  return pages;
}

export function Paginator({ page, totalPages, onPage }: PaginatorProps) {
  if (totalPages <= 1) return null;

  const pageWindow = getPageWindow(page, totalPages);

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPage(page - 1)}
              className={cn(page === 0 && "pointer-events-none opacity-40")}
            />
          </PaginationItem>

          {pageWindow.map((p, i) =>
            p === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <button
                  onClick={() => onPage(p)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors",
                    p === page
                      ? "border border-border/70 bg-background font-semibold text-foreground shadow-[0_8px_24px_-18px_rgba(15,23,42,0.35)]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {p + 1}
                </button>
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationNext
              onClick={() => onPage(page + 1)}
              className={cn(page >= totalPages - 1 && "pointer-events-none opacity-40")}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
