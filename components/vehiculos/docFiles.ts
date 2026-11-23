import { compressImage } from "@/lib/image";

/**
 * Prepara los archivos antes de subirlos: las fotos se reducen (2400 px, buena calidad para
 * poder leer la ficha tecnica) y los PDF se suben tal cual.
 */
export async function prepareDocFiles(files: File[]): Promise<File[]> {
  const out: File[] = [];
  for (const f of files) {
    if (f.type.startsWith("image/") && f.type !== "image/gif") {
      try {
        const dataUrl = await compressImage(f, 2400, 0.85);
        const blob = await (await fetch(dataUrl)).blob();
        out.push(new File([blob], f.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }));
        continue;
      } catch {
        // si no se puede reducir (formato raro), se sube como esta
      }
    }
    out.push(f);
  }
  return out;
}
