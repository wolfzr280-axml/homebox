import { onMounted, onUnmounted } from "vue";

export interface ClipboardImagePasteOptions {
  /**
   * Skip the paste when a dialog is open, so a page-level listener does not
   * steal images meant for a modal (e.g. the create modal opened over an edit page).
   */
  ignoreWhenDialogOpen?: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "TEXTAREA") return true;
  if (tag === "INPUT") {
    const type = (target as HTMLInputElement).type;
    return !["button", "checkbox", "radio", "file", "submit", "reset", "range", "color"].includes(type);
  }
  return false;
}

function hasOpenDialog(): boolean {
  return document.querySelector('[role="dialog"][data-state="open"]') !== null;
}

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** Extracts image files from a paste event, giving them unique, readable names. */
export function imagesFromClipboard(event: ClipboardEvent): File[] {
  const items = event.clipboardData?.items;
  if (!items) return [];

  const files: File[] = [];
  for (const item of Array.from(items)) {
    if (item.kind !== "file" || !item.type.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (!file) continue;

    // Screenshots arrive as a generic "image.png"; give them a unique name.
    const ext = item.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
    const generic = !file.name || /^image\.\w+$/i.test(file.name);
    const suffix = files.length > 0 ? `-${files.length + 1}` : "";
    const name = generic ? `pasted-${timestamp()}${suffix}.${ext}` : file.name;
    files.push(name === file.name ? file : new File([file], name, { type: file.type, lastModified: Date.now() }));
  }
  return files;
}

/**
 * Calls `onImages` when the user pastes one or more images (Ctrl+V) anywhere on the page.
 * Text pastes into inputs are left alone, so normal editing keeps working.
 */
export function useClipboardImagePaste(
  onImages: (files: File[]) => void | Promise<void>,
  options: ClipboardImagePasteOptions = {}
) {
  function handlePaste(event: ClipboardEvent) {
    if (event.defaultPrevented) return;
    if (options.ignoreWhenDialogOpen && hasOpenDialog()) return;

    const files = imagesFromClipboard(event);
    if (files.length === 0) return;

    // Office apps put both text and a rendered image on the clipboard;
    // when pasting into a text field, the text is what the user wants.
    const hasText = !!event.clipboardData?.types.includes("text/plain");
    if (hasText && isEditableTarget(event.target)) return;

    event.preventDefault();
    void onImages(files);
  }

  onMounted(() => window.addEventListener("paste", handlePaste));
  onUnmounted(() => window.removeEventListener("paste", handlePaste));
}
