# Integration and handoff order

The server implementation is complete. Integrate it in this order:

1. Review `src/shared` with UI developers. Agree on category-specific option
   IDs and response event handling.
2. Run mock mode and connect one complete UI Arcade loop.
3. Add Training rendering and explanations without changing engine behavior.
4. Have the database owner review the migration, then test a local Supabase
   reset with Docker.
5. Connect Supabase Auth and send bearer tokens from the UI.
6. Test durable reconnect, completion, profile, analytics, and leaderboard.
7. Protect the GitHub production environment and deploy the migration.
8. Deploy Next.js to Vercel/Azure, then configure Auth redirect URLs.
9. Replace placeholder content and run accessibility/security review.

Every phase must keep `npm run check` and `npm run build` green.
