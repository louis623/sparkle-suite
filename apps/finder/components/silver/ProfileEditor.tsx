"use client";

import { useActionState, useId, useRef, useState } from "react";
import { CheckCircle2, Eye, ImagePlus, LockKeyhole, Save, UserRound } from "lucide-react";
import { updateSilverProfilePreview } from "@/lib/sparkle-finder/customer-state";
import type { SparkleFinderAccountState } from "@/lib/sparkle-finder/auth";
import type { CustomerAccount, SilverProfile } from "@/lib/sparkle-finder/types";
import type { SilverSaveActionState } from "@/app/(hub)/silver/actions";
import type { ChangeEvent, PointerEvent } from "react";

type ProfileEditorProps = {
  accountState: SparkleFinderAccountState;
  canSaveSilverActions: boolean;
  customer: CustomerAccount;
  isLocalPreview: boolean;
  profile: SilverProfile;
  saveAction?: (previousState: SilverSaveActionState, formData: FormData) => Promise<SilverSaveActionState>;
};

const realAccountInitialState: SilverSaveActionState = {
  status: "idle",
  message: "Make your changes, then save your profile.",
};

const profilePhotoSourceMaxBytes = 10 * 1024 * 1024;
const profilePhotoDataUrlMaxCharacters = 700_000;
const profilePhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const profileCropFrameSize = 132;
const profileCropOutputSize = 320;
const profilePhotoDecodeTimeoutMs = 2500;

type ProfilePhotoCropState = {
  height: number;
  name: string;
  offsetX: number;
  offsetY: number;
  scale: number;
  sourceFile?: File;
  src: string;
  width: number;
};

type CropDragState = {
  crop: ProfilePhotoCropState;
  pointerX: number;
  pointerY: number;
};

type ProfileDraftState = {
  bio: string;
  displayName: string;
  tiktokHandle: string;
  visibility: SilverProfile["visibility"];
};

