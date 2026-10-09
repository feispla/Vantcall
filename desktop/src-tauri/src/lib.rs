#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let _window = tauri::WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::External(
                    "https://feispla.github.io/Vantcall/".parse().unwrap(),
                ),
            )
            .title("VANTS")
            .inner_size(1280.0, 800.0)
            .min_inner_size(960.0, 600.0)
            .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
