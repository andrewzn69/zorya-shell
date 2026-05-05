import GLib from "gi://GLib"

export interface BarColors {
	background: string
	border: string
	text: string
	workspace_empty: string
	workspace_occupied: string
}

export interface BarFonts {
	size: number
	family: string
}

export interface BarSpacing {
	margin: number
	padding: number
	padding_large: number
	border_width: number
	workspace_spacing: number
	workspace_size: number
	workspace_pill_width: number
}

export interface BarLayout {
	left: string[]
	center: string[]
	right: string[]
}

export interface BarConfig {
	enabled: boolean
	layouts: Record<string, BarLayout>
	colors: BarColors
	fonts: BarFonts
	spacing: BarSpacing
}

export interface NotifColors {
	background: string
	border: string
	app: string
	summary: string
	body: string
	progress: string
}

export interface NotifFonts {
	size_app: number
	size_summary: number
	size_body: number
}

export interface NotifSpacing {
	margin: number
	padding: number
	border_width: number
}

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right"

export interface NotifConfig {
	enabled: boolean
	monitor: string
	corner: Corner
	duration: number
	width: number
	image_size: number
	max_chars: number
	colors: NotifColors
	fonts: NotifFonts
	spacing: NotifSpacing
}

export interface Config {
	version: number
	bar: BarConfig
	notifications: NotifConfig
}

function loadConfig(): Config {
	const path = GLib.build_filenamev([
		GLib.get_user_config_dir(), "ags", "config.json"
	])
	const [ok, contents] = GLib.file_get_contents(path)
	if (!ok) throw new Error(`failed to read config: ${path}`)
	return JSON.parse(new TextDecoder().decode(contents as Uint8Array)) as Config
}

export const config = loadConfig()
