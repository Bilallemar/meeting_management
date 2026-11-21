frappe.pages["meeting-management-dashboard"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Meeting Management",
		single_column: true,
	});

	if (!document.getElementById("meeting-management-custom-css")) {
		const link = document.createElement("link");
		link.id = "meeting-management-custom-css";
		link.rel = "stylesheet";
		link.href = "/assets/meeting_management/css/meeting_management.css?v=1794921627";
		document.head.appendChild(link);
	}
	const ICONS = {
		total: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>',
		calendar:
			'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
		clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
		check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>',
	};
	const icon = (name) =>
		`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
	$(page.main).html(`

<style>
.meeting-section-title {
    font-size: 17px;
    font-weight: 600;
    margin: 20px 0 12px;
    padding-left: 10px;
    border-left: 3px solid #4f46e5;
}
#tasks-overview, #meetings-overview {
    margin-bottom: 18px;
}
</style>

<div class="meeting-dashboard meeting-dashboard-split">



    <div class="meeting-overview-panel meeting-tasks-panel">
<h4 class="meeting-section-title">Tasks Overview</h4>
<div id="tasks-overview">
        <div class="meeting-dashboard-stats">
            <div class="meeting-stat-card"><div class="meeting-stat-body"><span>Total Tasks</span><h3 id="task-total">—</h3></div></div>
            <div class="meeting-stat-card"><div class="meeting-stat-body"><span>Open</span><h3 id="task-open">—</h3></div></div>
            <div class="meeting-stat-card"><div class="meeting-stat-body"><span>Working</span><h3 id="task-working">—</h3></div></div>
            <div class="meeting-stat-card"><div class="meeting-stat-body"><span>Completed</span><h3 id="task-completed">—</h3></div></div>
            <div class="meeting-stat-card"><div class="meeting-stat-body"><span>Overdue</span><h3 id="task-overdue">—</h3><small>Click to view overdue tasks</small></div></div>
        </div>
        <div class="meeting-dashboard-charts">
            <div class="meeting-dashboard-panel meeting-chart-panel">
                <h4>Task Status Distribution</h4>
                <div id="task-status-chart"></div><div id="task-status-legend" class="meeting-custom-legend"></div>
            </div>
            <div class="meeting-dashboard-panel meeting-chart-panel">
                <h4>Task Progress</h4>
                <div id="task-progress-chart"></div><div class="meeting-bar-labels"><span>Open</span><span>Working</span><span>Completed</span></div>
            </div>
        </div>
    </div>



</div>
<div class="meeting-overview-panel meeting-meetings-panel">
<h4 class="meeting-section-title">Meetings Overview</h4>
<div id="meetings-overview">
    <div class="meeting-dashboard-stats">
	<div class="meeting-stat-card meeting-stat--indigo">
		<div class="meeting-stat-icon">${icon("total")}</div>
		<div class="meeting-stat-body">
			<span>Total Meetings</span>
			<h3 id="total-count">—</h3>
		</div>
	</div>
	<div class="meeting-stat-card meeting-stat--blue">
		<div class="meeting-stat-icon">${icon("calendar")}</div>
		<div class="meeting-stat-body">
			<span>Scheduled</span>
			<h3 id="scheduled-count">—</h3>
		</div>
	</div>
	<div class="meeting-stat-card meeting-stat--amber">
		<div class="meeting-stat-icon">${icon("clock")}</div>
		<div class="meeting-stat-body">
			<span>Held</span>
			<h3 id="pending-count">—</h3>
		</div>
	</div>
	<div class="meeting-stat-card meeting-stat--green">
		<div class="meeting-stat-icon">${icon("check")}</div>
		<div class="meeting-stat-body">
			<span>Closed</span>
			<h3 id="closed-count">—</h3>
		</div>
	</div>

        <div class="meeting-stat-card meeting-stat--draft">
                <div class="meeting-stat-body">
                        <span>Draft Meetings</span>
                        <h3 id="draft-count">—</h3>
                </div>
        </div>
