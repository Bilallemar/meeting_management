"""In-app notifications for meeting stages and action assignments."""
import frappe

def _notify(user, meeting, subject, content):
    if not user or not frappe.db.exists("User", user):
        return
    frappe.get_doc({"doctype":"Notification Log", "for_user":user, "type":"Alert",
                    "subject":subject, "email_content":content,
                    "document_type":"Meeting", "document_name":meeting}).insert(ignore_permissions=True)

def on_update(doc, method=None):
    old = doc.get_doc_before_save()
    previous_state = (old.get("workflow_state") or "Draft") if old else None
    state = doc.get("workflow_state") or "Draft"
    new_decisions = {d.name for d in doc.get("decisions", [])}
    old_decisions = {d.name for d in old.get("decisions", [])} if old else set()
    voting_ready = state == "Held" and bool(doc.get("minutes")) and bool(new_decisions) and (bool(new_decisions - old_decisions) or (old and not old.get("minutes")) )
    if (state == "Scheduled" and previous_state != state) or voting_ready:
        for p in doc.get("participants", []):
            user = frappe.db.get_value("Employee", p.member, "user_id") if p.member else None
            if user:
                subject = ("Meeting scheduled: " if state == "Scheduled" else
                           "Meeting decisions ready: ") + doc.name
                content = ("Please confirm attendance." if state == "Scheduled" else
                           "Please review the decisions and record your votes.")
                _notify(user, doc.name, subject, content)
    old_tasks = {a.name for a in old.get("action_items", [])} if old else set()
    for a in doc.get("action_items", []):
        if a.name not in old_tasks and a.assignee:
            user = frappe.db.get_value("Employee", a.assignee, "user_id")
            if user:
                _notify(user, doc.name, "Meeting task assigned: " + doc.name,
                        a.task or "You have a new meeting action item.")
