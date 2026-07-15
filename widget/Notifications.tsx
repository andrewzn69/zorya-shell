import Notifd from "gi://AstalNotifd"
import Gtk from "gi://Gtk?version=4.0"
import Gdk from "gi://Gdk?version=4.0"
import GdkPixbuf from "gi://GdkPixbuf"
import GLib from "gi://GLib"
import { Astal, Gdk as AGdk } from "ags/gtk4"
import app from "ags/gtk4/app"
import { config, type Corner } from "@lib/config"

const notifd = Notifd.get_default()
const cfg = config.notifications

const CORNER: Record<Corner, { anchor: number; valign: Gtk.Align }> = {
	"top-left": { anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT, valign: Gtk.Align.START },
	"top-right": { anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT, valign: Gtk.Align.START },
	"bottom-left": { anchor: Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.LEFT, valign: Gtk.Align.END },
	"bottom-right": { anchor: Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.RIGHT, valign: Gtk.Align.END },
}

const makeLabel = (text: string, cssClass: string) => {
	const lbl = new Gtk.Label({ label: text })
	lbl.css_classes = [cssClass]
	lbl.xalign = 0
	lbl.wrap = true
	lbl.max_width_chars = cfg.max_chars
	return lbl
}

const buildMedia = (image: string | null, appIcon: string | null): Gtk.Widget | null => {
	if (image && GLib.path_is_absolute(image) && GLib.file_test(image, GLib.FileTest.EXISTS)) {
		const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(image, cfg.image_size, -1, true)
		const pic = new Gtk.Picture({ paintable: Gdk.Texture.new_for_pixbuf(pixbuf) })
		pic.css_classes = ["notif-image"]
		pic.content_fit = Gtk.ContentFit.COVER
		pic.halign = Gtk.Align.FILL
		pic.valign = Gtk.Align.FILL
		pic.width_request = cfg.image_size
		pic.height_request = 1
		return pic
	}
	if (appIcon) {
		const img = Gtk.Image.new_from_icon_name(appIcon)
		img.css_classes = ["notif-icon"]
		img.pixel_size = 32
		img.valign = Gtk.Align.CENTER
		return img
	}
	return null
}

const setupProgressAnimation = (
	progressBar: Gtk.ProgressBar,
	onExpire: () => void
): { hover: Gtk.EventControllerMotion; tickSrc: number } => {
	let startTime = GLib.get_monotonic_time()
	let hovered = false
	let timer: ReturnType<typeof setTimeout> | null = null

	const startTimer = () => {
		startTime = GLib.get_monotonic_time()
		progressBar.fraction = 1
		timer = setTimeout(onExpire, cfg.duration)
	}

	const stopTimer = () => {
		if (timer !== null) { clearTimeout(timer); timer = null }
	}

	const hover = new Gtk.EventControllerMotion()
	hover.connect("enter", () => { hovered = true; stopTimer(); progressBar.fraction = 1 })
	hover.connect("leave", () => { hovered = false; startTimer() })

	const tickSrc = progressBar.add_tick_callback((_widget: Gtk.Widget, frameClock: Gdk.FrameClock) => {
		if (!hovered) {
			const elapsed = (frameClock.get_frame_time() - startTime) / 1000
			progressBar.fraction = Math.max(0, 1 - elapsed / cfg.duration)
			if (progressBar.fraction <= 0) return false
		}
		return true
	})

	startTimer()
	return { hover, tickSrc }
}

export default function Notifications(monitor: AGdk.Monitor) {
	let listBox: Gtk.Box | null = null
	const popups = new Map<number, Gtk.Widget>()
	const glibSources = new Map<number, number>()

	const remove = (id: number) => {
		const widget = popups.get(id)
		const src = glibSources.get(id)
		if (src && widget) (widget as Gtk.Widget).remove_tick_callback(src)
		glibSources.delete(id)
		if (widget && listBox) listBox.remove(widget)
		popups.delete(id)
	}

	const dismiss = (id: number) => {
		remove(id)
		notifd.get_notification(id)?.dismiss()
	}

	const addNotif = (id: number) => {
		if (!listBox) return
		const n = notifd.get_notification(id)
		if (!n) return

		const popup = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL })
		popup.css_classes = ["notif-popup"]
		popup.width_request = cfg.width

		const click = new Gtk.GestureClick()
		click.connect("released", () => dismiss(id))
		popup.add_controller(click)

		const textContent = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 })
		textContent.css_classes = ["notif-content"]
		textContent.vexpand = true

		const header = new Gtk.Box({ spacing: 4 })
		header.css_classes = ["notif-header"]
		const appLabel = new Gtk.Label({ label: n.get_app_name() ?? "" })
		appLabel.css_classes = ["notif-app"]
		appLabel.hexpand = true
		appLabel.xalign = 0
		header.append(appLabel)
		textContent.append(header)

		const summary = n.get_summary() ?? ""
		if (summary) textContent.append(makeLabel(summary, "notif-summary"))

		const body = n.get_body() ?? ""
		if (body) textContent.append(makeLabel(body, "notif-body"))

		const progressBar = new Gtk.ProgressBar()
		progressBar.css_classes = ["notif-progress"]
		progressBar.fraction = 1

		const column = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL })
		column.hexpand = true
		column.append(textContent)
		column.append(progressBar)

		const media = buildMedia(n.get_image(), n.get_app_icon())
		if (media) {
			const row = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL })
			row.append(media)
			row.append(column)
			popup.append(row)
		} else {
			popup.append(column)
		}

		const { hover, tickSrc } = setupProgressAnimation(progressBar, () => dismiss(id))
		popup.add_controller(hover)
		glibSources.set(id, tickSrc)

		listBox.append(popup)
		popups.set(id, popup)
	}

	notifd.connect("notified", (_: Notifd.Notifd, id: number) => addNotif(id))
	notifd.connect("resolved", (_: Notifd.Notifd, id: number) => remove(id))

	return (
		<window
			visible
			name="notifications"
			class="Notifications"
			gdkmonitor={monitor}
			anchor={CORNER[cfg.corner].anchor}
			layer={Astal.Layer.OVERLAY}
			exclusivity={Astal.Exclusivity.NORMAL}
			application={app}
		>
			<box
				orientation={Gtk.Orientation.VERTICAL}
				spacing={8}
				valign={CORNER[cfg.corner].valign}
				onRealize={(self: Gtk.Box) => {
					listBox = self
					notifd.get_notifications().forEach((n: Notifd.Notification) => addNotif(n.get_id()))
				}}
			/>
		</window>
	)
}
