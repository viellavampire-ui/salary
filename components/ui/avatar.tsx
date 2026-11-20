"use client";

import * as React from "react";
import { Avatar as AvatarPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  return (letters || "?").toUpperCase();
}

function UserAvatar({
  name,
  image,
  className,
}: {
  name: string;
  image?: string | null;
  className?: string;
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className,
      )}
    >
      {image && (
        <AvatarPrimitive.Image
          src={image}
          alt=""
          referrerPolicy="no-referrer"
          className="aspect-square size-full object-cover"
        />
      )}
      <AvatarPrimitive.Fallback
        delayMs={image ? 400 : 0}
        className="flex size-full items-center justify-center bg-primary-soft text-xs font-semibold text-primary"
      >
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

export { UserAvatar };
