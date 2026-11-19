import frappe


@frappe.whitelist()
def get_meeting_dashboard():
    """Return meeting statistics and recent meeting records."""

    if not frappe.has_permission("Meeting", "read"):
        frappe.throw(
            "You do not have permission to view meetings.",
            frappe.PermissionError,
        )

    meta = frappe.get_meta("Meeting")

    fields = [
        "meeting_type",
        "meeting_date",
        "start_time",
        "status",
        "workflow_state",
        "company",
        "project",
        "location",
    ]

    fields = [field for field in fields if meta.has_field(field)]

    records = frappe.get_list(
        "Meeting",
        fields=["name"] + fields,
        order_by="creation desc",
        page_length=10,
    )

    total = frappe.db.count("Meeting")

    status_field = (
        "workflow_state"
        if meta.has_field("workflow_state")
        else "status"
    )

    def count_by_status(value):
        return frappe.db.count(
            "Meeting",
            filters={status_field: value},
        )

    # Status chart: use the actual Meeting status field.
    status_options = [
        "Draft",
        "Scheduled",
        "Held",
        "Closed",
        "Confirmed (legacy)",
        "Minutes Draft (legacy)",
        "Pending Confirmation (legacy)",
    ]

    status_rows = frappe.db.sql(
        """
        SELECT status, COUNT(*) AS total
        FROM `tabMeeting`
        GROUP BY status
        """,
        as_dict=True,
    )

    status_counts = {
        row.status: row.total
        for row in status_rows
    }

    status_chart = {
        "labels": status_options,
        "values": [status_counts.get(status.replace(" (legacy)", ""), 0) for status in status_options],
    }

    # Monthly chart: last 12 months, including months with zero meetings.
    today = frappe.utils.getdate()
    start_date = frappe.utils.add_months(today, -11).replace(day=1)

    monthly_rows = frappe.db.sql(
        """
        SELECT DATE_FORMAT(meeting_date, '%%Y-%%m') AS month,
               COUNT(*) AS total
        FROM `tabMeeting`
        WHERE meeting_date >= %s AND meeting_date <= %s
        GROUP BY DATE_FORMAT(meeting_date, '%%Y-%%m')
        ORDER BY month ASC
        """,
        (start_date, today),
        as_dict=True,
    )

    monthly_counts = {
        row.month: row.total
        for row in monthly_rows
    }

    monthly_labels = []
    monthly_values = []

    for i in range(12):
        month_date = frappe.utils.add_months(start_date, i)
        month_key = month_date.strftime("%Y-%m")
        monthly_labels.append(month_date.strftime("%b %Y"))
        monthly_values.append(monthly_counts.get(month_key, 0))

    return {
        "total": total,
        "draft": count_by_status("Draft"),
        "scheduled": count_by_status("Scheduled"),
        "pending_confirmation": count_by_status("Held"),
        "completed": count_by_status("Closed"),
        "historical": sum(count_by_status(x) for x in ("Confirmed", "Minutes Draft", "Pending Confirmation")),
        "meetings": records,
        "status_chart": status_chart,
        "monthly_chart": {
            "labels": monthly_labels,
            "values": monthly_values,
        },
    }


