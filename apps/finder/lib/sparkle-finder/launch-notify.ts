export const finderLaunchNotifySource = "finder_learn_notify" as const;

export const finderLaunchNotifyTable = "sparkle_finder_launch_notify" as const;

const nameMaxLength = 80;
const emailMaxLength = 254;
const phoneMaxLength = 40;
const addressMaxLength = 400;
const favoriteMaxLength = 120;
const notesMaxLength = 2000;
const tagMaxLength = 48;
const tagMaxCount = 24;
const phoneMinDigits = 7;
const phoneMaxDigits = 15;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneCharacterPattern = /^[0-9+().\s-]+$/;

export const finderLaunchNotifyErrorCodes = [
  "invalid_json",
  "invalid_body",
  "missing_first_name",
  "missing_last_name",
  "invalid_first_name",
  "invalid_last_name",
  "missing_channel",
  "missing_email",
  "missing_phone",
  "invalid_email",
  "invalid_phone",
  "invalid_notify_email",
  "invalid_notify_sms",
  "invalid_address",
  "invalid_birthday_month",
  "invalid_birthday_day",
  "invalid_favorite_gem_or_stone",
  "invalid_favorite_material",
  "invalid_favorite_cut",
  "invalid_favorite_collection",
  "invalid_notes",
  "invalid_tags",
  "invalid_marketing_consent",
] as const;

export type FinderLaunchNotifyErrorCode = (typeof finderLaunchNotifyErrorCodes)[number];

export type FinderLaunchNotifyRow = {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  notify_email: boolean;
  notify_sms: boolean;
  address: string | null;
  birthday_month: number | null;
  birthday_day: number | null;
  favorite_gem_or_stone: string | null;
  favorite_material: string | null;
  favorite_cut: string | null;
  favorite_collection: string | null;
  notes: string | null;
  tags: string[];
  marketing_consent: boolean;
  source: typeof finderLaunchNotifySource;
};

export type FinderLaunchNotifyParseResult =
  | { ok: true; row: FinderLaunchNotifyRow }
  | { ok: false; error: FinderLaunchNotifyErrorCode };

type TextResult =
  | { ok: true; value: string | null }
  | { ok: false; error: FinderLaunchNotifyErrorCode };

