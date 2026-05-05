import GLib from "gi://GLib"
import { type Config } from "@lib/config"

const decoder = new TextDecoder()

const px = (v: number) => `${v}px`

function generateVariables(config: Config): string {
	const b = config.bar
	const n = config.notifications
	return [
		`$bar-bg: ${b.colors.background};`,
		`$bar-border: ${b.colors.border};`,
		`$bar-text: ${b.colors.text};`,
		`$bar-workspace-empty: ${b.colors.workspace_empty};`,
		`$bar-workspace-occupied: ${b.colors.workspace_occupied};`,
		`$bar-font-family: "${b.fonts.family}";`,
		`$bar-font-size: ${px(b.fonts.size)};`,
		`$bar-margin: ${px(b.spacing.margin)};`,
		`$bar-padding: ${px(b.spacing.padding)};`,
		`$bar-padding-large: ${px(b.spacing.padding_large)};`,
		`$bar-border-width: ${px(b.spacing.border_width)};`,
		`$bar-workspace-spacing: ${px(b.spacing.workspace_spacing)};`,
		`$bar-workspace-size: ${px(b.spacing.workspace_size)};`,
		`$bar-workspace-pill-width: ${px(b.spacing.workspace_pill_width)};`,
		`$notif-bg: ${n.colors.background};`,
		`$notif-border: ${n.colors.border};`,
		`$notif-color-app: ${n.colors.app};`,
		`$notif-color-summary: ${n.colors.summary};`,
		`$notif-color-body: ${n.colors.body};`,
		`$notif-color-progress: ${n.colors.progress};`,
		`$notif-font-size-app: ${px(n.fonts.size_app)};`,
		`$notif-font-size-summary: ${px(n.fonts.size_summary)};`,
		`$notif-font-size-body: ${px(n.fonts.size_body)};`,
		`$notif-margin: ${px(n.spacing.margin)};`,
		`$notif-padding: ${px(n.spacing.padding)};`,
		`$notif-border-width: ${px(n.spacing.border_width)};`,
		`$notif-width: ${px(n.width)};`,
	].join('\n')
}

export function loadStyle(config: Config): string {
	const configDir = GLib.build_filenamev([GLib.get_user_config_dir(), "ags"])
	const tmpDir = "/tmp/ags"

	GLib.mkdir_with_parents(tmpDir, 0o755)

	const varsPath = `${tmpDir}/_variables.scss`
	const entryPath = `${tmpDir}/entry.scss`
	const cssPath = `${tmpDir}/style.css`

	if (!GLib.file_set_contents(varsPath, generateVariables(config)))
		throw new Error(`failed to write ${varsPath}`)
	if (!GLib.file_set_contents(entryPath, `@import 'variables';\n@import 'style';`))
		throw new Error(`failed to write ${entryPath}`)

	GLib.unlink(cssPath)

	const [, , stderr, exitStatus] = GLib.spawn_command_line_sync(
		`sass --no-source-map --load-path=${tmpDir} --load-path=${configDir} ${entryPath} ${cssPath}`
	)

	if (exitStatus !== 0) {
		const err = stderr ? decoder.decode(stderr) : "unknown error"
		throw new Error(`sass failed (exit ${exitStatus}):\n${err}`)
	}

	const [ok, bytes] = GLib.file_get_contents(cssPath)
	if (!ok) throw new Error("sass produced no output")
	return decoder.decode(bytes)
}