export function ProfileEditor({
  accountState,
  canSaveSilverActions,
  customer,
  isLocalPreview,
  profile,
  saveAction,
}: ProfileEditorProps) {
  const cropDragRef = useRef<CropDragState | null>(null);
  const [previewCustomer, setPreviewCustomer] = useState(customer);
  const [previewProfile, setPreviewProfile] = useState(profile);
  const [profileDraft, setProfileDraft] = useState<ProfileDraftState>(() => ({
    bio: profile.bio,
    displayName: customer.displayName,
    tiktokHandle: profile.tiktokHandle,
    visibility: profile.visibility,
  }));
  const [profilePhotoCrop, setProfilePhotoCrop] = useState<ProfilePhotoCropState | null>(null);
  const [selectedProfilePhoto, setSelectedProfilePhoto] = useState<{ name: string; url: string } | null>(null);
  const [profilePhotoMessage, setProfilePhotoMessage] = useState("JPG, PNG, or WebP.");
  const [localStatusMessage, setLocalStatusMessage] = useState(
    canSaveSilverActions ? "Make your changes, then save your profile." : "Sign in to save your profile.",
  );
  const [actionState, formAction, isPending] = useActionState(handleProfileFormAction, realAccountInitialState);
  const statusMessage = getProfileStatusMessage({ actionState, isLocalPreview, isPending, localStatusMessage });
  const statusTone = getStatusTone(statusMessage, actionState.status === "saved" ? "saved" : "idle");
  const profilePhotoInputId = useId();
  const activeProfilePhotoUrl = selectedProfilePhoto?.url ?? previewProfile.photoUrl;

  function updateProfileDraft<Field extends keyof ProfileDraftState>(field: Field, value: ProfileDraftState[Field]) {
    setProfileDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
    setLocalStatusMessage(canSaveSilverActions ? "Unsaved profile changes." : "Sign in to save your profile.");
  }

  async function handleProfileFormAction(
    previousState: SilverSaveActionState,
    formData: FormData,
  ): Promise<SilverSaveActionState> {
    const result = saveAction
      ? await saveAction(previousState, formData)
      : await disabledProfileAction();

    if (result.status === "saved") {
      applySavedProfileDraftFromFormData(formData);
      setLocalStatusMessage("Profile saved.");
    } else {
      setLocalStatusMessage(result.message);
    }

    return result;
  }

  function applySavedProfileDraftFromFormData(formData: FormData) {
    const displayName = String(formData.get("displayName") ?? "").trim();
    const photoUrl = String(formData.get("profilePhotoDataUrl") || "");

    setPreviewProfile((currentProfile) => ({
      ...currentProfile,
      bio: String(formData.get("bio") ?? ""),
      ...(photoUrl ? { photoUrl } : {}),
      tiktokHandle: String(formData.get("tiktokHandle") ?? ""),
      visibility: formData.get("visibility") === "sparkle_finder" ? "sparkle_finder" : "private",
    }));

    if (displayName) {
      setPreviewCustomer((currentCustomer) => ({
        ...currentCustomer,
        displayName,
      }));
    }
  }

  async function handlePreviewSave(formData: FormData) {
    setLocalStatusMessage("Saving profile...");
    const displayName = String(formData.get("displayName") ?? "").trim();

    if (!displayName) {
      setLocalStatusMessage("Display name is required.");
      return;
    }

    const profilePhoto = await readPreparedProfilePhotoDataUrl(
      formData.get("profilePhotoDataUrl"),
      formData.get("profilePhoto"),
    );

    if (!profilePhoto.ok) {
      setLocalStatusMessage(profilePhoto.message);
      return;
    }

    const result = updateSilverProfilePreview(accountState, previewProfile, {
      bio: String(formData.get("bio") ?? ""),
      displayName,
      ...(profilePhoto.photoUrl ? { photoUrl: profilePhoto.photoUrl } : {}),
      tiktokHandle: String(formData.get("tiktokHandle") ?? ""),
      visibility: formData.get("visibility") === "sparkle_finder" ? "sparkle_finder" : "private",
    });

    if (!result.ok) {
      setLocalStatusMessage("Sign in to save your profile.");
      return;
    }

    setPreviewProfile(result.profile);
    setPreviewCustomer((currentCustomer) => ({
      ...currentCustomer,
      displayName,
    }));
    setLocalStatusMessage("Profile saved.");
  }

  async function handleProfilePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      setProfilePhotoCrop(null);
      setSelectedProfilePhoto(null);
      setProfilePhotoMessage("JPG, PNG, or WebP.");
      return;
    }

    setSelectedProfilePhoto({
      name: file.name,
      url: activeProfilePhotoUrl || previewProfile.photoUrl,
    });
    setProfilePhotoMessage("Preparing preview...");
    const profilePhoto = await prepareProfilePhotoCrop(file);
    input.value = "";

    if (!profilePhoto.ok) {
      setProfilePhotoCrop(null);
      setSelectedProfilePhoto(null);
      setProfilePhotoMessage(profilePhoto.message);
      setLocalStatusMessage(profilePhoto.message);
      return;
    }

    setProfilePhotoCrop(profilePhoto.crop);
    setSelectedProfilePhoto({
      name: file.name,
      url: profilePhoto.photoUrl,
    });
    setProfilePhotoMessage("Drag photo to center, then save your profile.");
    setLocalStatusMessage("Unsaved profile photo.");
  }

  function handleCropPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!profilePhotoCrop) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    cropDragRef.current = {
      crop: profilePhotoCrop,
      pointerX: event.clientX,
      pointerY: event.clientY,
    };
    setProfilePhotoMessage("Release to keep the new center.");
  }

  function handleCropPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = cropDragRef.current;

    if (!drag) {
      return;
    }

    setProfilePhotoCrop(getDraggedCrop(drag, event.clientX, event.clientY));
  }

  async function handleCropPointerUp(event: PointerEvent<HTMLDivElement>) {
    const drag = cropDragRef.current;

    if (!drag) {
      return;
    }

    cropDragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const crop = getDraggedCrop(drag, event.clientX, event.clientY);
    setProfilePhotoCrop(crop);
    await applyProfilePhotoCrop(crop);
  }

  async function applyProfilePhotoCrop(crop: ProfilePhotoCropState) {
    const profilePhoto = await cropProfilePhoto(crop);

    if (!profilePhoto.ok) {
      setProfilePhotoMessage(profilePhoto.message);
      setLocalStatusMessage(profilePhoto.message);
      return;
    }

    setSelectedProfilePhoto({
      name: crop.name,
      url: profilePhoto.photoUrl,
    });
    setProfilePhotoMessage("Centered. Save your profile to keep it.");
    setLocalStatusMessage("Unsaved profile photo.");
  }

  return (
    <section
      className="h-fit rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper)] p-4 shadow-[var(--sparkle-shadow-sm)]"
      data-smoke="profile-editor-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sparkle-coral)]">Profile</p>
          <h2 className="mt-1 font-[family-name:var(--font-playfair)] text-3xl font-semibold text-[var(--sparkle-plum-deep)]">
            Collector Profile
          </h2>
        </div>
        <div className="grid size-16 place-items-center overflow-hidden rounded-full border border-[var(--sparkle-border)] bg-[var(--sparkle-blush-bg)] text-[var(--sparkle-plum)]">
          {activeProfilePhotoUrl ? (
            <span
              aria-label={`${previewCustomer.displayName} profile photo`}
              className="size-full bg-cover bg-center"
              role="img"
              style={{ backgroundImage: `url("${activeProfilePhotoUrl}")` }}
            />
          ) : (
            <UserRound aria-hidden="true" className="size-8" strokeWidth={1.5} />
          )}
        </div>
      </div>

      <form
        action={isLocalPreview ? handlePreviewSave : formAction}
        className="mt-4 grid gap-3"
        aria-label={isLocalPreview ? "Silver profile preview form" : "Silver profile form"}
      >
        <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
          Display name
          <input
            className="min-h-11 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper-soft)] px-3 text-sm font-normal text-[var(--sparkle-ink)]"
            maxLength={80}
            name="displayName"
            onChange={(event) => updateProfileDraft("displayName", event.target.value)}
            required
            value={profileDraft.displayName}
          />
        </label>
        <div className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
          <span>Profile photo</span>
          <input name="profilePhotoDataUrl" readOnly type="hidden" value={selectedProfilePhoto?.url ?? ""} />
          <div className="grid justify-items-center gap-2 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white px-4 py-4 text-center">
            {profilePhotoCrop ? (
              <div
                aria-label="Drag profile photo to center"
                className="relative touch-none overflow-hidden rounded-full border border-[var(--sparkle-border)] bg-[var(--sparkle-blush-bg)] text-[var(--sparkle-plum)] shadow-inner"
                onPointerDown={handleCropPointerDown}
                onPointerMove={handleCropPointerMove}
                onPointerUp={handleCropPointerUp}
                role="img"
                style={{ height: profileCropFrameSize, width: profileCropFrameSize }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt=""
                  className="pointer-events-none absolute max-w-none select-none"
                  src={profilePhotoCrop.src}
                  style={{
                    height: profilePhotoCrop.height * profilePhotoCrop.scale,
                    transform: `translate(${profilePhotoCrop.offsetX}px, ${profilePhotoCrop.offsetY}px)`,
                    width: profilePhotoCrop.width * profilePhotoCrop.scale,
                  }}
                />
              </div>
            ) : (
              <div className="grid size-14 place-items-center overflow-hidden rounded-full border border-[var(--sparkle-border)] bg-[var(--sparkle-blush-bg)] text-[var(--sparkle-plum)]">
                {activeProfilePhotoUrl ? (
                  <span
                    aria-label={`${previewCustomer.displayName} selected profile photo`}
                    className="size-full bg-cover bg-center"
                    role="img"
                    style={{ backgroundImage: `url("${activeProfilePhotoUrl}")` }}
                  />
                ) : (
                  <UserRound aria-hidden="true" className="size-7" strokeWidth={1.5} />
                )}
              </div>
            )}
            <div className="grid w-full justify-items-center gap-2">
              <input
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                id={profilePhotoInputId}
                name="profilePhoto"
                onChange={handleProfilePhotoChange}
                type="file"
              />
              <label
                className="inline-flex min-h-10 w-full max-w-48 cursor-pointer items-center justify-center gap-2 rounded-[var(--sparkle-radius-sm)] bg-[var(--sparkle-plum)] px-4 text-sm font-bold text-white transition hover:bg-[var(--sparkle-plum-deep)] active:translate-y-px"
                htmlFor={profilePhotoInputId}
              >
                <ImagePlus aria-hidden="true" className="size-4" />
                Upload photo
              </label>
              <span className="max-w-full truncate text-xs font-semibold text-[var(--sparkle-ink-muted)]">
                {selectedProfilePhoto?.name ?? (activeProfilePhotoUrl ? "Current photo" : "No photo selected")}
              </span>
              <p className="text-xs font-semibold text-[var(--sparkle-ink-muted)]" role="status">
                {profilePhotoMessage}
              </p>
            </div>
          </div>
        </div>
        <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
          TikTok handle
          <input
            className="min-h-11 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white px-3 text-sm font-normal text-[var(--sparkle-ink)]"
            name="tiktokHandle"
            onChange={(event) => updateProfileDraft("tiktokHandle", event.target.value)}
            value={profileDraft.tiktokHandle}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
          Collector notes
          <textarea
            className="min-h-24 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white px-3 py-3 text-sm font-normal leading-6 text-[var(--sparkle-ink)]"
            name="bio"
            onChange={(event) => updateProfileDraft("bio", event.target.value)}
            value={profileDraft.bio}
          />
        </label>
        <fieldset className="grid gap-2 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] p-3">
          <legend className="px-1 text-sm font-bold text-[var(--sparkle-plum-deep)]">Visibility</legend>
          <label className="flex min-h-9 items-center gap-3 text-sm text-[var(--sparkle-ink-muted)]">
            <input
              checked={profileDraft.visibility === "private"}
              name="visibility"
              onChange={() => updateProfileDraft("visibility", "private")}
              type="radio"
              value="private"
            />
            <LockKeyhole aria-hidden="true" className="size-4 text-[var(--sparkle-coral)]" />
            Private
          </label>
          <label className="flex min-h-9 items-center gap-3 text-sm text-[var(--sparkle-ink-muted)]">
            <input
              checked={profileDraft.visibility === "sparkle_finder"}
              name="visibility"
              onChange={() => updateProfileDraft("visibility", "sparkle_finder")}
              type="radio"
              value="sparkle_finder"
            />
            <Eye aria-hidden="true" className="size-4 text-[var(--sparkle-coral)]" />
            Sparkle Finder preview
          </label>
        </fieldset>
        <div
          className={`inline-flex min-h-10 items-center gap-2 rounded-[var(--sparkle-radius-sm)] border px-3 text-sm font-bold ${getStatusClassName(statusTone)}`}
          role="status"
        >
          <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
        <button
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--sparkle-radius-sm)] bg-[var(--sparkle-plum)] px-4 text-sm font-bold text-white shadow-[0_12px_24px_rgba(64,41,36,0.16)] transition hover:bg-[var(--sparkle-plum-deep)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending || !canSaveSilverActions || (!isLocalPreview && !saveAction)}
          type="submit"
        >
          <Save aria-hidden="true" className="size-4" />
          {isPending ? "Saving profile..." : "Save profile"}
        </button>
      </form>
    </section>
  );
}

