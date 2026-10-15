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
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];

      forAllSystems =
        f:
        nixpkgs.lib.genAttrs systems (
          system:
          let
            astalPkgs = astal.packages.${system};
          in
          f {
            inherit astalPkgs;
            pkgs = nixpkgs.legacyPackages.${system};
            agsPackage = ags.packages.${system}.default;
            extra = [
              astalPkgs.hyprland
              astalPkgs.mpris
              astalPkgs.notifd
            ];
          }
        );
    in
    {
      packages = forAllSystems (
        {
          pkgs,
          astalPkgs,
          agsPackage,
          extra,
        }:
        {
          default = pkgs.stdenv.mkDerivation {
            pname = "zorya";
            version = "0.0.1";
            src = ./.;

            nativeBuildInputs = with pkgs; [
              wrapGAppsHook4
              gobject-introspection
              agsPackage
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
        }
      );

      devShells = forAllSystems (
        {
          pkgs,
          agsPackage,
          extra,
          ...
        }:
        {
          default = pkgs.mkShell {
            buildInputs = [ (agsPackage.override { extraPackages = extra; }) ];
          };
        }
      );

      homeManagerModules.default = import ./hm-module.nix self;
    };
}
