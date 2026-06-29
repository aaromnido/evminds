import type { ComponentType } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type IconComponent = ComponentType<{ className?: string }>;

interface IconButtonProps
  extends React.ComponentProps<typeof Button>, VariantProps<typeof buttonVariants> {
  icon?: IconComponent;
  showIcon?: boolean;
  href?: string;
  target?: string;
  rel?: string;
}

export function IconButton({
  icon: Icon,
  showIcon = true,
  children,
  className,
  href,
  target,
  rel,
  variant,
  size,
  ...props
}: IconButtonProps) {
  const content = (
    <>
      {Icon && showIcon && <Icon className="size-4" />}
      {children}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        className={cn(buttonVariants({ variant, size }), "gap-2", className)}
      >
        {content}
      </a>
    );
  }

  return (
    <Button variant={variant} size={size} className={cn("gap-2", className)} {...props}>
      {content}
    </Button>
  );
}