function getProfileStatusMessage({
  actionState,
  isLocalPreview,
  isPending,
  localStatusMessage,
}: {
  actionState: SilverSaveActionState;
  isLocalPreview: boolean;
  isPending: boolean;
  localStatusMessage: string;
}): string {
  if (isPending) {
    return "Saving profile...";
  }

  if (isLocalPreview) {
    return localStatusMessage;
  }

  if (actionState.status === "saved") {
    return localStatusMessage || "Profile saved.";
  }

  if (actionState.status === "error" || actionState.status === "denied") {
    return localStatusMessage || actionState.message;
  }

  return localStatusMessage || actionState.message;
}

function getStatusTone(message: string, fallback: "idle" | "saving" | "saved" | "error"): "idle" | "saving" | "saved" | "error" {
  if (/could not|required|sign in|silver preview|silver access/i.test(message)) {
    return "error";
  }

  if (/saved/i.test(message)) {
    return "saved";
  }

  if (/saving/i.test(message)) {
    return "saving";
  }

  return fallback;
}

function getStatusClassName(tone: "idle" | "saving" | "saved" | "error"): string {
  if (tone === "error") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (tone === "saved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tone === "saving") {
    return "border-[var(--sparkle-border)] bg-[var(--sparkle-paper-soft)] text-[var(--sparkle-plum)]";
  }

  return "border-[var(--sparkle-border)] bg-[var(--sparkle-blush-bg)] text-[var(--sparkle-ink-muted)]";
}

