(function () {
    document.addEventListener("click", function (event) {
        const icon = event.target.closest(
            'a.desktop-icon[data-id="Meeting Management"]'
        );

        if (!icon) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        frappe.set_route("meeting-management-dashboard");
    }, true);
})();
