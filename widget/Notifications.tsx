import Notifd from "gi://AstalNotifd";
import GLib from "gi://GLib";
import { config } from "@lib/config";
import type { Corner } from "@lib/types";
import { createState, For, onCleanup } from "ags";
import { type Gdk as AGdk, Astal } from "ags/gtk4";
import app from "ags/gtk4/app";

const notifd = Notifd.get_default();
const cfg = config.notifications;

// gtk enum ints, so the markup never imports gi://Gtk
const VERTICAL = 1;
const ALIGN_START = 1;
const ALIGN_END = 2;

const { TOP, BOTTOM, LEFT, RIGHT } = Astal.WindowAnchor;
const CORNER: Record<Corner, { anchor: number; valign: number }> = {
	"top-left": { anchor: TOP | LEFT, valign: ALIGN_START },
	"top-right": { anchor: TOP | RIGHT, valign: ALIGN_START },
	"bottom-left": { anchor: BOTTOM | LEFT, valign: ALIGN_END },
	"bottom-right": { anchor: BOTTOM | RIGHT, valign: ALIGN_END },
};

function time(unix: number, format = "%H:%M") {
	return GLib.DateTime.new_from_unix_local(unix).format(format)!;
}

function fileExists(path: string) {
	return GLib.file_test(path, GLib.FileTest.EXISTS);
}

function urgency(n: Notifd.Notification) {
	const { LOW, CRITICAL } = Notifd.Urgency;
	if (n.urgency === LOW) {
		return "low";
	}
	if (n.urgency === CRITICAL) {
		return "critical";
	}
	return "normal";
}

function Notification({
	n,
	dismiss,
}: {
	n: Notifd.Notification;
	dismiss: () => void;
}) {
	const timer = setTimeout(dismiss, cfg.duration);
	onCleanup(() => clearTimeout(timer));

	return (
		<box
			class={`Notification ${urgency(n)}`}
			orientation={VERTICAL}
			widthRequest={cfg.width}
		>
			<button class="notif-click" onClicked={dismiss}>
				<box orientation={VERTICAL}>
					<box class="header">
						{n.appIcon && <image class="app-icon" iconName={n.appIcon} />}
						<label
							class="app-name"
							hexpand={true}
							label={n.appName || "Unknown"}
							xalign={0}
						/>
						<label class="time" label={time(n.time)} xalign={1} />
					</box>
					<box class="separator" />
					<box class="content">
						{n.image && fileExists(n.image) && (
							<image class="image" file={n.image} />
						)}
						<box orientation={VERTICAL}>
							<label class="summary" label={n.summary} xalign={0} />
							{n.body && (
								<label
									class="body"
									label={n.body}
									maxWidthChars={cfg.maxChars}
									useMarkup={true}
									wrap={true}
									xalign={0}
								/>
							)}
						</box>
					</box>
				</box>
			</button>
			{n.actions.length > 0 && (
				<box class="actions">
					{n.actions.map(({ label, id }) => (
						<button hexpand={true} onClicked={() => n.invoke(id)}>
							<label hexpand={true} label={label} />
						</button>
					))}
				</box>
			)}
		</box>
	);
}

export function Notifications(monitor: AGdk.Monitor) {
	const [notifications, setNotifications] = createState<Notifd.Notification[]>(
		[],
	);

	const dismiss = (n: Notifd.Notification) => {
		setNotifications((ns) => ns.filter((x) => x.id !== n.id));
		n.dismiss();
	};

	const notifiedHandler = notifd.connect(
		"notified",
		(_: Notifd.Notifd, id: number, replaced: boolean) => {
			const n = notifd.get_notification(id);
			if (!n) {
				return;
			}
			if (replaced && notifications.get().some((x) => x.id === id)) {
				setNotifications((ns) => ns.map((x) => (x.id === id ? n : x)));
			} else {
				setNotifications((ns) => [n, ...ns]);
			}
		},
	);
	const resolvedHandler = notifd.connect(
		"resolved",
		(_: Notifd.Notifd, id: number) => {
			setNotifications((ns) => ns.filter((x) => x.id !== id));
		},
	);
	onCleanup(() => {
		notifd.disconnect(notifiedHandler);
		notifd.disconnect(resolvedHandler);
	});

	return (
		<window
			anchor={CORNER[cfg.corner].anchor}
			application={app}
			class="Notifications"
			exclusivity={Astal.Exclusivity.NORMAL}
			gdkmonitor={monitor}
			layer={Astal.Layer.OVERLAY}
			name="notifications"
			visible={notifications((ns) => ns.length > 0)}
		>
			<box
				orientation={VERTICAL}
				spacing={8}
				valign={CORNER[cfg.corner].valign}
			>
				<For each={notifications}>
					{(n: Notifd.Notification) => (
						<Notification dismiss={() => dismiss(n)} n={n} />
					)}
				</For>
			</box>
		</window>
	);
}
