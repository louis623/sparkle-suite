# Fizz Fest demo theme access

Louis's Fizz Fest demo needs every theme available for review in each environment. Check the signed-in Site Settings → Branding and visuals → Customer-facing site theme dropdown for new themes, including private ones. A public review URL alone does not exercise this workflow.

On Suite Smoke, apply the theme's normal migration and refresh the authenticated demo list using the SQL printed by `node --import tsx scripts/smoke-environment/fizz-fest-theme-access.ts`. This fixture is for the isolated Suite Smoke project and its verified Some Dude's Fizz Fest demo only. Newly cataloged themes are included automatically. Regenerate the fixture for newly introduced private themes whose owner is absent in Smoke. Live uses its existing demo entitlement and the real owner's catalog row at release.

MG-01: the signed-in Smoke database role now lists all 25 build presets (formerly 15). A transactional save passed and was rolled back. The active selection stayed Starlight Christmas Hollow. Checked the other 28 Smoke workspaces for unauthorized globe access and verified existing catalog access decisions were preserved. Live's Fizz Fest demo could select 24 of 24 released catalog themes. No Live migration, grant or appearance change. Next step: Louis selects MG-01 through the Smoke picker and checks the actual site.
