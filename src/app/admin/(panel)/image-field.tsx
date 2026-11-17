"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/images";

/**
 * Picks a photo, uploads it straight to Vercel Blob and keeps its address in a hidden `imageUrl` field,
 * which the surrounding form saves. Nothing is saved until the form is.
 */
export function ImageField({ folder, defaultValue, label }: { folder: "restorani" | "stavke"; defaultValue?: string | null; label: string }) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({});

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return setState({ error: "Dozvoljene su JPG, PNG i WebP slike." });
    if (file.size > MAX_IMAGE_BYTES) return setState({ error: "Slika je veća od 8 MB." });
    setState({ busy: true });
    try {
      const name = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
      const blob = await upload(`${folder}/${name}`, file, { access: "public", handleUploadUrl: "/api/admin/upload" });
      setUrl(blob.url);
      setState({});
    } catch {
      setState({ error: "Otpremanje nije uspelo. Pokušaj ponovo." });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[15px] font-medium">{label}</span>
      <input type="hidden" name="imageUrl" value={url} />
      <div className="flex flex-wrap items-center gap-4">
        <div className="size-28 shrink-0 overflow-hidden bg-surface">
          {url && (
            // eslint-disable-next-line @next/next/no-img-element -- admin preview of a just-uploaded file
            <img src={url} alt="" className="size-full object-cover" />
          )}
        </div>
        <div className="flex flex-col items-start gap-2">
          <label className="cursor-pointer caps border border-ink px-4 py-3 hover:bg-surface has-focus-visible:outline-2 has-focus-visible:outline-ink">
            {state.busy ? "Otpremanje…" : url ? "Zameni sliku" : "Izaberi sliku"}
            <input
              type="file"
              accept={IMAGE_TYPES.join(",")}
              disabled={state.busy}
              onChange={(e) => pick(e.target.files?.[0])}
              className="sr-only"
            />
          </label>
          {url && !state.busy && (
            <button type="button" onClick={() => setUrl("")} className="text-[14px] text-muted underline underline-offset-4">
              Ukloni sliku
            </button>
          )}
        </div>
      </div>
      {state.error && <p role="alert" className="text-[14px] text-accent">{state.error}</p>}
      <p className="text-[13px] text-muted">JPG, PNG ili WebP do 8 MB. Slika se čuva kad sačuvaš formu.</p>
    </div>
  );
}
