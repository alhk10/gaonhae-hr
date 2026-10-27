// App-wide: paste an image (Ctrl/Cmd+V) into the relevant file upload field.
// Target = focused file input, else the only/first empty image file input in the topmost open dialog (or page).
function acceptsImage(input: HTMLInputElement) {
  const a = (input.accept || "").toLowerCase();
  return !a || a.includes("image");
}

function visible(el: HTMLElement) {
  return !!(el.offsetParent || el.getClientRects().length);
}

function findTarget(active: Element | null): HTMLInputElement | null {
  if (active instanceof HTMLInputElement && active.type === "file" && !active.disabled) return active;
  const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"]')).filter(visible);
  const scope: ParentNode = dialogs[dialogs.length - 1] || document;
  const inputs = Array.from(scope.querySelectorAll<HTMLInputElement>('input[type="file"]'))
    .filter((i) => !i.disabled && acceptsImage(i));
  if (!inputs.length) return null;
  return inputs.find((i) => !i.files?.length) || inputs[0];
}

export function installPasteToFileInput() {
  document.addEventListener("paste", (e) => {
    const files = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    const active = document.activeElement;
    // Let text fields keep normal paste behaviour.
    if (active instanceof HTMLTextAreaElement || (active instanceof HTMLInputElement && active.type !== "file") || (active as HTMLElement)?.isContentEditable) return;
    const target = findTarget(active);
    if (!target) return;
    e.preventDefault();
    const dt = new DataTransfer();
    const chosen = target.multiple ? files : [files[0]];
    chosen.forEach((f, i) => {
      const ext = (f.type.split("/")[1] || "png").replace("jpeg", "jpg");
      dt.items.add(new File([f], `pasted-${Date.now()}${i ? `-${i}` : ""}.${ext}`, { type: f.type }));
    });
    target.files = dt.files;
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    import("sonner").then(({ toast }) => toast.success("Image pasted")).catch(() => {});
  });
}
