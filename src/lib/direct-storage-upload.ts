export type SignedStorageUpload = {
  path: string;
  signedUrl: string;
  publicUrl: string;
};

export async function uploadFileToSignedStorage(file: File, upload: SignedStorageUpload) {
  const form = new FormData();
  form.append("cacheControl", "3600");
  form.append("", file);

  const response = await fetch(upload.signedUrl, {
    method: "PUT",
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || "Direct file upload failed.");
  }

  return upload.publicUrl;
}