export function parseFinderLaunchNotifyBody(body: unknown): FinderLaunchNotifyParseResult {
  if (!isRecord(body)) {
    return { ok: false, error: "invalid_body" };
  }

  const firstName = readRequiredName(body.first_name, "missing_first_name", "invalid_first_name");
  if (!firstName.ok) {
    return firstName;
  }

  const lastName = readRequiredName(body.last_name, "missing_last_name", "invalid_last_name");
  if (!lastName.ok) {
    return lastName;
  }

  const email = readOptionalText(body.email, "invalid_email", emailMaxLength);
  if (!email.ok) {
    return email;
  }

  const phone = readOptionalText(body.phone, "invalid_phone", phoneMaxLength);
  if (!phone.ok) {
    return phone;
  }

  const notifyEmail = readChannelFlag(body.notify_email, Boolean(email.value), "invalid_notify_email");
  if (!notifyEmail.ok) {
    return notifyEmail;
  }

  const notifySms = readChannelFlag(body.notify_sms, Boolean(phone.value), "invalid_notify_sms");
  if (!notifySms.ok) {
    return notifySms;
  }

  if (!notifyEmail.value && !notifySms.value) {
    return { ok: false, error: "missing_channel" };
  }

  const emailValue = notifyEmail.value ? normalizeEmail(email.value) : { ok: true as const, value: null };
  if (!emailValue.ok) {
    return emailValue;
  }

  const phoneValue = notifySms.value ? normalizePhone(phone.value) : { ok: true as const, value: null };
  if (!phoneValue.ok) {
    return phoneValue;
  }

  const address = readOptionalText(body.address, "invalid_address", addressMaxLength);
  if (!address.ok) {
    return address;
  }

  const birthdayMonth = readOptionalInteger(body.birthday_month, 1, 12, "invalid_birthday_month");
  if (!birthdayMonth.ok) {
    return birthdayMonth;
  }

  const birthdayDay = readOptionalInteger(body.birthday_day, 1, 31, "invalid_birthday_day");
  if (!birthdayDay.ok) {
    return birthdayDay;
  }

  const favoriteGem = readOptionalText(body.favorite_gem_or_stone, "invalid_favorite_gem_or_stone", favoriteMaxLength);
  if (!favoriteGem.ok) {
    return favoriteGem;
  }

  const favoriteMaterial = readOptionalText(body.favorite_material, "invalid_favorite_material", favoriteMaxLength);
  if (!favoriteMaterial.ok) {
    return favoriteMaterial;
  }

  const favoriteCut = readOptionalText(body.favorite_cut, "invalid_favorite_cut", favoriteMaxLength);
  if (!favoriteCut.ok) {
    return favoriteCut;
  }

  const favoriteCollection = readOptionalText(body.favorite_collection, "invalid_favorite_collection", favoriteMaxLength);
  if (!favoriteCollection.ok) {
    return favoriteCollection;
  }

  const notes = readOptionalText(body.notes, "invalid_notes", notesMaxLength);
  if (!notes.ok) {
    return notes;
  }

  const tags = readTags(body.tags);
  if (!tags.ok) {
    return tags;
  }

  const marketingConsent = readMarketingConsent(body.marketing_consent);
  if (!marketingConsent.ok) {
    return marketingConsent;
  }

  return {
    ok: true,
    row: {
      first_name: firstName.value,
      last_name: lastName.value,
      email: emailValue.value,
      phone: phoneValue.value,
      notify_email: notifyEmail.value,
      notify_sms: notifySms.value,
      address: address.value,
      birthday_month: birthdayMonth.value,
      birthday_day: birthdayDay.value,
      favorite_gem_or_stone: favoriteGem.value,
      favorite_material: favoriteMaterial.value,
      favorite_cut: favoriteCut.value,
      favorite_collection: favoriteCollection.value,
      notes: notes.value,
      tags: tags.value,
      marketing_consent: marketingConsent.value,
      source: finderLaunchNotifySource,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredName(
  value: unknown,
  missingCode: "missing_first_name" | "missing_last_name",
  invalidCode: "invalid_first_name" | "invalid_last_name",
): { ok: true; value: string } | { ok: false; error: FinderLaunchNotifyErrorCode } {
  const text = readOptionalText(value, invalidCode, nameMaxLength);
  if (!text.ok) {
    return text;
  }

  if (!text.value) {
    return { ok: false, error: missingCode };
  }

  return { ok: true, value: text.value };
}

function readOptionalText(
  value: unknown,
  invalidCode: FinderLaunchNotifyErrorCode,
  maxLength: number,
): TextResult {
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== "string") {
    return { ok: false, error: invalidCode };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }

  if (trimmed.length > maxLength) {
    return { ok: false, error: invalidCode };
  }

  return { ok: true, value: trimmed };
}

function readChannelFlag(
  value: unknown,
  inferred: boolean,
  invalidCode: "invalid_notify_email" | "invalid_notify_sms",
): { ok: true; value: boolean } | { ok: false; error: FinderLaunchNotifyErrorCode } {
  if (value === undefined || value === null) {
    return { ok: true, value: inferred };
  }

  if (typeof value !== "boolean") {
    return { ok: false, error: invalidCode };
  }

  return { ok: true, value };
}

function normalizeEmail(value: string | null): { ok: true; value: string } | { ok: false; error: "missing_email" | "invalid_email" } {
  if (!value) {
    return { ok: false, error: "missing_email" };
  }

  const email = value.toLowerCase();
  if (!emailPattern.test(email)) {
    return { ok: false, error: "invalid_email" };
  }

  return { ok: true, value: email };
}

function normalizePhone(value: string | null): { ok: true; value: string } | { ok: false; error: "missing_phone" | "invalid_phone" } {
  if (!value) {
    return { ok: false, error: "missing_phone" };
  }

  if (!phoneCharacterPattern.test(value)) {
    return { ok: false, error: "invalid_phone" };
  }

  const digits = value.replace(/\D/g, "").length;
  if (digits < phoneMinDigits || digits > phoneMaxDigits) {
    return { ok: false, error: "invalid_phone" };
  }

  return { ok: true, value };
}

function readOptionalInteger(
  value: unknown,
  min: number,
  max: number,
  invalidCode: "invalid_birthday_month" | "invalid_birthday_day",
): { ok: true; value: number | null } | { ok: false; error: FinderLaunchNotifyErrorCode } {
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    return { ok: false, error: invalidCode };
  }

  return { ok: true, value };
}

function readTags(
  value: unknown,
): { ok: true; value: string[] } | { ok: false; error: "invalid_tags" } {
  if (value === undefined || value === null) {
    return { ok: true, value: [] };
  }

  if (!Array.isArray(value) || value.length > tagMaxCount) {
    return { ok: false, error: "invalid_tags" };
  }

  const tags: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      return { ok: false, error: "invalid_tags" };
    }

    const trimmed = entry.trim();
    if (!trimmed || trimmed.length > tagMaxLength) {
      return { ok: false, error: "invalid_tags" };
    }

    tags.push(trimmed);
  }

  return { ok: true, value: tags };
}

function readMarketingConsent(
  value: unknown,
): { ok: true; value: boolean } | { ok: false; error: "invalid_marketing_consent" } {
  if (value === undefined || value === null) {
    return { ok: true, value: false };
  }

  if (typeof value !== "boolean") {
    return { ok: false, error: "invalid_marketing_consent" };
  }

  return { ok: true, value };
}
