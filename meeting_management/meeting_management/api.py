import frappe


@frappe.whitelist()
def get_meeting_dashboard():
    """Return meeting statistics and recent meeting records."""

    if not frappe.has_permission("Meeting Management", "read"):
        frappe.throw(
            "You do not have permission to view meetings.",
            frappe.PermissionError,
        )

    meta = frappe.get_meta("Meeting Management")

    fields = [
        "meeting_type",
        "meeting_date",
        "start_time",
        "status",
        "workflow_state",
        "company",
        "location",
    ]

    fields = [
        field for field in fields
        if meta.has_field(field)
    ]

    records = frappe.get_list(
        "Meeting Management",
        fields=["name"] + fields,
        order_by="creation desc",
        page_length=10,
    )

    total = frappe.db.count("Meeting Management")

    status_field = (
        "workflow_state"
        if meta.has_field("workflow_state")
        else "status"
    )

    def count_by_status(value):
        return frappe.db.count(
            "Meeting Management",
            filters={status_field: value},
        )

    return {
        "total": total,
        "scheduled": count_by_status("Scheduled"),
        "pending_confirmation": count_by_status("Pending Confirmation"),
        "completed": count_by_status("Closed"),
        "meetings": records,
    }

    
@frappe.whitelist()
def get_meeting_details(meeting_name):
    """Return a meeting and its existing child-table data."""

    if not frappe.has_permission("Meeting Management", "read"):
        frappe.throw(
            "You do not have permission to view meetings.",
            frappe.PermissionError,
        )

    if not frappe.db.exists("Meeting Management", meeting_name):
        frappe.throw("Meeting not found.")

    doc = frappe.get_doc("Meeting Management", meeting_name)

    if not doc.has_permission("read"):
        frappe.throw(
            "You do not have permission to view this meeting.",
            frappe.PermissionError,
        )

    data = doc.as_dict()

    data["attachments"] = frappe.get_all(
        "File",
        filters={
            "attached_to_doctype": "Meeting Management",
            "attached_to_name": meeting_name,
        },
        fields=["name", "file_name", "file_url", "file_size"],
        order_by="creation desc",
    )

    data["activity"] = frappe.get_all(
        "Comment",
        filters={
            "reference_doctype": "Meeting Management",
            "reference_name": meeting_name,
        },
        fields=["content", "comment_by", "creation", "comment_type"],
        order_by="creation desc",
        limit=20,
    )

    return data