@frappe.whitelist()
def get_meeting_details(meeting_name):
    """Return a meeting and its existing child-table data."""

    if not frappe.has_permission("Meeting", "read"):
        frappe.throw(
            "You do not have permission to view meetings.",
            frappe.PermissionError,
        )

    if not frappe.db.exists("Meeting", meeting_name):
        frappe.throw("Meeting not found.")

    doc = frappe.get_doc("Meeting", meeting_name)

    if not doc.has_permission("read"):
        frappe.throw(
            "You do not have permission to view this meeting.",
            frappe.PermissionError,
        )

    data = doc.as_dict()

    # Current logged-in user's Employee record.
    current_employee = frappe.db.get_value(
        "Employee",
        {"user_id": frappe.session.user, "status": "Active"},
        "name",
    )

    is_admin = (
        frappe.session.user == "Administrator"
        or "System Manager" in frappe.get_roles()
    )

    participant_ids = [p.member for p in doc.participants]

    data["current_employee"] = current_employee
    data["can_vote"] = bool(
        current_employee and current_employee in participant_ids
    )
    data["is_vote_admin"] = is_admin
    data["can_respond_attendance"] = bool(
        doc.workflow_state == "Scheduled"
        and any(
            p.member == current_employee
            and p.confirmation == "Pending"
            for p in doc.participants
        )
    )
    data["can_finalize_decisions"] = bool(
        meeting_name and doc.workflow_state == "Held"
        and (is_admin or any(p.member == current_employee and p.role in ("Chairperson", "Secretary") for p in doc.participants))
    )

    # Build one response row for every participant × decision.
    # Missing database rows are presented as Pending.
    existing_votes = {
        (row.member, row.decision_id): row
        for row in doc.confirmation
        if row.member and row.get("decision_id")
    }

    all_votes = []
    vote_summary = []

    for decision in doc.decisions:
        approved = 0
        rejected = 0
        pending = 0

        for participant in doc.participants:
            key = (participant.member, decision.name)
            saved = existing_votes.get(key)

            response = saved.response if saved else "Pending"

            if response == "Approved":
                approved += 1
            elif response == "Rejected":
                rejected += 1
            else:
                pending += 1

            employee_name = (
                frappe.db.get_value(
                    "Employee", participant.member, "employee_name"
                )
                or participant.member
            )

            all_votes.append({
                "member": participant.member,
                "member_name": employee_name,
                "decision": decision.decision,
                "decision_id": decision.name,
                "response": response,
                "response_date": saved.response_date if saved else None,
                "comment": saved.comment if saved else None,
            })

        vote_summary.append({
            "decision_id": decision.name,
            "approved": approved,
            "rejected": rejected,
            "pending": pending,
            "total": len(doc.participants),
        })

    # Participants can see their own responses.
    # Administrator/System Manager can see everyone's responses.
    if is_admin:
        data["confirmation"] = all_votes
    else:
        data["confirmation"] = [
            row for row in all_votes
            if current_employee and row["member"] == current_employee
        ]

    data["vote_summary"] = vote_summary

    data["attachments"] = frappe.get_all(
        "File",
        filters={
            "attached_to_doctype": "Meeting",
            "attached_to_name": meeting_name,
        },
        fields=["name", "file_name", "file_url", "file_size"],
        order_by="creation desc",
    )

    data["activity"] = frappe.get_all(
        "Comment",
        filters={
            "reference_doctype": "Meeting",
            "reference_name": meeting_name,
        },
        fields=["content", "comment_by", "creation", "comment_type"],
        order_by="creation desc",
        limit=20,
    )

    return data


@frappe.whitelist()
def submit_decision_vote(meeting_name, decision_id, response, comment=None):
    """Record only the logged-in participant's vote, without saving the parent Meeting."""
    if frappe.session.user == "Guest":
        frappe.throw("Please log in to vote.", frappe.PermissionError)
    if response not in ("Approved", "Rejected"):
        frappe.throw("Select Approved or Rejected.")
    if comment and len(comment) > 2000:
        frappe.throw("Comment is too long (maximum 2000 characters).")

    meeting = frappe.get_doc("Meeting", meeting_name)
    if not meeting.has_permission("read"):
        frappe.throw("You cannot access this meeting.", frappe.PermissionError)
    if meeting.workflow_state != "Held":
        frappe.throw("Voting is available only while Held.")

    employee = frappe.db.get_value("Employee", {"user_id": frappe.session.user, "status": "Active"}, "name")
    if not employee or employee not in [p.member for p in meeting.participants]:
        frappe.throw("Only meeting participants can vote.", frappe.PermissionError)
    decision = next((d for d in meeting.decisions if d.name == decision_id), None)
    if not decision:
        frappe.throw("Decision does not belong to this meeting.")

    # Lock the meeting row to serialize simultaneous submissions for this meeting.
    frappe.db.sql("SELECT name FROM `tabMeeting` WHERE name=%s FOR UPDATE", meeting_name)
    if frappe.db.get_value("Meeting", meeting_name, "workflow_state") != "Held":
        frappe.throw("Voting is closed for this meeting.")
    # Re-read after locking to avoid acting on stale decisions or membership.
    meeting = frappe.get_doc("Meeting", meeting_name)
    if employee not in [p.member for p in meeting.participants]:
        frappe.throw("You are no longer a participant.", frappe.PermissionError)
    decision = next((d for d in meeting.decisions if d.name == decision_id), None)
    if not decision:
        frappe.throw("Decision no longer belongs to this meeting.")
    if decision.status in ("Approved", "Rejected"):
        frappe.throw("Chairperson has finalized this decision; votes are locked.")
    existing_rows = frappe.get_all("Meeting Confirmation", filters={
        "parent": meeting_name, "parenttype": "Meeting", "parentfield": "confirmation",
        "member": employee, "decision_id": decision_id,
    }, pluck="name")
    if len(existing_rows) > 1:
        frappe.throw("Duplicate votes exist. Contact an administrator before continuing.")
    existing = existing_rows[0] if existing_rows else None
    values = {
        "member": employee, "decision": decision.decision,
        "decision_id": decision_id, "response": response,
        "response_date": frappe.utils.now_datetime(),
        "comment": comment or "", "meeting": meeting_name,
    }
    if existing:
        frappe.throw(
            "You have already voted on this decision. Your vote cannot be changed.",
            frappe.PermissionError
        )
    else:
        frappe.get_doc({
            "doctype": "Meeting Confirmation", "parent": meeting_name,
            "parenttype": "Meeting", "parentfield": "confirmation", **values,
        }).insert(ignore_permissions=True)
    return {"success": True, "message": "Your vote has been saved.", "response": response}


