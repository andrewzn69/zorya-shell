self:
{
  config,
  lib,
  pkgs,
  ...
}:
let
  cfg = config.programs.zorya;
  json = pkgs.formats.json { };
in
{
  options.programs.zorya = {
    enable = lib.mkEnableOption "zorya shell";
    package = lib.mkOption {
      type = lib.types.package;
      default = self.packages.${pkgs.system}.default;
    };
    settings = lib.mkOption {
      type = json.type;
      default = { };
    };
  };

  config = lib.mkIf cfg.enable {
    home.packages = [ cfg.package ];
    xdg.configFile."zorya/config.json" = lib.mkIf (cfg.settings != { }) {
      source = json.generate "config.json" cfg.settings;
    };
  };
}