async function disabledProfileAction(): Promise<SilverSaveActionState> {
  return {
    status: "denied",
    message: "Sign in to save your profile.",
  };
}

async function readPreparedProfilePhotoDataUrl(
  preparedValue: FormDataEntryValue | null,
  fileValue: FormDataEntryValue | null,
): Promise<{ ok: true; photoUrl?: string } | { ok: false; message: string }> {
  const preparedPhotoUrl = typeof preparedValue === "string" ? preparedValue.trim() : "";

  if (preparedPhotoUrl) {
    return validatePreparedProfilePhotoDataUrl(preparedPhotoUrl);
  }

  if (!(fileValue instanceof File) || fileValue.size === 0) {
    return { ok: true };
  }

  const prepared = await prepareProfilePhotoCrop(fileValue);

  return prepared.ok ? { ok: true, photoUrl: prepared.photoUrl } : prepared;
}

async function prepareProfilePhotoCrop(
  file: File,
): Promise<{ ok: true; crop: ProfilePhotoCropState; photoUrl: string } | { ok: false; message: string }> {
  if (!profilePhotoTypes.has(file.type)) {
    return { ok: false, message: "Upload a JPG, PNG, or WebP profile photo." };
  }

  if (file.size > profilePhotoSourceMaxBytes) {
    return { ok: false, message: "Profile photo must be 10 MB or smaller." };
  }

  try {
    const objectUrl = URL.createObjectURL(file);
    const image = await loadProfilePhotoBitmap(file);
    try {
      const crop = createInitialProfilePhotoCrop(file.name, objectUrl, image.width, image.height, file);
      const cropped = await cropProfilePhoto(crop);

      return cropped.ok ? { ok: true, crop, photoUrl: cropped.photoUrl } : cropped;
    } finally {
      image.close();
    }
  } catch {
    return { ok: false, message: "Profile photo could not be previewed. Try a JPG, PNG, or WebP." };
  }
}

