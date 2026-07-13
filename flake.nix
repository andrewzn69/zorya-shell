{
  description = "zorya - gtk4 ags/astal desktop shell";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    astal = {
      url = "github:aylur/astal";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    ags = {
      url = "github:aylur/ags";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.astal.follows = "astal";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      ags,
      astal,
    }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
      astalPkgs = astal.packages.${system};
      extra = [
        astalPkgs.hyprland
        astalPkgs.mpris
        astalPkgs.notifd
      ];
    in
    {
      packages.${system}.default = pkgs.stdenv.mkDerivation {
        pname = "zorya";
        version = "0.0.1";
        src = ./.;

        nativeBuildInputs = with pkgs; [
          wrapGAppsHook4
          gobject-introspection
          ags.packages.${system}.default
        ];

        buildInputs = [
          pkgs.glib
          pkgs.gjs
          astalPkgs.io
          astalPkgs.astal4
        ]
        ++ extra;

        installPhase = ''
          mkdir -p $out/bin $out/share/zorya
          ags bundle app.ts $out/bin/zorya
          find . -name '*.scss' -exec cp --parents {} $out/share/zorya/ \;
        '';

        preFixup = ''
          gappsWrapperArgs+=(
            --prefix PATH : ${pkgs.lib.makeBinPath [ pkgs.dart-sass ]}
            --set ZORYA_STYLE_DIR $out/share/zorya
          )
        '';
      };

      devShells.${system}.default = pkgs.mkShell {
        buildInputs = [ (ags.packages.${system}.default.override { extraPackages = extra; }) ];
      };

      homeManagerModules.default = import ./hm-module.nix self;
    };
}
