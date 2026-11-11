(function () {
	window.__meeting_redirect_loaded = true;

	function check() {
		const route = (frappe.get_route && frappe.get_route()) || []; // workspace route can be ["meeting"] or ["Workspaces", "Meeting"]
		const last = (route[route.length - 1] || "").toString().toLowerCase();
		const is_workspace =
			route.length === 1 || (route[0] || "").toString().toLowerCase() === "workspaces";

		if (last === "meeting" && is_workspace) {
			setTimeout(() => frappe.set_route("meeting-management-dashboard"), 0);
		}
	}

	function init() {
		if (window.frappe && frappe.router && frappe.router.on) {
			frappe.router.on("change", check);
			check();
		} else {
			setTimeout(init, 200);
		}
	}

	init();
})();
