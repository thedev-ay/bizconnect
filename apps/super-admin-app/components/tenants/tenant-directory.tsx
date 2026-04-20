"use client";

import type React from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Building2, ChevronRight, Filter, Puzzle, Search, Sparkles, Tags, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TENANT_PLAN_LABELS,
  TENANT_STATUS_LABELS,
  TENANT_STATUS_OPTIONS,
} from "@/lib/tenant-options";

export interface TenantDirectoryTenant {
  id: string;
  name: string;
  slug: string;
  country: string;
  countryLabel: string;
  plan: string;
  isActive: boolean;
  industry: string | null;
  industryLabel: string | null;
  companySize: string | null;
  companySizeLabel: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  tags: string[];
  createdAt: string;
  userCount: number;
  moduleCount: number;
}

interface TenantDirectoryProps {
  tenants: TenantDirectoryTenant[];
}

const ALL_VALUE = "all";

function titleize(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function TenantDirectory({ tenants }: TenantDirectoryProps) {
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState(ALL_VALUE);
  const [plan, setPlan] = useState(ALL_VALUE);
  const [country, setCountry] = useState(ALL_VALUE);
  const [status, setStatus] = useState(ALL_VALUE);
  const [industry, setIndustry] = useState(ALL_VALUE);

  const facets = useMemo(() => {
    const tagCounts = new Map<string, number>();
    const plans = new Set<string>();
    const countries = new Map<string, string>();
    const industries = new Map<string, string>();

    tenants.forEach((tenant) => {
      plans.add(tenant.plan);
      countries.set(tenant.country, tenant.countryLabel);
      if (tenant.industry) {
        industries.set(tenant.industry, tenant.industryLabel ?? titleize(tenant.industry));
      }
      tenant.tags.forEach((tenantTag) => {
        tagCounts.set(tenantTag, (tagCounts.get(tenantTag) ?? 0) + 1);
      });
    });

    return {
      tags: Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
      plans: Array.from(plans).sort(),
      countries: Array.from(countries.entries()).sort((a, b) => a[1].localeCompare(b[1])),
      industries: Array.from(industries.entries()).sort((a, b) => a[1].localeCompare(b[1])),
    };
  }, [tenants]);

  const filteredTenants = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tenants.filter((tenant) => {
      const searchable = [
        tenant.name,
        tenant.slug,
        tenant.countryLabel,
        tenant.industryLabel,
        tenant.companySizeLabel,
        tenant.email,
        tenant.phone,
        tenant.website,
        ...tenant.tags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!query || searchable.includes(query)) &&
        (tag === ALL_VALUE || tenant.tags.includes(tag)) &&
        (plan === ALL_VALUE || tenant.plan === plan) &&
        (country === ALL_VALUE || tenant.country === country) &&
        (status === ALL_VALUE || (status === "active" ? tenant.isActive : !tenant.isActive)) &&
        (industry === ALL_VALUE || tenant.industry === industry)
      );
    });
  }, [country, industry, plan, search, status, tag, tenants]);

  const hasFilters =
    search.trim() || tag !== ALL_VALUE || plan !== ALL_VALUE || country !== ALL_VALUE || status !== ALL_VALUE || industry !== ALL_VALUE;

  function resetFilters() {
    setSearch("");
    setTag(ALL_VALUE);
    setPlan(ALL_VALUE);
    setCountry(ALL_VALUE);
    setStatus(ALL_VALUE);
    setIndustry(ALL_VALUE);
  }

  const tagOptions = [
    { value: ALL_VALUE, label: "All tags" },
    ...facets.tags.map(([tenantTag, count]) => ({
      value: tenantTag,
      label: `${tenantTag} (${count})`,
    })),
  ];
  const planOptions = [
    { value: ALL_VALUE, label: "All plans" },
    ...facets.plans.map((tenantPlan) => ({
      value: tenantPlan,
      label: TENANT_PLAN_LABELS[tenantPlan as keyof typeof TENANT_PLAN_LABELS] ?? titleize(tenantPlan),
    })),
  ];
  const countryOptions = [
    { value: ALL_VALUE, label: "All countries" },
    ...facets.countries.map(([value, label]) => ({ value, label })),
  ];
  const industryOptions = [
    { value: ALL_VALUE, label: "All industries" },
    ...facets.industries.map(([value, label]) => ({ value, label })),
  ];
  const statusOptions = [
    { value: ALL_VALUE, label: "All statuses" },
    ...TENANT_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
  ];

  return (
    <div className="space-y-4">
      <div className="admin-surface space-y-4 px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="admin-eyebrow">Directory Facets</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filteredTenants.length} of {tenants.length} tenant{tenants.length === 1 ? "" : "s"} shown.
            </p>
          </div>
          {hasFilters && (
            <Button type="button" variant="outline" className="w-fit rounded-full" onClick={resetFilters}>
              <X className="mr-2 h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_repeat(5,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tenants, contacts, tags..."
              className="pl-9"
            />
          </div>

          <FacetSelect
            icon={<Tags className="h-4 w-4" />}
            value={tag}
            selectedLabel={tagOptions.find((option) => option.value === tag)?.label ?? tag}
            onValueChange={setTag}
          >
            {tagOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </FacetSelect>

          <FacetSelect
            icon={<Sparkles className="h-4 w-4" />}
            value={plan}
            selectedLabel={planOptions.find((option) => option.value === plan)?.label ?? plan}
            onValueChange={setPlan}
          >
            {planOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </FacetSelect>

          <FacetSelect
            icon={<Building2 className="h-4 w-4" />}
            value={country}
            selectedLabel={countryOptions.find((option) => option.value === country)?.label ?? country}
            onValueChange={setCountry}
          >
            {countryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </FacetSelect>

          <FacetSelect
            icon={<Filter className="h-4 w-4" />}
            value={industry}
            selectedLabel={industryOptions.find((option) => option.value === industry)?.label ?? industry}
            onValueChange={setIndustry}
          >
            {industryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </FacetSelect>

          <FacetSelect
            icon={<Filter className="h-4 w-4" />}
            value={status}
            selectedLabel={statusOptions.find((option) => option.value === status)?.label ?? TENANT_STATUS_LABELS[status as keyof typeof TENANT_STATUS_LABELS] ?? status}
            onValueChange={setStatus}
          >
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </FacetSelect>
        </div>
      </div>

      <div className="grid gap-4 sm:hidden">
        {filteredTenants.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No tenants match these filters.
            </CardContent>
          </Card>
        ) : (
          filteredTenants.map((tenant) => <TenantMobileCard key={tenant.id} tenant={tenant} />)
        )}
      </div>

      <Card className="hidden sm:flex">
        <CardHeader className="border-b border-border/60 py-4">
          <CardTitle className="text-base">All Tenants</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Business</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Modules</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    No tenants match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTenants.map((tenant) => (
                  <TableRow key={tenant.id} className="hover:bg-muted/28">
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{tenant.name}</p>
                          <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm text-foreground">{tenant.industryLabel ?? tenant.countryLabel}</p>
                        <p className="text-xs text-muted-foreground">{tenant.companySizeLabel ?? tenant.countryLabel}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <TenantTags tags={tenant.tags} />
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted px-2.5 py-1 text-xs font-medium capitalize text-foreground">
                        <Sparkles className="h-3 w-3 text-primary" />
                        {tenant.plan}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {tenant.userCount}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Puzzle className="h-3.5 w-3.5 text-muted-foreground" />
                        {tenant.moduleCount}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tenant.isActive ? "default" : "secondary"}>
                        {tenant.isActive ? "Active" : "Suspended"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(tenant.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Link href={`/tenants/${tenant.id}`}>
                        <Button variant="outline" size="sm" className="rounded-full border-border/70 bg-background shadow-none">
                          Manage <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function FacetSelect({
  icon,
  value,
  selectedLabel,
  onValueChange,
  children,
}: {
  icon: React.ReactNode;
  value: string;
  selectedLabel: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => nextValue && onValueChange(nextValue)}>
      <SelectTrigger className="w-full">
        <span className="shrink-0 text-muted-foreground">{icon}</span>
        <span className="truncate">{selectedLabel}</span>
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

function TenantMobileCard({ tenant }: { tenant: TenantDirectoryTenant }) {
  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
              <Building2 className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold tracking-[-0.02em] text-foreground">{tenant.name}</p>
              <code className="mt-1 inline-flex rounded-full border border-border/70 bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                /{tenant.slug}
              </code>
            </div>
          </div>
          <Badge variant={tenant.isActive ? "default" : "secondary"}>
            {tenant.isActive ? "Active" : "Suspended"}
          </Badge>
        </div>

        <TenantTags tags={tenant.tags} />

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Plan</p>
            <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted px-2 py-1 font-medium capitalize text-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              {tenant.plan}
            </p>
          </div>
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Users</p>
            <p className="mt-1 font-medium text-foreground">{tenant.userCount}</p>
          </div>
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Modules</p>
            <p className="mt-1 font-medium text-foreground">{tenant.moduleCount}</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <p className="text-xs text-muted-foreground">
            Created {format(new Date(tenant.createdAt), "MMM d, yyyy")}
          </p>
          <Link href={`/tenants/${tenant.id}`}>
            <Button size="sm" variant="outline" className="rounded-full border-border/70 bg-background shadow-none">
              Manage <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function TenantTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) {
    return <span className="text-xs text-muted-foreground">No tags</span>;
  }

  return (
    <div className="flex max-w-sm flex-wrap gap-1.5">
      {tags.slice(0, 3).map((tag) => (
        <Badge key={tag} variant="outline">
          {tag}
        </Badge>
      ))}
      {tags.length > 3 && <Badge variant="secondary">+{tags.length - 3}</Badge>}
    </div>
  );
}
