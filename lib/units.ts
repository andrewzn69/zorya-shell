const UNITS = [
	{ suffix: "TiB", scale: 1024 ** 4 },
	{ suffix: "GiB", scale: 1024 ** 3 },
	{ suffix: "MiB", scale: 1024 ** 2 },
	{ suffix: "KiB", scale: 1024 },
]

export function formatBytes(bytes: number, decimals = 1): string {
	for (const u of UNITS) {
		if (bytes >= u.scale) return `${(bytes / u.scale).toFixed(decimals)} ${u.suffix}`
	}
	return `${bytes.toFixed(decimals)} B`
}
