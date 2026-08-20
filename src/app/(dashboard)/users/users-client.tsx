"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Plus, ShieldCheck, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect, optionsFromLabels } from "@/components/shared/filter-select";
import { SortHeader } from "@/components/shared/sort-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserFormDialog, type UserFormInitial } from "@/components/users/user-form";
import { ListPendingBar } from "@/components/shared/list-pending-bar";
import { formatDateTime, initials } from "@/lib/format";
import { LABELS, type Paginated, type Role } from "@/types";

export type UserRow = {
  _id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
};

export function UsersClient({
  data,
  currentUserId,
  canWrite,
}: {
  data: Paginated<UserRow>;
  currentUserId: string;
  canWrite: boolean;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserFormInitial | undefined>();

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput placeholder="Search name or email…" />
          <FilterSelect
            paramKey="role"
            placeholder="All roles"
            options={optionsFromLabels(LABELS.role)}
            className="w-[160px]"
          />
          <FilterSelect
            paramKey="isActive"
            placeholder="Any status"
            options={[
              { value: "true", label: "Active" },
              { value: "false", label: "Deactivated" },
            ]}
            className="w-[150px]"
          />
        </div>

        {canWrite ? (
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add administrator
          </Button>
        ) : null}
      </div>

      <ListPendingBar />

      {data.items.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState icon={Users} title="No users match these filters" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="thin-scrollbar overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <SortHeader field="name" className="min-w-[240px]">
                    User
                  </SortHeader>
                  <SortHeader field="role">Role</SortHeader>
                  <TableHead>Status</TableHead>
                  <SortHeader field="lastLoginAt">Last sign-in</SortHeader>
                  <SortHeader field="createdAt">Added</SortHeader>
                  {canWrite ? <TableHead className="w-12" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {initials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {user.name}
                            {user._id === currentUserId ? (
                              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                (you)
                              </span>
                            ) : null}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        {user.role === "SUPER_ADMIN" ? (
                          <ShieldCheck className="size-3.5 text-primary" aria-hidden />
                        ) : null}
                        {LABELS.role[user.role]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={user.isActive ? "ACTIVE" : "INACTIVE"}
                        label={user.isActive ? "Active" : "Deactivated"}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(user.createdAt)}
                    </TableCell>
                    {canWrite ? (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              aria-label={`Actions for ${user.name}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => {
                                setEditing(user);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="size-4" />
                              Edit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination {...data} />
        </div>
      )}

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editing}
        isSelf={editing?._id === currentUserId}
      />
    </>
  );
}
