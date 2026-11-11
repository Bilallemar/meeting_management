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

app_include_js = [
    "/assets/meeting_management/js/meeting_redirect.js"
]

fixtures = [
    {
        "dt": "Workflow",
        "filters": [
            ["name", "=", "Management Meeting Workflow"]
        ]
    },
    {
        "dt": "Role",
        "filters": [
            ["name", "=", "Meeting Participant"]
        ]
    }
]
