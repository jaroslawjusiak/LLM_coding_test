# Account deletion authorization

The user-facing call chain is:

1. AccountsController.Delete checks only that the caller is authenticated. The comment there is not the decision.
2. AccountDeletionService.DeleteAsync loads the account and calls IAccountDeletionAuthorizer.
3. AccountDeletionAuthorizationHandler makes the decision: the caller must be the owner or a SupportAdmin, and the account must not have an open billing dispute.

InactiveAccountCleanupJob deletes inactive accounts as a system job. It is not the authorization decision for a user deleting an account. LegacyAccountEndpoints and the generated AccountClient are not on this call chain.
