import GLib from "gi://GLib"
import defaultsRaw from "../defaults.json"

// global semantic palette - schemes fill these, components map roles to them
export interface Palette {
	background: string
	surface: string
	border: string
	muted: string
	text: string
	primary: string
	secondary: string
	tertiary: string
}

export interface Fonts {
	family: string
	size: number
}

export interface Spacing {
	margin: number
	padding: number
	border_width: number
}

export interface Theme {
	colors: Palette
	fonts: Fonts
	spacing: Spacing
}

export interface BarLayout {
	left: string[]
	center: string[]
	right: string[]
}

// bar-only spacing; the shared margin/padding/border_width come from theme
export interface BarSpacing {
	padding_large: number
	workspace_spacing: number
	workspace_size: number
	workspace_pill_width: number
}

export interface BarConfig {
	enabled: boolean
	layouts: Record<string, BarLayout>
	spacing: BarSpacing
	colors?: Partial<Palette>
	fonts?: Partial<Fonts>
}

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right"

export interface NotifFonts {
	size_app: number
	size_summary: number
	size_body: number
}

export interface NotifConfig {
	enabled: boolean
	monitor: string
	corner: Corner
	duration: number
	width: number
	image_size: number
	max_chars: number
	fonts: NotifFonts
	colors?: Partial<Palette>
	spacing?: Partial<Spacing>
}

export interface Config {
	version: number
	theme: Theme
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
	try {
		const user = JSON.parse(new TextDecoder().decode(contents as Uint8Array))
		return deepMerge(defaults, user)
	} catch (e) {
		console.error(`zorya: invalid config at ${path}, using defaults:`, e)
		return defaults
	}
}

export const config = loadConfig()
