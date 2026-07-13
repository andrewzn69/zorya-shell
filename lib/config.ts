import GLib from "gi://GLib"
import defaultsRaw from "../defaults.json"

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

const defaults = defaultsRaw as unknown as Config

// deep-merge helper: recursively merge `override` onto `base`.
// plain objects merge key-by-key; arrays and scalars replace wholesale.
function isPlainObject(x: unknown): x is Record<string, unknown> {
	return typeof x === "object" && x !== null && !Array.isArray(x)
}

function deepMerge<T>(base: T, override: unknown): T {
	if (override === undefined || override === null) return base
	if (!isPlainObject(base) || !isPlainObject(override)) return override as T
	const result: Record<string, unknown> = { ...base }
	for (const key of Object.keys(override)) {
		result[key] = deepMerge(result[key], override[key])
	}
	return result as T
}

function loadConfig(): Config {
	const path = GLib.build_filenamev([
		GLib.get_user_config_dir(), "zorya", "config.json"
	])
	if (!GLib.file_test(path, GLib.FileTest.EXISTS)) return defaults
	const [ok, contents] = GLib.file_get_contents(path)
	if (!ok) return defaults
	const user = JSON.parse(new TextDecoder().decode(contents as Uint8Array))
	return deepMerge(defaults, user)
}

export const config = loadConfig()
