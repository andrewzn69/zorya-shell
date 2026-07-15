import GLib from "gi://GLib"
import defaultsRaw from "../defaults.json"
import { type Config } from "@lib/types"

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

export function pollInterval(name: string): number {
	return config.polling[name] ?? config.polling.default
}
