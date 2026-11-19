app_name = "meeting_management"
app_title = "Meeting Management"
app_publisher = "Bilal"
app_description = "Meeting Management System"
app_email = "bilalarab2018@gmail.com"
app_license = "mit"

required_apps = ["erpnext"]

page_js = {
    "meeting-management-dashboard": "meeting_management/page/meeting_management_dashboard/meeting_management_dashboard.js"
}

app_include_css = [
    "/assets/meeting_management/css/meeting_management.css"
]

app_include_js = ["/assets/meeting_management/js/meeting_redirect.js"]

fixtures = [
    {"dt": "Desktop Icon", "filters": [["name", "in", ["Meeting Management", "Meeting Dashboard"]]]},
{"dt": "Workflow State", "filters": [["name", "in", ["Draft", "Scheduled", "Held", "Closed", "Confirmed", "Minutes Draft", "Pending Confirmation"]]]},
   
    {
        "dt": "Workflow",
        "filters": [
            ["name", "=", "Meeting Management Workflow"]
        ]
    },
    {
        "dt": "Role",
        "filters": [
            ["name", "in", ["Meeting Participant", "Meeting Chairperson", "Meeting Secretary", "Meeting Manager"]]
        ]
    }
]

# Enforce workflow safeguards on the server, including API writes.
doc_events = {
    "Meeting": {"validate": "meeting_management.meeting_management.meeting_rules.validate_meeting",
                "on_update": "meeting_management.meeting_management.notifications.on_update"}
}

app_logo = "/assets/meeting_management/images/meeting-icon.svg"

# Meeting Management icon on the Frappe Apps screen
add_to_apps_screen = [
    {
        "name": "meeting_management",
        "logo": "/assets/meeting_management/images/meeting-icon.svg",
        "title": "Meeting Management",
        "route": "/app/meeting-management-dashboard",
    }
]
