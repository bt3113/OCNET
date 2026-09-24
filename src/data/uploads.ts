export async function supabaseUpload(
  file: File,
  bucket = "company-media",
  persistent = false,
) {
  const { supabase } = await import("./supabase");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw Error("Sign in to upload media.");
  const path =
    user.id +
    "/" +
    crypto.randomUUID() +
    "." +
    (file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg");
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);
  if (signError) throw signError;
  return persistent ? "storage://" + bucket + "/" + path : data.signedUrl;
}
