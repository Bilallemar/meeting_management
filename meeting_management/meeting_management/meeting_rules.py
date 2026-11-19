"""Four-stage meeting controls. Does not rewrite historical records."""
import re
import frappe

ACTIVE = ("Draft", "Scheduled", "Held", "Closed")
LEGACY = ("Minutes Draft", "Pending Confirmation", "Confirmed")
TRANSITIONS = {"Draft": "Scheduled", "Scheduled": "Held", "Held": "Closed"}

def _text(value):
    return re.sub(r"<[^>]*>", "", value or "").replace("&nbsp;", " ").strip()

def employee_for_user(user=None):
    return frappe.db.get_value("Employee", {"user_id": user or frappe.session.user,
                                            "status": "Active"}, "name")

def is_admin():
    return frappe.session.user == "Administrator" or "System Manager" in frappe.get_roles()

def managers(doc):
    return {p.member for p in doc.get("participants", [])
            if p.role in ("Chairperson", "Secretary") and p.member}

def require_manager(doc):
    if not is_admin() and employee_for_user() not in managers(doc):
        frappe.throw("Only this meeting's Secretary or Chairperson can manage it.",
                     frappe.PermissionError)

def vote_summary(doc):
    members = {p.member for p in doc.get("participants", []) if p.member}
    decisions = {d.name for d in doc.get("decisions", []) if d.name}
    votes = {}
    for v in doc.get("confirmation", []):
        if v.member not in members or v.decision_id not in decisions:
            frappe.throw("Unrelated vote found. Contact administrator.")
        key = (v.member, v.decision_id)
        if key in votes:
            frappe.throw("Duplicate decision vote found.")
        votes[key] = v.response
    return members, decisions, votes

def _fixed(doc):
    return (
        tuple(sorted((p.name, p.member, p.role) for p in doc.get("participants", []))),
        tuple(sorted((d.name, d.decision, d.status) for d in doc.get("decisions", []))),
        tuple(sorted((v.name, v.member, v.decision_id, v.response,
                      str(v.response_date or ""), v.comment or "")
                     for v in doc.get("confirmation", []))),
    )

def validate_meeting(doc, method=None):
    previous = doc.get_doc_before_save()
    state = doc.get("workflow_state") or "Draft"
    old = (previous.get("workflow_state") or "Draft") if previous else None
    if state not in ACTIVE + LEGACY:
        frappe.throw("Unknown workflow state.")
    if not previous:
        if state != "Draft":
            frappe.throw("New meetings must start in Draft.")
        return
    # Preserve historical records in old states; do not silently migrate them.
    if old in LEGACY:
        if state != old:
            frappe.throw("Historical workflow state requires a separate reviewed migration.")
        return
    if old == "Closed":
        frappe.throw("Closed meetings cannot be modified.")
    require_manager(doc)
    if state != old and TRANSITIONS.get(old) != state:
        frappe.throw("Invalid workflow transition: {0} -> {1}".format(old, state))
    if old == "Held" and state == "Held":
        # Existing votes cannot be overwritten/deleted through the form.
        old_votes = {v.name: (v.member, v.decision_id, v.response, v.comment)
                     for v in previous.get("confirmation", [])}
        new_votes = {v.name: (v.member, v.decision_id, v.response, v.comment)
                     for v in doc.get("confirmation", [])}
        if old_votes != new_votes:
            frappe.throw("Use the voting buttons to record votes.")
        if any(v.response in ("Approved", "Rejected") for v in previous.get("confirmation", [])):
            if tuple(sorted((p.name,p.member,p.role) for p in previous.get("participants", []))) != tuple(sorted((p.name,p.member,p.role) for p in doc.get("participants", []))):
                frappe.throw("Participants cannot change after voting begins.")
            if tuple(sorted((d.name,d.decision) for d in previous.get("decisions", []))) != tuple(sorted((d.name,d.decision) for d in doc.get("decisions", []))):
                frappe.throw("Decision text cannot change after voting begins.")
    if state != "Draft":
        members = [p.member for p in doc.get("participants", []) if p.member]
        roles = [p.role for p in doc.get("participants", [])]
        if not members or len(members) != len(set(members)):
            frappe.throw("Participants are required and must be unique.")
        if roles.count("Chairperson") != 1 or roles.count("Secretary") != 1:
            frappe.throw("Exactly one Chairperson and one Secretary are required.")
        if not _text(doc.get("agenda")):
            frappe.throw("Agenda is required before scheduling.")
    if state == "Closed":
        if not _text(doc.get("minutes")) or not doc.get("decisions"):
            frappe.throw("Minutes and at least one decision are required to close.")
        if previous and _fixed(previous) != _fixed(doc):
            frappe.throw("Do not change decisions or votes while closing.")
        members, decisions, votes = vote_summary(doc)
        for decision_id in decisions:
            if any(votes.get((member, decision_id)) not in ("Approved", "Rejected")
                   for member in members):
                frappe.throw("Every participant must vote on every decision before closing.")
        if any(d.status not in ("Approved", "Rejected") for d in doc.get("decisions", [])):
            frappe.throw("Finalize every decision before closing.")
