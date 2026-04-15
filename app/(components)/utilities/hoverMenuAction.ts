export function runHoverMenuAction(onClick?: () => void | Promise<void>) {
    if (!onClick) return;

    const result = onClick();
    if (result && typeof (result as Promise<void>).catch === "function") {
        void (result as Promise<void>).catch((error) => {
            console.error("[HOVER-MENU] Action failed:", error);
        });
    }
}