async function cropProfilePhoto(crop: ProfilePhotoCropState | null): Promise<{ ok: true; photoUrl: string } | { ok: false; message: string }> {
  if (!crop) {
    return { ok: false, message: "Profile photo could not be prepared." };
  }

  let bitmap: ImageBitmap | null = null;
  let image: CanvasImageSource;

  if (crop.sourceFile) {
    bitmap = await loadProfilePhotoBitmap(crop.sourceFile);
    image = bitmap;
  } else {
    image = await loadImage(crop.src);
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    bitmap?.close();
    return { ok: false, message: "Profile photo could not be previewed." };
  }

  canvas.width = profileCropOutputSize;
  canvas.height = profileCropOutputSize;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, profileCropOutputSize, profileCropOutputSize);
  context.drawImage(
    image,
    (crop.offsetX * profileCropOutputSize) / profileCropFrameSize,
    (crop.offsetY * profileCropOutputSize) / profileCropFrameSize,
    (crop.width * crop.scale * profileCropOutputSize) / profileCropFrameSize,
    (crop.height * crop.scale * profileCropOutputSize) / profileCropFrameSize,
  );
  bitmap?.close();

  for (const quality of [0.86, 0.78, 0.7, 0.62]) {
    const photoUrl = canvas.toDataURL("image/jpeg", quality);
    const validated = validatePreparedProfilePhotoDataUrl(photoUrl);

    if (validated.ok) {
      return validated as { ok: true; photoUrl: string };
    }
  }

  return { ok: false, message: "Profile photo is still too large after resizing. Try a smaller image." };
}

