import { useQuery } from "@tanstack/react-query";
import type { ImgHTMLAttributes } from "react";
import { isSupabase } from "../../data/repository";
export function BuildImage({
  src = "",
  alt,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const storage = src.startsWith("storage://");
  const { data, error } = useQuery({
    queryKey: ["media-url", src],
    enabled: storage && isSupabase,
    staleTime: 45 * 60 * 1000,
    refetchInterval: 45 * 60 * 1000,
    queryFn: async () => {
      const { supabase } = await import("../../data/supabase");
      const parts = src.slice(10).split("/");
      const bucket = parts.shift()!;
      if (!["build-media", "avatars"].includes(bucket))
        throw Error("Unsupported media bucket");
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(parts.join("/"), 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  if (error)
    return (
      <div className="media-error" role="img" aria-label={alt}>
        Media is unavailable. The creator may need to replace it.
      </div>
    );
  if (storage && !data)
    return (
      <div
        className="skeleton-block"
        role="status"
        aria-label="Loading media"
      />
    );
  return (
    <img
      {...props}
      alt={alt}
      src={
        storage
          ? data
          : src.startsWith("media/")
            ? import.meta.env.BASE_URL + src
            : src
      }
    />
  );
}
