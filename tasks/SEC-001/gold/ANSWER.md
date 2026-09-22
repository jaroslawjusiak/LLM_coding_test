# Findings

1. SQL injection: UserLookup builds a query by interpolating the name. An attacker can change the query. Use a parameter.
2. Path traversal: DocumentStore combines the upload directory with the raw file name. A name such as ../secret can escape the directory. Use only the file name and reject paths outside the root.
3. Authorization: AdminController returns admin data to any authenticated user. Require the Admin role.
4. Sensitive logging: Login failed logs the password. Log the username only.
5. Cross-site scripting: CommentBody uses dangerouslySetInnerHTML for comment text. Render escaped text instead.