function createInitialProfilePhotoCrop(
  name: string,
  src: string,
  width: number,
  height: number,
  sourceFile?: File,
): ProfilePhotoCropState {
  const scale = Math.max(profileCropFrameSize / width, profileCropFrameSize / height);

  return clampProfilePhotoCrop({
    height,
    name,
    offsetX: (profileCropFrameSize - width * scale) / 2,
    offsetY: (profileCropFrameSize - height * scale) / 2,
    scale,
    sourceFile,
    src,
    width,
  });
}

function getDraggedCrop(drag: CropDragState, pointerX: number, pointerY: number): ProfilePhotoCropState {
  return clampProfilePhotoCrop({
    ...drag.crop,
    offsetX: drag.crop.offsetX + pointerX - drag.pointerX,
    offsetY: drag.crop.offsetY + pointerY - drag.pointerY,
  });
}

function clampProfilePhotoCrop(crop: ProfilePhotoCropState): ProfilePhotoCropState {
  const renderedWidth = crop.width * crop.scale;
  const renderedHeight = crop.height * crop.scale;
  const minX = Math.min(0, profileCropFrameSize - renderedWidth);
  const minY = Math.min(0, profileCropFrameSize - renderedHeight);

  return {
    ...crop,
    offsetX: Math.min(0, Math.max(minX, crop.offsetX)),
    offsetY: Math.min(0, Math.max(minY, crop.offsetY)),
  };
}

function loadProfilePhotoBitmap(file: File): Promise<ImageBitmap> {
  if (!("createImageBitmap" in window)) {
    return Promise.reject(new Error("Profile photo preview is not supported in this browser."));
  }

  return Promise.race([
    window.createImageBitmap(file),
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error("Profile photo image decode timed out.")), profilePhotoDecodeTimeoutMs);
    }),
  ]);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeoutId = window.setTimeout(() => {
      reject(new Error("Profile photo image preview timed out."));
    }, 5000);

    image.addEventListener("load", () => {
      window.clearTimeout(timeoutId);
      resolve(image);
    });
    image.addEventListener("error", () => {
      window.clearTimeout(timeoutId);
      reject(new Error("Profile photo image could not be loaded."));
    });
    image.src = src;
  });
}

function validatePreparedProfilePhotoDataUrl(
  photoUrl: string,
): { ok: true; photoUrl: string } | { ok: false; message: string } {
  if (!photoUrl) {
    return { ok: true, photoUrl };
  }

  if (!photoUrl.startsWith("data:image/")) {
    return { ok: false, message: "Profile photo could not be prepared." };
  }

  if (photoUrl.length > profilePhotoDataUrlMaxCharacters) {
    return { ok: false, message: "Profile photo is too large. Try a smaller image." };
  }

  return { ok: true, photoUrl };
}
