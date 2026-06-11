frappe.pages["room-booking"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Meeting Room Booking",
		single_column: true,
	});

	// Store reference for page show
	wrapper.room_booking_page = page;

	page.set_secondary_action(
		"Refresh",
		() => {
			if (page.calendar) page.calendar.refetchEvents();
		},
		"refresh"
	);

	// Room filter
	let room_field = page.add_field({
		fieldname: "room",
		label: "Room",
		fieldtype: "Link",
		options: "Meeting room",
		change: () => {
			if (page.calendar) page.calendar.refetchEvents();
		},
	});

	// Room color mapping - add new rooms here as needed
	const ROOM_COLORS = {
		"3A": "#4F46E5",
		"3B": "#f59e0b",
	};
	const DEFAULT_COLOR = "#6366f1";

	function getRoomColor(room) {
		return ROOM_COLORS[room] || DEFAULT_COLOR;
	}

	// Load FullCalendar from CDN (loaded once, cached by browser)
	function loadFullCalendar() {
		return new Promise((resolve, reject) => {
			if (window.FullCalendar) {
				resolve();
				return;
			}
			let script = document.createElement("script");
			script.src =
				"https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/index.global.min.js";
			script.onload = resolve;
			script.onerror = () =>
				reject(new Error("Failed to load FullCalendar"));
			document.head.appendChild(script);
		});
	}

	function initCalendar() {
		// Build room legend
		let legendHtml = '<div class="room-legend">';
		for (let [room, color] of Object.entries(ROOM_COLORS)) {
			legendHtml +=
				'<div class="room-legend-item">' +
				'<span class="room-legend-dot" style="background:' +
				color +
				'"></span>' +
				"<span>Room " +
				room +
				"</span>" +
				"</div>";
		}
		legendHtml += "</div>";
		$(page.main).html(legendHtml + '<div id="room-calendar"></div>');

		let calendarEl = document.getElementById("room-calendar");

		let calendar = new FullCalendar.Calendar(calendarEl, {
			initialView: "timeGridWeek",
			headerToolbar: {
				left: "prev,next today",
				center: "title",
				right: "timeGridWeek,timeGridDay",
			},
			slotMinTime: "08:00:00",
			slotMaxTime: "21:00:00",
			slotDuration: "00:30:00",
			allDaySlot: false,
			nowIndicator: true,
			selectable: true,
			selectMirror: true,
			editable: false,
			height: "auto",
			firstDay: 1, // Monday
			timeZone: "local",

			// Highlight business hours
			businessHours: {
				daysOfWeek: [1, 2, 3, 4, 5],
				startTime: "09:00",
				endTime: "18:00",
			},

			// Fetch events from Frappe API
			events: function (info, successCallback, failureCallback) {
				let room = room_field.get_value() || "";
				frappe.call({
					method: "codeyard_custom.api.room_booking.get_bookings",
					args: {
						start: info.startStr,
						end: info.endStr,
						room: room,
					},
					callback: function (r) {
						let events = (r.message || []).map(function (b) {
							return {
								id: b.name,
								title:
									(b.room ? b.room + " — " : "") +
									(b.purpose || "Booked"),
								start: b.date + "T" + b.from_time,
								end: b.date + "T" + b.to_time,
								color: b.color || getRoomColor(b.room),
								extendedProps: {
									room: b.room,
									booked_by: b.booked_by,
									full_name: b.full_name,
									purpose: b.purpose,
									status: b.status,
								},
							};
						});
						successCallback(events);
					},
					error: function () {
						failureCallback();
					},
				});
			},

			// Click on empty slot -> open booking dialog
			select: function (info) {
				let d = info.start;
				let pad = function (n) {
					return String(n).padStart(2, "0");
				};

				// Use local date/time (not UTC) to avoid timezone shift
				let date =
					d.getFullYear() +
					"-" +
					pad(d.getMonth() + 1) +
					"-" +
					pad(d.getDate());
				let from_time =
					pad(info.start.getHours()) +
					":" +
					pad(info.start.getMinutes()) +
					":00";
				let to_time =
					pad(info.end.getHours()) +
					":" +
					pad(info.end.getMinutes()) +
					":00";

				let preselected_room = room_field.get_value() || "";

				let dialog = new frappe.ui.Dialog({
					title: "Book Meeting Room",
					fields: [
						{
							fieldname: "room",
							label: "Room",
							fieldtype: "Link",
							options: "Meeting room",
							reqd: 1,
							default: preselected_room,
						},
						{
							fieldname: "date",
							label: "Date",
							fieldtype: "Date",
							default: date,
							reqd: 1,
							read_only: 1,
						},
						{ fieldtype: "Column Break" },
						{
							fieldname: "from_time",
							label: "From",
							fieldtype: "Time",
							default: from_time,
							reqd: 1,
						},
						{
							fieldname: "to_time",
							label: "To",
							fieldtype: "Time",
							default: to_time,
							reqd: 1,
						},
						{ fieldtype: "Section Break" },
						{
							fieldname: "purpose",
							label: "Purpose",
							fieldtype: "Small Text",
						},
					],
					primary_action_label: "Book Room",
					primary_action: function (values) {
						frappe.call({
							method: "codeyard_custom.api.room_booking.create_booking",
							args: values,
							freeze: true,
							freeze_message: "Booking room...",
							callback: function (r) {
								if (r.message) {
									frappe.show_alert(
										{
											message: __("Room {0} booked!", [
												values.room,
											]),
											indicator: "green",
										},
										5
									);
									calendar.refetchEvents();
									dialog.hide();
								}
							},
						});
					},
				});
				dialog.show();
				calendar.unselect();
			},

			// Click on event -> view details / cancel
			eventClick: function (info) {
				let props = info.event.extendedProps;
				let booking_name = info.event.id;

				let startTime = info.event.start.toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				});
				let endTime = info.event.end.toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				});

				let detailHtml =
					'<div style="padding: 8px 0; line-height: 1.8;">' +
					"<p><b>Room:</b> " +
					props.room +
					"</p>" +
					"<p><b>Booked by:</b> " +
					(props.full_name || props.booked_by) +
					"</p>" +
					"<p><b>Time:</b> " +
					startTime +
					" – " +
					endTime +
					"</p>" +
					(props.purpose
						? "<p><b>Purpose:</b> " +
							frappe.utils.escape_html(props.purpose) +
							"</p>"
						: "") +
					"<p><b>Status:</b> " +
					props.status +
					"</p>" +
					"</div>";

				let dialog = new frappe.ui.Dialog({
					title: info.event.title,
					fields: [{ fieldtype: "HTML", options: detailHtml }],
					secondary_action_label: "Open Form",
					secondary_action: function () {
						frappe.set_route(
							"Form",
							"Meeting Room Booking",
							booking_name
						);
						dialog.hide();
					},
				});

				// Show cancel button if user owns it or is admin
				if (
					(props.booked_by === frappe.session.user ||
						frappe.user.has_role("System Manager")) &&
					props.status !== "Cancelled"
				) {
					dialog.set_primary_action("Cancel Booking", function () {
						frappe.confirm(
							"Cancel this booking?",
							function () {
								frappe.call({
									method: "codeyard_custom.api.room_booking.cancel_booking",
									args: { booking_name: booking_name },
									callback: function (r) {
										if (r.message) {
											frappe.show_alert(
												{
													message:
														"Booking cancelled",
													indicator: "orange",
												},
												5
											);
											calendar.refetchEvents();
											dialog.hide();
										}
									},
								});
							}
						);
					});
					dialog.$wrapper
						.find(".btn-primary")
						.removeClass("btn-primary")
						.addClass("btn-danger");
				}

				dialog.show();
			},

			// Tooltip on hover
			eventMouseEnter: function (info) {
				let props = info.event.extendedProps;
				$(info.el).attr(
					"title",
					"Room " +
						props.room +
						"\nBy: " +
						(props.full_name || props.booked_by) +
						(props.purpose ? "\n" + props.purpose : "")
				);
			},
		});

		calendar.render();
		page.calendar = calendar;
	}

	// Initialize
	loadFullCalendar()
		.then(function () {
			initCalendar();
		})
		.catch(function (err) {
			$(page.main).html(
				'<div class="text-muted text-center" style="padding:40px">' +
					"Failed to load calendar. Please refresh the page." +
					"</div>"
			);
			console.error("FullCalendar load error:", err);
		});
};

// Refetch events when navigating back to this page
frappe.pages["room-booking"].on_page_show = function (wrapper) {
	if (wrapper.room_booking_page && wrapper.room_booking_page.calendar) {
		wrapper.room_booking_page.calendar.refetchEvents();
	}
};
