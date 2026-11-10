import Mpris from "gi://AstalMpris";
import Gtk from "gi://Gtk?version=4.0";
import { createState } from "ags";
import { createPoll } from "ags/time";

const FRAME_MS = 16;
const SCROLL_PX_PER_FRAME = 0.5;
const START_PAUSE_MS = 1500;
const RIGHT_END_PAUSE_MS = 1500;
const LEFT_END_PAUSE_MS = 5000;
const TITLE_SHOWN_MS = 30_000;
// only for text that fits, longer text scrolls to its end once instead
const ARTIST_OR_ALBUM_SHOWN_MS = 5000;
const FADE_MS = 720;

type Phase = "waiting" | "scrolling" | "holding" | "fading-out" | "fading-in";

interface Scroller {
	label: Gtk.Label;
	window: Gtk.ScrolledWindow;
	texts: string[];
	index: number;
	phase: Phase;
	phaseMs: number;
	holdMs: number;
	offset: number;
	scrollingBack: boolean;
	remainingPauseMs: number;
	titleShownMs: number;
}

function createScroller(): Scroller {
	const label = new Gtk.Label();
	label.css_classes = ["spotify-track"];
	label.single_line_mode = true;

	const window = new Gtk.ScrolledWindow();
	window.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.NEVER);
	window.hexpand = true;
	window.set_child(label);

	return {
		label,
		window,
		texts: [],
		index: 0,
		phase: "waiting",
		phaseMs: 0,
		holdMs: 0,
		offset: 0,
		scrollingBack: false,
		remainingPauseMs: 0,
		titleShownMs: 0,
	};
}

function startPhase(scroller: Scroller, phase: Phase) {
	scroller.phase = phase;
	scroller.phaseMs = 0;
}

function startHolding(scroller: Scroller, ms: number) {
	startPhase(scroller, "holding");
	scroller.holdMs = ms;
}

function startFadeOut(scroller: Scroller) {
	scroller.label.css_classes = ["spotify-track", "faded"];
	startPhase(scroller, "fading-out");
}

function showText(scroller: Scroller, index: number) {
	scroller.index = index;
	scroller.offset = 0;
	scroller.label.label = scroller.texts[index] ?? "";
	scroller.label.css_classes = ["spotify-track"];
	if (index === 0) {
		scroller.titleShownMs = 0;
		scroller.scrollingBack = false;
		scroller.remainingPauseMs = 0;
	}
}

function restart(scroller: Scroller) {
	showText(scroller, 0);
	startPhase(scroller, "waiting");
	const adjustment = scroller.window.get_hadjustment();
	if (adjustment) {
		adjustment.value = 0;
	}
}

function setTexts(scroller: Scroller, texts: string[]) {
	const titleChanged = texts[0] !== scroller.texts[0];
	scroller.texts = texts;
	if (titleChanged) {
		restart(scroller);
	}
}

function wait(scroller: Scroller) {
	scroller.phaseMs += FRAME_MS;
	if (scroller.index === 0) {
		scroller.titleShownMs += FRAME_MS;
	}
	if (scroller.phaseMs >= START_PAUSE_MS) {
		startPhase(scroller, "scrolling");
	}
}

function bounceTitle(scroller: Scroller, maxOffset: number) {
	scroller.titleShownMs += FRAME_MS;
	if (scroller.titleShownMs >= TITLE_SHOWN_MS && scroller.texts.length > 1) {
		startFadeOut(scroller);
		return;
	}
	if (scroller.remainingPauseMs > 0) {
		scroller.remainingPauseMs -= FRAME_MS;
		return;
	}

	if (scroller.scrollingBack) {
		scroller.offset -= SCROLL_PX_PER_FRAME;
	} else {
		scroller.offset += SCROLL_PX_PER_FRAME;
	}

	if (scroller.offset >= maxOffset) {
		scroller.offset = maxOffset;
		scroller.scrollingBack = true;
		scroller.remainingPauseMs = RIGHT_END_PAUSE_MS;
	} else if (scroller.offset <= 0) {
		scroller.offset = 0;
		scroller.scrollingBack = false;
		scroller.remainingPauseMs = LEFT_END_PAUSE_MS;
	}
}

