export const finderLaunchNotifySavedMessage = "You're on the list.";
export const finderLaunchNotifyErrorMessage = "It didn't save. You can try again.";

const requestKeys = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "address",
  "birthday_month",
  "birthday_day",
  "favorite_gem_or_stone",
  "favorite_material",
  "favorite_cut",
  "favorite_collection",
  "notes",
  "tags",
  "marketing_consent",
] as const;

export type FinderLaunchNotifyRequestKey = (typeof requestKeys)[number];

export type FinderLaunchNotifyFormInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  birthdayMonth: string;
  birthdayDay: string;
  favoriteGemOrStone: string;
  favoriteMaterial: string;
  favoriteCut: string;
  favoriteCollection: string;
  notes: string;
  tags: string;
  marketingConsent: boolean;
};

export type FinderLaunchNotifyClientError =
  | "missing_first_name"
  | "missing_last_name"
  | "missing_channel"
  | "invalid_birthday_month"
  | "invalid_birthday_day";

export type FinderLaunchNotifyRequestResult =
  | { ok: true; body: Partial<Record<FinderLaunchNotifyRequestKey, string | number | boolean | string[]>> }
  | { ok: false; error: FinderLaunchNotifyClientError };

export function finderLaunchNotifyFieldMessage(error: FinderLaunchNotifyClientError): string {
  switch (error) {
    case "missing_first_name":
      return "First name is required.";
    case "missing_last_name":
      return "Last name is required.";
    case "missing_channel":
      return "Add an email or a phone number.";
    case "invalid_birthday_month":
      return "Birthday month must be from 1 to 12.";
    case "invalid_birthday_day":
      return "Birthday day must be from 1 to 31.";
  }
}

export function buildFinderLaunchNotifyPayload(input: FinderLaunchNotifyFormInput): FinderLaunchNotifyRequestResult {
  const firstName = input.firstName.trim();
  if (!firstName) {
    return { ok: false, error: "missing_first_name" };
  }

  const lastName = input.lastName.trim();
  if (!lastName) {
    return { ok: false, error: "missing_last_name" };
  }

  const email = input.email.trim();
  const phone = input.phone.trim();
  if (!email && !phone) {
    return { ok: false, error: "missing_channel" };
  }

  const birthdayMonth = readOptionalDay(input.birthdayMonth, 1, 12);
  if (!birthdayMonth.ok) {
    return { ok: false, error: "invalid_birthday_month" };
  }

  const birthdayDay = readOptionalDay(input.birthdayDay, 1, 31);
  if (!birthdayDay.ok) {
    return { ok: false, error: "invalid_birthday_day" };
  }

  const tags = input.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const draft: Partial<Record<FinderLaunchNotifyRequestKey, string | number | boolean | string[]>> = {
    first_name: firstName,
    last_name: lastName,
    marketing_consent: input.marketingConsent,
  };

  assignText(draft, "email", email);
  assignText(draft, "phone", phone);
  assignText(draft, "address", input.address.trim());
  assignText(draft, "favorite_gem_or_stone", input.favoriteGemOrStone.trim());
  assignText(draft, "favorite_material", input.favoriteMaterial.trim());
  assignText(draft, "favorite_cut", input.favoriteCut.trim());
  assignText(draft, "favorite_collection", input.favoriteCollection.trim());
  assignText(draft, "notes", input.notes.trim());

  if (birthdayMonth.value !== null) {
    draft.birthday_month = birthdayMonth.value;
  }

  if (birthdayDay.value !== null) {
    draft.birthday_day = birthdayDay.value;
  }

  if (tags.length > 0) {
    draft.tags = tags;
  }

  const body = Object.fromEntries(requestKeys.flatMap((key) => (key in draft ? [[key, draft[key]]] : [])));
  return { ok: true, body };
}

function assignText(
  draft: Partial<Record<FinderLaunchNotifyRequestKey, string | number | boolean | string[]>>,
  key: FinderLaunchNotifyRequestKey,
  value: string,
) {
  if (value) {
    draft[key] = value;
  }
}

function readOptionalDay(
  value: string,
  min: number,
  max: number,
): { ok: true; value: number | null } | { ok: false } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }

  if (!/^\d+$/.test(trimmed)) {
    return { ok: false };
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return { ok: false };
  }

  return { ok: true, value: parsed };
}
