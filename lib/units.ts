const KIB = 1024;
const MIB = KIB * KIB;
const GIB = MIB * KIB;
const TIB = GIB * KIB;

const UNITS = [
	{ suffix: "TiB", scale: TIB },
	{ suffix: "GiB", scale: GIB },
	{ suffix: "MiB", scale: MIB },
	{ suffix: "KiB", scale: KIB },
];

export function formatBytes(bytes: number, decimals = 1): string {
	for (const u of UNITS) {
		if (bytes >= u.scale) {
			return `${(bytes / u.scale).toFixed(decimals)} ${u.suffix}`;
		}
	}
	return `${bytes.toFixed(decimals)} B`;
}

export { KIB };
