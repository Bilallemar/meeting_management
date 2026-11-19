# Meeting Management V3 — compatibility upgrade

Four active states: Draft, Scheduled, Held, Closed. Historical Confirmed, Minutes Draft and Pending Confirmation are retained as read-only legacy workflow states to avoid data loss.

Workflow uses Meeting Manager for active-state editing and transitions. Assign Meeting Manager to each user who must manage meetings. The server also checks whether the user is the meeting-specific Chairperson or Secretary (except Administrator/System Manager). Meeting Manager has read/write/create DocPerm, but does not alone authorize editing another meeting under server validation.

CAUTION: Do not deploy without testing on a staging copy first. Compare all package files with installed app, and back up database and app. Check migration compatibility, page JS, role behavior, notification delivery, attendance and voting, and old records. Do not delete old meeting data. Do not map old states automatically.