</div>

                        <div class="meeting-dashboard-charts">
                                <div class="meeting-dashboard-panel meeting-chart-panel">
                                        <h4>Meeting Status Distribution</h4>
                                        <div id="meeting-status-chart"></div><div id="meeting-status-legend" class="meeting-custom-legend"></div>
                                </div>
                                <div class="meeting-dashboard-panel meeting-chart-panel">
                                        <h4>Meetings by Month (Last 12 Months)</h4>
                                        <div id="meeting-monthly-chart"></div>
                                </div>
                        </div>




    </div>
    </div>
<div id="overdue-task-list" class="meeting-dashboard-panel"
         style="display:none;margin-top:20px;padding:20px"></div>
    <div id="meeting-details-container"></div>
		</div>
	`);







    $("#task-overdue").closest(".meeting-stat-card")
        .css("cursor", "pointer")
        .on("click", function() {
            const tasks = window.meetingOverdueTasks || [];
            const panel = $("#overdue-task-list");

            if (panel.is(":visible")) {
                panel.hide();
                return;
            }

            panel.empty();
            $("<h4>").text("Overdue Tasks").appendTo(panel);

            if (!tasks.length) {
                $("<p>").text("No overdue tasks found.").appendTo(panel);
            } else {
                const table = $('<table class="table table-bordered table-hover"></table>');
                table.append(
                    "<thead><tr><th>Task</th><th>Assignee</th><th>Deadline</th><th>Days Overdue</th><th>Meeting</th></tr></thead>"
                );

                const body = $("<tbody>").appendTo(table);

                tasks.forEach(function(t) {
                    const row = $("<tr>").appendTo(body);
                    $("<td>").text(t.task || "—").appendTo(row);
                    $("<td>").text(t.assignee || "—").appendTo(row);
                    $("<td>").text(t.deadline || "—").appendTo(row);
                    $("<td>").text(t.days_overdue).appendTo(row);

                    const meetingCell = $("<td>").appendTo(row);
                    $("<a href='#'>").text(t.meeting).on("click", function(e) {
                        e.preventDefault();
                        frappe.set_route("Form", "Meeting", t.meeting);
                    }).appendTo(meetingCell);
                });

                panel.append(table);
            }

            panel.show();
        });

load_task_dashboard();
        load_meetings();

	function create_status_badge(value) {
		const status = String(value || "").trim();
		const class_name = status
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");

		return $("<span>")
			.addClass("meeting-status")
			.addClass(`meeting-status--${class_name}`)
			.text(status || "—");
	}


    function render_chart_legend(selector, labels, values, colors) {
        const container = $(selector).empty();
        labels.forEach((label, i) => {
            if (!values[i]) return;
            const item = $('<div class="meeting-legend-item"></div>');
            $('<span class="meeting-legend-dot"></span>')
                .css("background-color", colors[i % colors.length])
                .appendTo(item);
            $('<span></span>')
                .text(label + " (" + values[i] + ")")
                .appendTo(item);
            container.append(item);
        });
    }

	function load_meetings() {
		frappe.call({
			method: "meeting_management.meeting_management.api.get_meeting_dashboard",
			callback: function (r) {
				if (r.exc || !r.message) {
					$("#meeting-list").text("Unable to load meetings.");
					return;
				}

				const data = r.message;

				$("#total-count").text(data.total ?? 0);
				$("#scheduled-count").text(data.scheduled ?? 0);
				$("#pending-count").text(data.pending_confirmation ?? 0);
				$("#closed-count").text(data.completed ?? 0);
                                $("#draft-count").text(data.draft ?? 0);

                            // Charts use real database data from the dashboard API.
                            if (typeof frappe.Chart === "function" && data.status_chart && data.monthly_chart) {
                                    new frappe.Chart("#meeting-status-chart", {
                                            data: {
                                                    labels: data.status_chart.labels,
                                                    datasets: [{ values: data.status_chart.values }]
                                            },
                                            type: "pie",
                                            height: 220,
                    showLegend: false
                                    });

                                    render_chart_legend(
        "#meeting-status-legend",
        data.status_chart.labels,
        data.status_chart.values,
        ["#f47cac", "#348bd2", "#49b978", "#a4aeb6", "#ffd078", "#f56b6b", "#8b5cf6"]
    );

    new frappe.Chart("#meeting-monthly-chart", {
                                            data: {
                                                    labels: data.monthly_chart.labels,
                                                    datasets: [{
                                                            name: "Meetings",
                                                            values: data.monthly_chart.values
                                                    }]
                                            },
                                            type: "bar",
                                            height: 280
                                    });
                            } else {
                                    $("#meeting-status-chart, #meeting-monthly-chart")
                                            .text("Chart library or chart data is unavailable.");
                            }


			},
		});
	}

	function add_section(container, title, content) {
		const section = $("<section>").addClass("meeting-dashboard-panel");
		$("<h4>").text(title).appendTo(section);
		section.append(content);
		container.append(section);
	}

	function add_info_grid(container, fields) {
		const grid = $('<div class="meeting-info-grid"></div>');

		fields.forEach(([label, value]) => {
			const item = $('<div class="meeting-info-item"></div>');
			$("<span>").addClass("meeting-info-label").text(label).appendTo(item);
			$("<div>")
				.addClass("meeting-info-value")
				.text(value || "—")
				.appendTo(item);
			grid.append(item);
		});

		container.append(grid);
	}
	function add_table(container, title, columns, records) {
		const content = $("<div>");

		if (!records || records.length === 0) {
			content.text("No records available.");
			add_section(container, title, content);
			return;
		}

		const table = $(
			'<div class="table-responsive"><table class="table table-bordered"><thead><tr></tr></thead><tbody></tbody></table></div>',
		);

		columns.forEach((column) => {
			$("<th>").text(column.label).appendTo(table.find("thead tr"));
		});

		records.forEach((record) => {
			const row = $("<tr>");

			columns.forEach((column) => {
				const cell = $("<td>");
				const value = record[column.field];

				const badge_fields = [
					"status",
					"attendance",
					"confirmation",
					"response",
					"priority",
				];

				if (badge_fields.includes(column.field) && value) {
					cell.append(create_status_badge(value));
				} else if (column.field === "confirmation_required") {
					const required = value === 1 || value === true || value === "1";

					cell.append(create_status_badge(required ? "Required" : "Not Required"));
				} else {
					cell.text(value ?? "—");
				}

				row.append(cell);
			});

			table.find("tbody").append(row);
		});

		content.append(table);
		add_section(container, title, content);
	}

	function load_meeting_details(meeting_name) {
		const container = $("#meeting-details-container");
		container.empty().text("Loading meeting details...");

		frappe.call({
			method: "meeting_management.meeting_management.api.get_meeting_details",
			args: {
				meeting_name: meeting_name,
			},
			callback: function (r) {
				if (r.exc || !r.message) {
					container
						.empty()
						.text("Unable to load meeting details. Check your permissions.");
					return;
				}

				const meeting = r.message;
				container.empty();

				const header = $('<div class="meeting-dashboard-panel"></div>');
				const header_row = $('<div class="row"></div>');
				const title_area = $('<div class="col-md-8"></div>');
				$("<h3>")
					.text(meeting.name || "Meeting Details")
					.appendTo(title_area);
				$("<p>")
					.text(
						`${meeting.company || "—"} · ${meeting.meeting_type || "—"} · ${meeting.workflow_state || meeting.status || "—"}`,
					)
					.appendTo(title_area);

				const action_area = $('<div class="col-md-4text-right"></div>');
				$("<button>")
					.addClass("btn btn-primary")
					.text("Open Full Form")
					.on("click", function () {
						frappe.set_route("Form", "Meeting", meeting.name);
					})
					.appendTo(action_area);

				$("<button>")
					.addClass("btn btn-default")
					.css("margin-left", "8px")
					.text("Close Details")
					.on("click", function () {
						container.empty();
					})
					.appendTo(action_area);

				header_row.append(title_area, action_area);
				header.append(header_row);
				container.append(header);

				// Meeting Information
				const info = $("<div>");
				add_info_grid(info, [
					["Meeting No", meeting.name],
					["Meeting Type", meeting.meeting_type],
					["Board / Department", meeting.board__department],
					["Company", meeting.company],
					["Project", meeting.project],
					["Meeting Date", meeting.meeting_date],
					["Start Time", meeting.start_time],
					["End Time", meeting.end_time],
					["Location", meeting.location],
					["Online Meeting Link", meeting.onlin_meeting_link],
					["Status", meeting.status],
					["Workflow State", meeting.workflow_state],
				]);
				add_section(container, "Meeting Information", info);

				// Four-stage meeting workflow.
				const stages = [
					"Draft",
					"Scheduled",
					"Held",
					"Closed",
				];

				const workflow = $('<div class="meeting-stepper"></div>');
				const current_state = meeting.workflow_state || meeting.status;
				const current_index = stages.indexOf(current_state);

				stages.forEach((stage, i) => {
					const state =
						i < current_index ? "done" : i === current_index ? "current" : "todo";
					const step = $(`<div class="meeting-step meeting-step--${state}"></div>`);
					$("<span>")
						.addClass("meeting-step-dot")
						.text(state === "done" ? "✓" : i + 1)
						.appendTo(step);
					$("<span>").addClass("meeting-step-label").text(stage).appendTo(step);
					workflow.append(step);
				});

				add_section(container, "Workflow Progress", workflow);

				// Quick Info
				const quick_info = $("<div>");
				add_info_grid(quick_info, [
					["Chairperson", meeting.chairperson],
					["Secretary", meeting.secretary],
					["Created By", meeting.owner],
					["Created On", meeting.creation],
					["Last Modified By", meeting.modified_by],
					["Last Modified On", meeting.modified],
				]);
				add_section(container, "Quick Info", quick_info);

				// Participants
				add_table(
					container,
					"Participants",
					[
						{ label: "Member", field: "member_name" },
						{ label: "Employee ID", field: "member" },
						{ label: "Role", field: "role" },
						{ label: "Attendance", field: "attendance" },
						{ label: "Confirmation", field: "confirmation" },
						{ label: "Confirmed On", field: "confirmed_on" },
						{ label: "Comment", field: "comment" },
					],
					meeting.participants,
				);

				// Agenda and Minutes are shown as text initially.
				// This avoids injecting untrusted HTML into the page.

				function render_rich_text(value) {
					const container = $("<div>");

					if (!value) {
						return container.text("No content available.");
					}

					// Parse the stored rich-text HTML without inserting it directly.
					const parsed = new DOMParser().parseFromString(value, "text/html");

					// Copy only safe text and basic formatting elements.
					function copy_safe_nodes(source, target) {
						source.childNodes.forEach((node) => {
							if (node.nodeType === Node.TEXT_NODE) {
								target.appendChild(document.createTextNode(node.textContent));
								return;
							}

							if (node.nodeType !== Node.ELEMENT_NODE) {
								return;
							}

							const tag = node.tagName.toLowerCase();
							const allowed_tags = [
								"p",
								"br",
								"strong",
								"b",
								"em",
								"i",
								"u",
								"ul",
								"ol",
								"li",
								"h1",
								"h2",
								"h3",
								"h4",
								"blockquote",
							];

							if (allowed_tags.includes(tag)) {
								const safe_element = document.createElement(tag);
								copy_safe_nodes(node, safe_element);
								target.appendChild(safe_element);
							} else {
								// Preserve text inside unsupported tags, but not the tags themselves.
								copy_safe_nodes(node, target);
							}
						});
					}

					copy_safe_nodes(parsed.body, container[0]);
					return container;
				}

				const agenda = render_rich_text(meeting.agenda);
				add_section(container, "Agenda", agenda);

				const minutes = render_rich_text(meeting.minutes);
				add_section(container, "Minutes", minutes);

				// Attachments
				const attachments = $("<div>");

				if (meeting.attachments && meeting.attachments.length) {
					const list = $("<ul>");

					meeting.attachments.forEach((file) => {
						const item = $("<li>");
						const link = $("<a>")
							.text(file.file_name || "Attachment")
							.attr("href", file.file_url || "#")
							.attr("target", "_blank")
							.attr("rel", "noopener noreferrer");

						item.append(link);

						if (file.file_size) {
							item.append(` (${file.file_size} bytes)`);
						}

						list.append(item);
					});

					attachments.append(list);
				} else {
					attachments.text("No attachments available.");
				}

				add_section(container, "Attachments", attachments);

				// Decisions
				add_table(
					container,
					"Decisions",
					[
						{ label: "Decision", field: "decision" },
						{ label: "Type", field: "decision_type" },
						{ label: "Responsible", field: "responsible" },
						{ label: "Priority", field: "priority" },
						{ label: "Status", field: "status" },
						{ label: "Confirmation Required", field: "confirmation_required" },
					],
					meeting.decisions,
				);


                                // Decision Voting
                                const voting_section = $("<div>");

                                if (meeting.can_respond_attendance) {
                                    const attendance_panel = $('<div class="meeting-dashboard-panel"></div>');
                                    $('<h4>').text('Confirm attendance').appendTo(attendance_panel);
                                    ['Confirmed', 'Rejected'].forEach((choice) => {
                                        $('<button class="btn btn-default btn-sm">')
                                            .text(choice === 'Confirmed' ? 'I can attend' : 'I cannot attend')
                                            .css('margin', '5px')
                                            .on('click', function () {
                                                frappe.call({
                                                    method: 'meeting_management.meeting_management.api.respond_attendance',
                                                    args: {meeting_name: meeting.name, response: choice},
                                                    callback: function (r) {
                                                        if (!r.exc) load_meeting_details(meeting.name);
                                                    }
                                                });
                                            }).appendTo(attendance_panel);
                                    });
                                    voting_section.append(attendance_panel);
                                }
                                (meeting.decisions || []).forEach((decision) => {
                                        const summary = (meeting.vote_summary || []).find(
                                                (item) => item.decision_id === decision.name
                                        ) || {};

                                        const panel = $('<div class="meeting-dashboard-panel"></div>');
                                        $("<h4>").text(decision.decision || "Decision").appendTo(panel);

                                        $("<p>").text(
                                                `Approved: ${summary.approved || 0} | Rejected: ${summary.rejected || 0} | Pending: ${summary.pending || 0}`
                                        ).appendTo(panel);

                                        const own_vote = (meeting.confirmation || []).find(
                                                (item) =>
                                                        item.decision_id === decision.name &&
                                                        item.member === meeting.current_employee
                                        );

                                        if (meeting.can_vote && (!own_vote || own_vote.response === "Pending")) {
                                                $("<p>").text(
                                                        "Your response: " + (own_vote ? own_vote.response : "Pending")
                                                ).appendTo(panel);

                                                const comment_box = $('<textarea class="form-control" rows="2" placeholder="Optional comment"></textarea>');
                                                comment_box.val(own_vote ? own_vote.comment || "" : "");
                                                panel.append(comment_box);

                                                ["Approved", "Rejected"].forEach((choice) => {
                                                        $("<button>")
                                                                .addClass(choice === "Approved" ? "btn btn-success" : choice === "Rejected" ? "btn btn-danger" : "btn btn-default")
                                                                .css("margin", "8px 8px 0 0")
                                                                .text(choice)
                                                                .on("click", function () {
                                                                        frappe.call({
                                                                                method: "meeting_management.meeting_management.api.submit_decision_vote",
                                                                                args: {
                                                                                        meeting_name: meeting.name,
                                                                                        decision_id: decision.name,
                                                                                        response: choice,
                                                                                        comment: comment_box.val()
                                                                                },
                                                                                callback: function (r) {
                                                                                        if (!r.exc && r.message && r.message.success) {
                                                                                                frappe.show_alert({
                                                                                                        message: r.message.message,
                                                                                                        indicator: "green"
                                                                                                });
                                                                                                load_meeting_details(meeting.name);
                                                                                        }
                                                                                }
                                                                        });
                                                                })
                                                                .appendTo(panel);
                                                });
                                        }

                                        if (meeting.can_finalize_decisions && (summary.pending || 0) === 0) {
                                                const final_label = $('<p>').text('Chairperson final decision: ' + (decision.status || 'Proposed'));
                                                panel.append(final_label);
                                                ['Approved', 'Rejected'].forEach((final_choice) => {
                                                        $('<button class="btn btn-default btn-sm">')
                                                                .text('Finalize: ' + final_choice)
                                                                .css('margin', '4px')
                                                                .on('click', function () {
                                                                        frappe.confirm('Record final decision as ' + final_choice + '?', () => {
                                                                                frappe.call({
                                                                                        method: 'meeting_management.meeting_management.api.finalize_meeting_decision',
                                                                                        args: {meeting_name: meeting.name, decision_id: decision.name, final_status: final_choice},
                                                                                        callback: (r) => {
                                                                                                if (!r.exc && r.message && r.message.success) {
                                                                                                        frappe.show_alert({message: r.message.message, indicator: 'green'});
                                                                                                        load_meeting_details(meeting.name);
                                                                                                }
                                                                                        }
                                                                                });
                                                                        });
                                                                }).appendTo(panel);
                                                });
                                        }
                                        voting_section.append(panel);
                                });

                                add_section(container, "Decision Voting", voting_section);

// Action Items
				add_table(
					container,
					"Action Items",
					[
						{ label: "Task", field: "task" },
						{ label: "Assignee", field: "assignee" },
						{ label: "Deadline", field: "deadline" },
						{ label: "Priority", field: "priority" },
						{ label: "Status", field: "status" },
					],
					meeting.action_items,
				);

				// Confirmation History
				add_table(
					container,
					"Confirmation History",
					[
						{ label: "Member", field: "member_name" },
						{ label: "Decision", field: "decision" },
						{ label: "Response", field: "response" },
						{ label: "Date", field: "response_date" },
						{ label: "Comment", field: "comment" },
					],
					meeting.confirmation,
				);

				// Activity / Comments
				const activity = $("<div>");

				if (meeting.activity && meeting.activity.length) {
					const list = $("<ul>");

					meeting.activity.forEach((entry) => {
						const item = $("<li>");
						item.text(
							`${entry.creation || ""} — ${entry.comment_by || "Unknown"}: ${entry.content || ""}`,
						);
						list.append(item);
					});

					activity.append(list);
				} else {
					activity.text("No activity comments available.");
				}

				add_section(container, "Activity / Comments", activity);
			},
		});
	}

    function load_task_dashboard() {
        frappe.call({
            method: "meeting_management.meeting_management.api.get_task_dashboard",
            callback: function(r) {
                if (r.exc || !r.message) {
                    frappe.show_alert({
                        message: "Unable to load task statistics",
                        indicator: "red"
                    });
                    return;
                }

                const d = r.message;
                window.meetingOverdueTasks = d.overdue_tasks || [];

                $("#task-total").text(d.total);
                $("#task-open").text(d.open);
                $("#task-working").text(d.working);
                $("#task-completed").text(d.completed);
                $("#task-overdue").text(d.overdue);

                $("#task-status-chart").empty();
                $("#task-progress-chart").empty();

                if (!d.total) {
                    $("#task-status-chart").text("No tasks available.");
                    $("#task-progress-chart").text("No tasks available.");
                    return;
                }

                new frappe.Chart("#task-status-chart", {
                    data: {
                        labels: ["Open", "Working", "Completed"],
                        datasets: [{
                            values: [d.open, d.working, d.completed]
                        }]
                    },
                    type: "pie",
                    height: 220,
                    showLegend: false
                });

                render_chart_legend(
        "#task-status-legend",
        ["Open", "Working", "Completed"],
        [d.open, d.working, d.completed],
        ["#f47cac", "#348bd2", "#49b978"]
    );

    new frappe.Chart("#task-progress-chart", {
                    data: {
                        labels: ["Open", "Working", "Completed"],
                        datasets: [{
                            name: "Tasks",
                            values: [d.open, d.working, d.completed]
                        }]
                    },
                    type: "bar",
                    height: 280
                });
            }
        });
    }

};
