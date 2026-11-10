// global semantic palette - schemes fill these, components map roles to them
export interface Palette {
	background: string;
	surface: string;
	border: string;
	muted: string;
	text: string;
	primary: string;
	secondary: string;
	tertiary: string;
}

export interface Fonts {
	family: string;
	size: number;
}

export interface Spacing {
	margin: number;
	padding: number;
	borderWidth: number;
	borderRadius: number;
}

export interface Theme {
	colors: Palette;
	fonts: Fonts;
	spacing: Spacing;
}

export interface BarLayout {
	left: string[];
	center: string[];
	right: string[];
}

// bar-only spacing; the shared margin/padding/borderWidth come from theme
export interface BarSpacing {
	paddingLarge: number;
	workspaceSpacing: number;
	workspaceSize: number;
	workspacePillWidth: number;
}

export interface BarConfig {
	enabled: boolean;
	layouts: Record<string, BarLayout>;
	spacing: BarSpacing;
	colors?: Partial<Palette>;
	fonts?: Partial<Fonts>;
}

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface NotifFonts {
	sizeApp: number;
	sizeSummary: number;
	sizeBody: number;
}

export interface NotifConfig {
	enabled: boolean;
	monitor: string;
	corner: Corner;
	duration: number;
	width: number;
	imageSize: number;
	maxChars: number;
	fonts: NotifFonts;
	colors?: Partial<Palette>;
	spacing?: Partial<Spacing>;
}

export interface PollingConfig {
	default: number;
	[widget: string]: number;
}

export interface Config {
	version: number;
	theme: Theme;
	bar: BarConfig;
	notifications: NotifConfig;
	polling: PollingConfig;
}
