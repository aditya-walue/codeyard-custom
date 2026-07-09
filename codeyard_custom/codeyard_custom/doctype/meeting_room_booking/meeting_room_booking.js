// Copyright (c) 2026, Code Yard Private Limited and contributors
// For license information, please see license.txt

frappe.ui.form.on("Meeting Room Booking", {
	refresh(frm) {
		// If the booking exists and the logged-in user is not the booking owner (and not a system manager/admin)
		if (!frm.is_new()) {
			const user = frappe.session.user;
			const is_admin = frappe.user_roles.includes("System Manager") || frappe.user_roles.includes("Meeting Room Admin");

			if (frm.doc.booked_by && user !== frm.doc.booked_by && !is_admin) {
				frm.disable_form();
			}
		}
	},
});
