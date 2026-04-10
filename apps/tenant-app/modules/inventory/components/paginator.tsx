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
    <div className="border-t border-zinc-100 pt-3 mt-3">
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
                    "flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors",
                    p === page
                      ? "border border-zinc-200 bg-white font-semibold text-zinc-900 shadow-xs"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
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
