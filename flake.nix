{
  description = "avanza-desk: Tauri + React + shadcn dev environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    { nixpkgs, rust-overlay, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems =
        f:
        nixpkgs.lib.genAttrs systems (
          system:
          f (
            import nixpkgs {
              inherit system;
              overlays = [ rust-overlay.overlays.default ];
            }
          )
        );
    in
    {
      formatter = forAllSystems (pkgs: pkgs.nixfmt);

      devShells = forAllSystems (
        pkgs:
        let
          inherit (pkgs) lib stdenv;
          rust = pkgs.rust-bin.stable.latest.default.override {
            extensions = [
              "rust-src"
              "rust-analyzer"
              "clippy"
            ];
            # Windows target is only for experimental NSIS cross-builds via cargo-xwin.
            targets = lib.optional stdenv.hostPlatform.isLinux "x86_64-pc-windows-msvc";
          };
        in
        {
          default = pkgs.mkShell {
            nativeBuildInputs =
              with pkgs;
              [
                rust
                cargo-tauri
                just
                git-cliff
                nodejs_24
                pnpm
                pkg-config
              ]
              ++ lib.optionals stdenv.hostPlatform.isLinux [
                wrapGAppsHook4
                # Windows cross-compile (NSIS installer only), see tauri docs "Windows Installer".
                cargo-xwin
                llvmPackages.bintools
                nsis
              ];

            buildInputs = lib.optionals stdenv.hostPlatform.isLinux (
              with pkgs;
              [
                webkitgtk_4_1
                gtk3
                librsvg
                libsoup_3
                openssl
                glib-networking
                libayatana-appindicator
                xdotool
                gst_all_1.gst-plugins-base
                gst_all_1.gst-plugins-good
              ]
            );

            shellHook = lib.optionalString stdenv.hostPlatform.isLinux ''
              # Correct display scale on Wayland + GSettings schemas for the webview.
              export XDG_DATA_DIRS="$GSETTINGS_SCHEMAS_PATH:$XDG_DATA_DIRS"
              export GIO_MODULE_DIR="${pkgs.glib-networking}/lib/gio/modules/"
              # webkitgtk DMA-BUF renderer blanks the window on many NVIDIA/Wayland setups.
              export WEBKIT_DISABLE_DMABUF_RENDERER=1
            '';
          };
        }
      );
    };
}
