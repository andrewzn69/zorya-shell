import app from "ags/gtk4/app"
import Bar from "@widget/Bar"
import Notifications from "@widget/Notifications"
import { config } from "@lib/config"
import { loadStyle } from "@lib/style"

app.start({
	css: loadStyle(config),
	main() {
		const monitors = app.get_monitors()
		if (config.bar.enabled) monitors.forEach(Bar)
		if (config.notifications.enabled) {
			const connector = config.notifications.monitor
			const monitor = monitors.find(m => m.get_connector() === connector)
			if (!monitor) console.warn(`monitor "${connector}" not found, falling back to primary`)
			Notifications(monitor ?? monitors[0])
		}
	},
})