function scrollToEnd(scroller: Scroller, maxOffset: number) {
	scroller.offset += SCROLL_PX_PER_FRAME;
	if (scroller.offset >= maxOffset) {
		scroller.offset = maxOffset;
		startHolding(scroller, RIGHT_END_PAUSE_MS);
	}
}

function scroll(scroller: Scroller, maxOffset: number) {
	if (maxOffset <= 0) {
		let shownMs = ARTIST_OR_ALBUM_SHOWN_MS;
		if (scroller.index === 0) {
			shownMs = TITLE_SHOWN_MS;
		}
		startHolding(scroller, shownMs - START_PAUSE_MS);
	} else if (scroller.index === 0) {
		bounceTitle(scroller, maxOffset);
	} else {
		scrollToEnd(scroller, maxOffset);
	}
}

function hold(scroller: Scroller) {
	scroller.phaseMs += FRAME_MS;
	if (scroller.phaseMs >= scroller.holdMs && scroller.texts.length > 1) {
		startFadeOut(scroller);
	}
}

function fadeOut(scroller: Scroller) {
	scroller.phaseMs += FRAME_MS;
	if (scroller.phaseMs >= FADE_MS) {
		showText(scroller, (scroller.index + 1) % scroller.texts.length);
		startPhase(scroller, "fading-in");
	}
}

function fadeIn(scroller: Scroller) {
	scroller.phaseMs += FRAME_MS;
	if (scroller.phaseMs >= FADE_MS) {
		startPhase(scroller, "waiting");
	}
}

function onFrame(scroller: Scroller) {
	const adjustment = scroller.window.get_hadjustment();
	if (!adjustment || scroller.texts.length === 0 || adjustment.page_size <= 0) {
		return;
	}
	const maxOffset = adjustment.upper - adjustment.page_size;

	switch (scroller.phase) {
		case "waiting":
			wait(scroller);
			break;
		case "scrolling":
			scroll(scroller, maxOffset);
			break;
		case "holding":
			hold(scroller);
			break;
		case "fading-out":
			fadeOut(scroller);
			break;
		case "fading-in":
			fadeIn(scroller);
			break;
		default: {
			const unknownPhase: never = scroller.phase;
			throw new Error(`unknown spotify phase ${unknownPhase}`);
		}
	}
	adjustment.value = scroller.offset;
}

function trackTexts(player: Mpris.Player): string[] {
	if (player.playback_status !== Mpris.PlaybackStatus.PLAYING) {
		return ["Paused"];
	}
	const texts = [player.title, player.artist, player.album] as string[];
	return texts.filter(Boolean);
}

function containerClass(isPlaying: boolean) {
	if (isPlaying) {
		return "spotify-container playing";
	}
	return "spotify-container";
}

export function Spotify() {
	const player = Mpris.Player.new("spotify");
	const [isVisible, setIsVisible] = createState(false);
	const [isPlaying, setIsPlaying] = createState(false);
	const scroller = createScroller();

	const _tick = createPoll("", FRAME_MS, () => {
		onFrame(scroller);
		return "";
	});

	const update = () => {
		setIsVisible(player.available);
		if (player.available) {
			setIsPlaying(player.playback_status === Mpris.PlaybackStatus.PLAYING);
			setTexts(scroller, trackTexts(player));
		}
	};

	update();
	player.connect("notify::title", update);
	player.connect("notify::artist", update);
	player.connect("notify::album", update);
	player.connect("notify::playback-status", update);
	player.connect("notify::available", update);

	return (
		<box
			class={isPlaying(containerClass)}
			halign={Gtk.Align.CENTER}
			visible={isVisible}
		>
			{/* hidden label reads _tick, activating the createPoll timer */}
			<label label={_tick} visible={false} />
			{scroller.window}
		</box>
	);
}
