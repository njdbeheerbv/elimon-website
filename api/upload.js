import { handleUpload } from "@vercel/blob/client";

// Geeft de browser een kortlevend token om bijlagen direct naar Vercel Blob te uploaden.
// Zo gaan grote tekeningen niet door de functie heen (limiet ~4,5 MB per verzoek).
const ALLOWED = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
  "application/acad",
  "image/vnd.dwg",
  "image/vnd.dxf",
  "application/dxf",
  "application/octet-stream",
];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  try {
    const json = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("aanvragen/")) throw new Error("Ongeldig pad");
        return {
          allowedContentTypes: ALLOWED,
          maximumSizeInBytes: 25 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    return res.status(200).json(json);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
