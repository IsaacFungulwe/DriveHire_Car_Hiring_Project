import { useEffect, useState } from "react";

import corolla from "@/assets/cars/corolla.jpg";
import suv from "@/assets/cars/suv.jpg";
import exec from "@/assets/cars/exec.jpg";
import hatch from "@/assets/cars/hatch.jpg";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const STOCK: Record<string, string> = { corolla, suv, exec, hatch };

export function stockImage(key?: string | null) {
  return (key && STOCK[key]) || corolla;
}

type Props = {
  imageKey?: string | null;
  imagePath?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
};

export function VehicleImage({ imageKey, imagePath, alt, className, priority }: Props) {
  const [src, setSrc] = useState<string>(() => stockImage(imageKey));

  useEffect(() => {
    let active = true;
    if (!imagePath) {
      setSrc(stockImage(imageKey));
      return;
    }
    supabase.storage
      .from("vehicles")
      .createSignedUrl(imagePath, 3600)
      .then(({ data }) => {
        if (active && data?.signedUrl) setSrc(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [imageKey, imagePath]);

  return (
    <img
      src={src}
      alt={alt}
      width={1280}
      height={864}
      loading={priority ? "eager" : "lazy"}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}
