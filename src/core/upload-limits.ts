/**
 * Upload size limits, shared by the browser-side checks and the server. Kept free of Node APIs so client components
 * can import it. One upload request (server action) carries at most UPLOAD_REQUEST_MAX_BYTES; next.config.ts allows
 * a little more for the form fields.
 */

const MB = 1024 * 1024;

export const MAX_IMAGE_BYTES = 5 * MB;
/** PDFs (vendor quotes, contracts, receipts); images inside documents still follow MAX_IMAGE_BYTES. */
export const MAX_DOCUMENT_BYTES = 20 * MB;
export const MAX_SPREADSHEET_BYTES = 5 * MB;
export const UPLOAD_REQUEST_MAX_BYTES = 40 * MB;

/** "20 MB", for messages. */
export const megabytes = (bytes: number) => `${Math.round(bytes / MB)} MB`;

/** What file pickers offer for attachments: PDFs, images, Word, Excel, PowerPoint, CSV and text. */
export const ANY_FILE_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt";

/** How the accepted files are named in messages. */
export const ANY_FILE_KINDS = "PDF, imágenes (JPG, PNG, WebP), Word, Excel, PowerPoint, CSV o texto";

/** Files the browser shows by themselves (images and PDFs); every other file is downloaded. */
export const opensInBrowser = (id: string) => /\.(jpg|png|webp|pdf)$/.test(id);
