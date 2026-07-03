// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // WebKitGTK's DMA-BUF/compositing path fails to create GBM buffers in some Linux
    // setups (nested/virtualized compositors, certain driver stacks), producing either
    // a Wayland protocol crash or a blank white webview. Force the safe fallback unless
    // the user has already set these explicitly.
    #[cfg(target_os = "linux")]
    {
        for (key, value) in [
            ("WEBKIT_DISABLE_DMABUF_RENDERER", "1"),
            ("WEBKIT_DISABLE_COMPOSITING_MODE", "1"),
            ("GDK_BACKEND", "x11"),
        ] {
            if std::env::var(key).is_err() {
                std::env::set_var(key, value);
            }
        }
    }

    jaguar_lib::run()
}
