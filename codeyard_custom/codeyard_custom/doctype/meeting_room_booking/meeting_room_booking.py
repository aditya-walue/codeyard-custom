# Copyright (c) 2026, Code Yard Private Limited and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class MeetingRoomBooking(Document):
    def validate(self):
        self.validate_times()
        self.check_overlap()
        self.set_datetime_fields()
        self.set_color()

    def validate_times(self):
        """Ensure from_time is before to_time."""
        if self.from_time and self.to_time:
            if str(self.from_time) >= str(self.to_time):
                frappe.throw("From Time must be before To Time")

    def check_overlap(self):
        """Prevent double-booking the same room at overlapping times.

        Uses the interval overlap formula:
        Two intervals [A_start, A_end) and [B_start, B_end) overlap
        if and only if A_start < B_end AND B_start < A_end.
        """
        if self.status == "Cancelled":
            return

        overlapping = frappe.db.sql(
            """
            SELECT name, room, from_time, to_time, booked_by
            FROM `tabMeeting Room Booking`
            WHERE room = %(room)s
              AND date = %(date)s
              AND name != %(name)s
              AND status = 'Booked'
              AND from_time < %(to_time)s
              AND to_time > %(from_time)s
            LIMIT 1
            """,
            {
                "room": self.room,
                "date": self.date,
                "name": self.name or "",
                "from_time": self.from_time,
                "to_time": self.to_time,
            },
            as_dict=True,
        )

        if overlapping:
            b = overlapping[0]
            frappe.throw(
                f"Room <b>{self.room}</b> is already booked from "
                f"<b>{b.from_time}</b> to <b>{b.to_time}</b> "
                f"by {b.booked_by}",
                title="Room Not Available",
            )

    def set_datetime_fields(self):
        """Compute starts_on / ends_on for Calendar View compatibility."""
        if self.date and self.from_time:
            self.starts_on = f"{self.date} {self.from_time}"
        if self.date and self.to_time:
            self.ends_on = f"{self.date} {self.to_time}"

    def set_color(self):
        """Auto-assign color based on room for calendar display.

        Add new rooms to this mapping as they are created.
        """
        room_colors = {
            "3A": "#4F46E5",  # Indigo
            "3B": "#f59e0b",  # Amber
        }
        if not self.color:
            self.color = room_colors.get(self.room, "#6366f1")
