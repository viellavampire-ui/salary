"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-center"
      duration={5000}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-lg !border !border-border !bg-surface !text-foreground !shadow-popover",
          description: "!text-muted-foreground",
          actionButton:
            "!rounded-md !bg-primary !px-3 !font-medium !text-primary-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
