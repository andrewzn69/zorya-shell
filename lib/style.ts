import GLib from "gi://GLib"
import { type Config } from "@lib/types"

const decoder = new TextDecoder()

const px = (v: number) => `${v}px`

function generateVariables(config: Config): string {
	const t = config.theme
	// effective styling = global theme with the component's overrides on top
	const barColors = { ...t.colors, ...config.bar.colors }
	const barFonts = { ...t.fonts, ...config.bar.fonts }
	const barSpacing = { ...t.spacing, ...config.bar.spacing }
	const n = config.notifications
	const nColors = { ...t.colors, ...n.colors }
	const nSpacing = { ...t.spacing, ...n.spacing }
	return [
		`$bar-bg: ${barColors.background};`,
		`$bar-border: ${barColors.border};`,
		`$bar-text: ${barColors.primary};`,
		`$bar-workspace-empty: ${barColors.muted};`,
		`$bar-workspace-occupied: ${barColors.primary};`,
		`$bar-font-family: "${barFonts.family}";`,
		`$bar-font-size: ${px(barFonts.size)};`,
		`$bar-margin: ${px(barSpacing.margin)};`,
		`$bar-padding: ${px(barSpacing.padding)};`,
		`$bar-padding-large: ${px(barSpacing.padding_large)};`,
		`$bar-border-width: ${px(barSpacing.border_width)};`,
		`$bar-workspace-spacing: ${px(barSpacing.workspace_spacing)};`,
		`$bar-workspace-size: ${px(barSpacing.workspace_size)};`,
		`$bar-workspace-pill-width: ${px(barSpacing.workspace_pill_width)};`,
		`$notif-bg: ${nColors.background};`,
		`$notif-fg: ${nColors.text};`,
		`$notif-critical: ${nColors.primary};`,
		`$notif-font-size-app: ${px(n.fonts.size_app)};`,
		`$notif-font-size-summary: ${px(n.fonts.size_summary)};`,
		`$notif-font-size-body: ${px(n.fonts.size_body)};`,
		`$notif-margin: ${px(nSpacing.margin)};`,
		`$notif-padding: ${px(nSpacing.padding)};`,
		`$notif-border-width: ${px(nSpacing.border_width)};`,
		`$notif-radius: ${px(nSpacing.border_radius)};`,
		`$notif-width: ${px(n.width)};`,
	].join('\n')
}

export function loadStyle(config: Config): string {
	const styleDir = GLib.getenv("ZORYA_STYLE_DIR") ?? GLib.get_current_dir()
	const tmpDir = GLib.Dir.make_tmp("zorya-XXXXXX")

	const varsPath = `${tmpDir}/_variables.scss`
	const entryPath = `${tmpDir}/entry.scss`
	const cssPath = `${tmpDir}/style.css`

	if (!GLib.file_set_contents(varsPath, generateVariables(config)))
		throw new Error(`failed to write ${varsPath}`)
	if (!GLib.file_set_contents(entryPath, `@import 'variables';\n@import 'style';`))
		throw new Error(`failed to write ${entryPath}`)

	GLib.unlink(cssPath)

	const [, , stderr, exitStatus] = GLib.spawn_command_line_sync(
		`sass --no-source-map --load-path=${tmpDir} --load-path=${styleDir} ${entryPath} ${cssPath}`
	)

	if (exitStatus !== 0) {
		const err = stderr ? decoder.decode(stderr) : "unknown error"
		throw new Error(`sass failed (exit ${exitStatus}):\n${err}`)
	}

	const [ok, bytes] = GLib.file_get_contents(cssPath)
	if (!ok) throw new Error("sass produced no output")
	return decoder.decode(bytes)
}
