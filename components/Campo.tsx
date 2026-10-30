import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = React.ComponentProps<"input"> & { rotulo: string; name: string };

export function Campo({ rotulo, name, ...props }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name} className="text-base">
        {rotulo}
      </Label>
      <Input id={name} name={name} className="h-10 text-lg md:text-lg" {...props} />
    </div>
  );
}
