import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FinderLaunchNotifyDialog } from "../../components/learn/FinderLaunchNotify";
import { findSparkleFinderCopyViolations } from "../../lib/sparkle-finder/copy-guardrails";
import { parseFinderLaunchNotifyBody } from "../../lib/sparkle-finder/launch-notify";
import {
  buildFinderLaunchNotifyPayload,
  finderLaunchNotifyErrorMessage,
  finderLaunchNotifySavedMessage,
} from "../../lib/sparkle-finder/launch-notify-request";

const filled = {
  firstName: " Ada ",
  lastName: "Lovelace",
  email: "Ada@Example.com",
  phone: "(555) 123-4567",
  address: " 1 Sparkle Lane ",
  birthdayMonth: "10",
  birthdayDay: "31",
  favoriteGemOrStone: "Moonstone",
  favoriteMaterial: "Sterling",
  favoriteCut: "Round",
  favoriteCollection: "Classic",
  notes: "Launch list",
  tags: " collector , silver ",
  marketingConsent: true,
};

describe("Finder launch notify form", () => {
  it("posts the listed fields and leaves source and rep id to the server", () => {
    const built = buildFinderLaunchNotifyPayload(filled);

    expect(built.ok).toBe(true);
    if (!built.ok) {
      return;
    }

    expect(built.body).toEqual({
      first_name: "Ada",
      last_name: "Lovelace",
      email: "Ada@Example.com",
      phone: "(555) 123-4567",
      address: "1 Sparkle Lane",
      birthday_month: 10,
      birthday_day: 31,
      favorite_gem_or_stone: "Moonstone",
      favorite_material: "Sterling",
      favorite_cut: "Round",
      favorite_collection: "Classic",
      notes: "Launch list",
      tags: ["collector", "silver"],
      marketing_consent: true,
    });
    expect(built.body).not.toHaveProperty("source");
    expect(built.body).not.toHaveProperty("rep_id");
    expect(built.body).not.toHaveProperty("customer_audience");
    expect(built.body).not.toHaveProperty("notify_email");
    expect(built.body).not.toHaveProperty("notify_sms");
    expect(parseFinderLaunchNotifyBody(built.body).ok).toBe(true);
  });

  it("requires a name and one contact, and keeps empty optional fields off the request", () => {
    expect(buildFinderLaunchNotifyPayload({ ...filled, firstName: " " }).ok).toBe(false);
    expect(buildFinderLaunchNotifyPayload({ ...filled, email: " ", phone: " " })).toMatchObject({
      ok: false,
      error: "missing_channel",
    });
    expect(buildFinderLaunchNotifyPayload({ ...filled, birthdayMonth: "13" })).toMatchObject({
      ok: false,
      error: "invalid_birthday_month",
    });

    const emailOnly = buildFinderLaunchNotifyPayload({
      ...filled,
      phone: "",
      address: " ",
      birthdayMonth: "",
      birthdayDay: "",
      favoriteGemOrStone: "",
      favoriteMaterial: "",
      favoriteCut: "",
      favoriteCollection: "",
      notes: "",
      tags: " ",
      marketingConsent: false,
    });

    expect(emailOnly).toMatchObject({
      ok: true,
      body: {
        first_name: "Ada",
        last_name: "Lovelace",
        email: "Ada@Example.com",
        marketing_consent: false,
      },
    });
    if (!emailOnly.ok) {
      return;
    }
    expect(emailOnly.body).not.toHaveProperty("phone");
    expect(emailOnly.body).not.toHaveProperty("tags");
    expect(emailOnly.body).not.toHaveProperty("birthday_month");
  });

  it("shows every field in the open form and does not claim a message was sent", () => {
    const markup = renderToStaticMarkup(createElement(FinderLaunchNotifyDialog, { onClose: () => undefined }));

    for (const label of [
      "First name",
      "Last name",
      "Email",
      "Phone",
      "Address",
      "Birthday month",
      "Birthday day",
      "Favorite gem or stone",
      "Favorite material",
      "Favorite cut",
      "Favorite collection",
      "Notes",
      "Tags",
      "Marketing consent",
      "Email or phone",
    ]) {
      expect(markup).toContain(label);
    }

    expect(markup.match(/Required/g)?.length).toBeGreaterThanOrEqual(3);
    expect(markup).toContain('name="favorite_gem_or_stone"');
    expect(markup).toContain('name="marketing_consent"');
    expect(markup).not.toContain("rep_id");
    expect(markup).not.toContain("customer_audience");
    expect(markup).not.toContain("source");
    expect(markup).not.toMatch(/email was sent|we sent|check your inbox|mailto:/i);
    expect(finderLaunchNotifySavedMessage).toBe("You're on the list.");
    expect(finderLaunchNotifyErrorMessage).toBe("It didn't save. You can try again.");
    const source = readFileSync(new URL("../../components/learn/FinderLaunchNotify.tsx", import.meta.url), "utf8");
    expect(source).toContain("finderLaunchNotifySavedMessage");
    expect(source).toContain("finderLaunchNotifyErrorMessage");
    expect(source).toContain('fetch("/api/finder/launch-notify"');
    expect(source).not.toMatch(/email was sent|we sent|check your inbox|customer_audience|rep_id/i);
    expect(findSparkleFinderCopyViolations(markup)).toEqual([]);
  });
});
