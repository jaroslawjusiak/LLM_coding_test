# SPEC-003

Real chain: AccountsController.Delete -> AccountDeletionService.DeleteAsync -> AccountDeletionAuthorizationHandler. The handler denies non-owners who are not SupportAdmin, and denies an open billing dispute. InactiveAccountCleanupJob deletes without that decision.
