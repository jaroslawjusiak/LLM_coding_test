# BUG-002

`role == "Admin" || "SuperAdmin"` is always truthy in JavaScript. formatDelivery adds a hardcoded hour instead of reading UTC.
