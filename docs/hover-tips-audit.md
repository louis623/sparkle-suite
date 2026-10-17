# Hover tips audit

The twelve High tips below, except Bulk Collection Intake, now use the same rest-then-explain pattern as the Tools dashboard cards. Bulk Collection Intake stays Coming Soon and has no tip. The Medium and Low rows are still audit-only.

After this audit, the Tools list gained a first item labeled Dashboard. It returns to the dashboard view and is selected while that view is showing. The rows below still describe the other controls.

The six Tools dashboard subject cards (Shows, Customers, Dance Floor, Messages, Website visitors, Last month) already have delayed tips. This list is every other Workspace or Nic-Nac control where the same rest-then-explain pattern would help a non-technical rep. A tip belongs here when the label hides a consequence, or the only explanation is inside a collapsed section. Spots that already say what they do, right next to the control, are listed at the end and left alone.

Routes are the Workspace section a rep actually opens. The Tools list is `/nic-nac?section=more`; the same buttons stay in the list after a tool is open.

## High

| Page / route | Element | Draft tip |
| --- | --- | --- |
| `/nic-nac?section=live-queue` Live Lineup | Reveal next | Moves this customer to the front of your waiting lineup. It does not reveal them on Bomb Party. |
| `/nic-nac?section=live-queue` Live Lineup | Hold | Takes this order off the public waiting list and keeps it private until you return it. Bomb Party orders stay the same. |
| `/nic-nac?section=live-queue` Live Lineup | Return | Puts a held customer back at the end of the waiting lineup. |
| `/nic-nac` Nic-Nac home rail, and `/nic-nac?section=live-queue` | Customer card / Which customer? | Opens the private match for this order so you can see who it is. It does not change their place in line. |
| `/nic-nac?section=live-queue` Live Lineup | Party controls (collapsed) | Hides a party’s customers from this lineup without changing Bomb Party. Undo does not bring a hidden party back. |
| `/nic-nac?section=live-queue` Live Lineup | Recover from a private archive (collapsed) | Brings chosen customers from an earlier show into private Hold only. Recovery pauses lineup updates and clears Undo. |
| `/nic-nac?section=trade-board` Dance Floor | Remove, on a listed dancer | Takes this piece off the Dance Floor customers see, and cancels a waiting request for it. |
| `/nic-nac?section=trade-board` Dance Floor | Approve, in Request inbox | Opens a check of what they offered. Nothing is approved until you confirm in that review. |
| `/nic-nac?section=trade-board` Dance Floor | Deny, in Request inbox | Opens the same review so you can turn the request down with a reason. Nothing is denied until you confirm. |
| `/nic-nac?section=more` Tools list | Jewelry Library | Search the catalog, then add a piece to your Dance Floor so customers can request it. |
| `/nic-nac?section=trade-board` Dance Floor | Open Bulk Collection Intake › | Add a whole folder of jewelry photos, then review each piece before it goes on your Dance Floor. |
| `/nic-nac?section=more` Tools list | Wispr Flow | Optional voice typing so you can talk to Nic-Nac during a LIVE without stopping to type. |
| `/nic-nac?section=site-settings` Customer-facing site setup | Save site settings | Publishes this draft to your public site. Preview does not. |

## Medium

| Page / route | Element | Draft tip |
| --- | --- | --- |
| `/nic-nac?section=live-queue` Live Lineup | Saved connection recovery (collapsed) | Review or turn off a saved extension connection. Your Live Lineup code stays the same. |
| `/nic-nac?section=trade-board` Dance Floor | Done, on a fulfillment row | Marks this swap finished. Uncheck it to put the swap back in your open list. |
| `/nic-nac?section=jewelry-library` Jewelry Library | Add dancer | Lists this piece on your Dance Floor. Customers can request it once it is there. |
| `/nic-nac?section=customer-list` Customer List | Gone quiet | Customers who ordered during a LIVE more than 90 days ago, and not since. |
| `/nic-nac?section=customer-list` Customer List | SMS count and SMS opted in | Customers who can still get your texts. |
| `/nic-nac?section=customer-list` Customer List | Opted out count and Opted out filter | Customers who asked to stop texts or email. Do not message them. |
| `/nic-nac?section=customer-list` Customer List | Copy visible SMS / Copy visible emails | Copies only the numbers or addresses in this filter, and only for people who can still get that kind of message. |
| `/nic-nac?section=site-settings` Customer-facing site setup | Preview customer site | A look at the site. Shoppers do not see unsaved edits until you save. |
| `/nic-nac?section=site-settings` Customer-facing site setup | Show name | The public business name on your customer site, not the title of your next LIVE. |
| `/nic-nac?section=site-settings` Customer-facing site setup | Team I manage | The team you lead for Join Team and new-rep onboarding. It is not the name in your site footer. |
| `/nic-nac?section=site-settings` Customer-facing site setup | Team I belong to | The team you are a member of. Shoppers see it in the site footer. |
| `/nic-nac?section=more` Tools list | Customer-facing site setup | Edits for your public site. Shoppers do not see them until you save. |
| `/nic-nac?section=more` Tools list | Live Lineup | The waiting order for your LIVE. The Chrome extension reads Bomb Party and never places or reveals orders. |
| `/nic-nac?section=more` Tools list | Recipes | Food recipes for your customer site. Shoppers only see the ones you mark visible. |
| `/nic-nac?section=recipes` Recipes | Visible in Pantry | On means shoppers can see this recipe. Off keeps it as a draft only you see. |
| `/nic-nac?section=team-management` Team Management, when unlocked | Polish my photo, on a public team card | Optional AI touch-up for this card photo. The public card does not change until you save the photo you pick. |

## Low

| Page / route | Element | Draft tip |
| --- | --- | --- |
| `/nic-nac?section=recipes` Recipes | Slug | The end of this recipe’s web address. Leave it blank and it is made from the title. |
| `/nic-nac?section=more` Tools list | Team Management | Not open on every workspace yet. If it is locked, the page says so and nothing else changes. |

## Left alone

A tip here would only repeat a sentence the rep can already see.

- Tools dashboard subject cards. Those tips already ship.
- Business Calculator in the Tools list. The button already says Coming Soon.
- QR codes, QR flyers, business cards. The tool name is plain, and each step already has a lede, including “your live site never changes” and “Stripe checkout is required before anything prints.”
- Dance Floor Quick add. The line under the title already says what the item number does.
- Dance Floor trade follow-up. The section already says approved trades wait on ring size or catalog details.
- Live Lineup drag handle, Undo order / hold, and Copy code. Each already has a title or a sentence beside it. Undo already says it does not undo party visibility.
- Live Lineup compact rail on the Nic-Nac home. Reveal next and Hold are hidden there.
- Customer-facing site theme, hero title, hero subtitle, and the Show on your website switches. Each already has a note under the control.
- Calendar show time zone. The line beside it already says show times stay in that region.
- Message Center views. The playbook under the inbox already defines All, Team, Rep Network, Support, Sparkle Suite, and Archived.
- Nic-Nac Clear conversation. The button title already says it starts a new conversation.
- Recipe Remove. It already asks “Yes, remove recipe” before anything is deleted.
- Account, Resources & Help, Customer List, and Message Center as Tools-list names. The names are already plain.
