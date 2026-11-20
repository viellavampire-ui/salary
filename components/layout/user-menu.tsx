"use client";

import Link from "next/link";
import { ChevronsUpDown, LoaderCircle, LogOut } from "lucide-react";

import { useSignOut } from "@/components/auth/use-sign-out";
import { THEME_OPTIONS } from "@/components/theme/theme-toggle";
import { useTheme, type Theme } from "@/components/theme/use-theme";
import { UserAvatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MOBILE_MENU_ITEMS } from "./nav-items";

export type MenuUser = {
  name: string;
  email: string;
  image?: string | null;
};

/**
 * Меню профиля: имя, тема, выход.
 * variant="sidebar" — внизу сайдбара (на планшете только аватар),
 * variant="compact" — аватар в шапке на телефоне.
 */
export function UserMenu({
  user,
  variant,
}: {
  user: MenuUser;
  variant: "sidebar" | "compact";
}) {
  const [theme, setTheme] = useTheme();
  const { signOut, pending } = useSignOut();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Меню профиля"
        className={cn(
          "flex items-center gap-3 rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          variant === "sidebar" &&
            "w-full justify-center p-2 transition-colors duration-150 hover:bg-surface lg:justify-start",
          variant === "compact" && "p-0.5",
        )}
      >
        <UserAvatar name={user.name} image={user.image} />
        {variant === "sidebar" && (
          <>
            <span className="hidden min-w-0 flex-1 lg:block">
              <span className="block truncate text-sm font-medium">
                {user.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </span>
            <ChevronsUpDown className="hidden size-4 shrink-0 text-muted-foreground lg:block" />
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={variant === "sidebar" ? "start" : "end"}
        side={variant === "sidebar" ? "top" : "bottom"}
        className="w-60"
      >
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>

        {variant === "compact" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {MOBILE_MENU_ITEMS.map(({ href, label, Icon }) => (
                <DropdownMenuItem key={href} asChild>
                  <Link href={href}>
                    <Icon strokeWidth={1.75} />
                    {label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Тема</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme ?? undefined}
          onValueChange={(v) => setTheme(v as Theme)}
        >
          {THEME_OPTIONS.map(({ value, short, Icon }) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              onSelect={(e) => e.preventDefault()}
            >
              <Icon strokeWidth={1.75} />
              {short}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onSelect={(e) => {
            e.preventDefault();
            signOut();
          }}
        >
          {pending ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <LogOut strokeWidth={1.75} />
          )}
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