@frappe.whitelist()
def finalize_meeting_decision(meeting_name, decision_id, final_status):
    """Chairperson decides after all participants have recorded their responses."""
    if final_status not in ("Approved", "Rejected"):
        frappe.throw("Final status must be Approved or Rejected.")
    from meeting_management.meeting_management.meeting_rules import (
        employee_for_user, is_admin, managers, vote_summary,
    )
    frappe.db.sql("SELECT name FROM `tabMeeting` WHERE name=%s FOR UPDATE", meeting_name)
    meeting = frappe.get_doc("Meeting", meeting_name)
    if not meeting.has_permission("read"):
        frappe.throw("You cannot access this meeting.", frappe.PermissionError)
    if meeting.workflow_state != "Held":
        frappe.throw("Decisions may only be finalized while Held.")
    if not is_admin() and employee_for_user() not in managers(meeting):
        frappe.throw("Only this meeting's Secretary or Chairperson can finalize decisions.", frappe.PermissionError)
    decision = next((d for d in meeting.decisions if d.name == decision_id), None)
    if not decision:
        frappe.throw("Decision does not belong to this meeting.")
    if not members_present(meeting):
        frappe.throw("Meeting must have participants and a decision.")
    members, _, votes = vote_summary(meeting)
    if any(votes.get((m, decision_id)) not in ("Approved", "Rejected") for m in members):
        frappe.throw("All participants must vote before Chairperson final approval.")
    # Recheck every vote under the meeting lock before finalization.
    # Update only the decision child row; no unrelated meeting fields are modified.
    frappe.db.set_value("Meeting Decision", decision_id, "status", final_status)
    return {"success": True, "message": "Final decision recorded.", "status": final_status}


def members_present(meeting):
    return bool([p.member for p in meeting.participants] and meeting.decisions)


def _notify(user, subject, body, meeting_name):
    if not user or user == "Guest":
        return
    frappe.get_doc({
        "doctype": "Notification Log", "subject": subject, "for_user": user,
        "type": "Alert", "document_type": "Meeting", "document_name": meeting_name,
        "email_content": body,
    }).insert(ignore_permissions=True)

@frappe.whitelist()
def respond_attendance(meeting_name, response):
    """Each participant confirms or declines attendance while Scheduled."""
    if response not in ("Confirmed", "Rejected"):
        frappe.throw("Select Confirmed or Rejected.")
    if frappe.session.user == "Guest":
        frappe.throw("Login required.", frappe.PermissionError)
    frappe.db.sql("SELECT name FROM `tabMeeting` WHERE name=%s FOR UPDATE", meeting_name)
    meeting = frappe.get_doc("Meeting", meeting_name)
    if not meeting.has_permission("read") or meeting.workflow_state != "Scheduled":
        frappe.throw("Attendance responses are available only for scheduled meetings.",
                     frappe.PermissionError)
    employee = frappe.db.get_value("Employee", {"user_id": frappe.session.user,
                                                "status": "Active"}, "name")
    rows = [p for p in meeting.participants if p.member == employee]
    if len(rows) != 1:
        frappe.throw("Only a meeting participant can respond.", frappe.PermissionError)
    frappe.db.set_value("Meeting Participant", rows[0].name,
                        {"confirmation": response, "confirmed_on": frappe.utils.now_datetime()})
    return {"success": True, "response": response}


@frappe.whitelist()
def get_task_dashboard():
    """Task statistics from meetings readable by the current user."""
    from frappe.utils import getdate, today

    meetings = frappe.get_list(
        "Meeting",
        fields=["name"],
        limit_page_length=0,
    )

    counts = {
        "total": 0,
        "open": 0,
        "working": 0,
        "completed": 0,
        "overdue": 0,
    }

    overdue_tasks = []
    current_date = getdate(today())

    for meeting in meetings:
        doc = frappe.get_doc("Meeting", meeting.name)

        if not frappe.has_permission("Meeting", "read", doc=doc):
            continue

        for item in doc.get("action_items") or []:
            counts["total"] += 1

            status = item.status or "Open"

            if status == "Open":
                counts["open"] += 1
            elif status == "Working":
                counts["working"] += 1
            elif status == "Completed":
                counts["completed"] += 1

            if (
                status != "Completed"
                and item.deadline
                and getdate(item.deadline) < current_date
            ):
                counts["overdue"] += 1
                overdue_tasks.append({
                    "task": item.task,
                    "assignee": item.assignee,
                    "deadline": str(item.deadline),
                    "days_overdue": (current_date - getdate(item.deadline)).days,
                    "meeting": meeting.name,
                    "status": status,
                })

    overdue_tasks.sort(
        key=lambda x: x["days_overdue"],
        reverse=True
    )
    counts["overdue_tasks"] = overdue_tasks
    return counts
