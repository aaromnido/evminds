import type { ComponentPropsWithoutRef } from "react";
import { Trash2, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonProps = ComponentPropsWithoutRef<typeof Button>;

interface Props extends Omit<ButtonProps, "type"> {
  archived: boolean;
}

export default function ArchiveButton({ archived, className, ...props }: Props) {
  return (
    <Button
      {...props}
      type="submit"
      name="_action"
      value={archived ? "unarchive" : "archive"}
      formNoValidate
      variant={archived ? "outline" : "destructive"}
      className={cn("ml-auto", className)}
    >
      {archived ? <ArchiveRestore className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
      {archived ? "Desarchivar" : "Archivar"}
    </Button>
  );
}
