// piecrust-uplink 0.20 declares host functions (including env::panic)
// without import annotations. Keep them as WASM imports for DuskVM to supply.
fn main() {
    if std::env::var("CARGO_CFG_TARGET_FAMILY").as_deref() == Ok("wasm") {
        println!("cargo:rustc-link-arg=--import-undefined");
    }
}
