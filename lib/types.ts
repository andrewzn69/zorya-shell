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
	border_radius: number
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

export interface PollingConfig {
	default: number
	[widget: string]: number
}

export interface Config {
	version: number
	theme: Theme
	bar: BarConfig
	notifications: NotifConfig
	polling: PollingConfig
}
