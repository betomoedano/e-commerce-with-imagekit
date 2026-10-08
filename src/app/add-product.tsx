import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ProductMedia } from "@/components/product-media";
import { BackButton, Button, Eyebrow, Page, ui } from "@/components/store-ui";
import { displayFont, palette } from "@/constants/store-theme";
import { useProducts } from "@/context/products-context";
import {
  isAcceptedPhotoMimeType,
  PHOTO_FORMAT_LABELS,
  photoAssetFromPick,
  photoFormatLabel,
  resolvePhotoMimeType,
  type AcceptedPhotoMimeType,
  type MediaAsset,
} from "@/data/media";
import {
  PLACEHOLDER_BY_CATEGORY,
  PRODUCT_CATEGORIES,
  type ProductCategory,
} from "@/data/products";
import { uploadProductMedia } from "@/data/upload-media";

type Errors = { name?: string; price?: string; description?: string };

type SelectedPhoto = {
  asset: MediaAsset;
  fileName: string | null;
  mimeType: AcceptedPhotoMimeType;
  format: string;
};

type PhotoError = { message: string; offerSettings?: boolean };

function photoDetails({ asset, fileName }: SelectedPhoto): string {
  const dimensions =
    asset.width && asset.height ? `${asset.width} × ${asset.height}` : null;
  const details = [fileName, dimensions].filter(Boolean).join(" · ");
  return details || "Your photo is ready and uploads with the product.";
}

export default function AddProductScreen() {
  const { addProduct } = useProducts();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<ProductCategory>("Bags");
  const [description, setDescription] = useState("");
  const [colorName, setColorName] = useState("");
  const [material, setMaterial] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [photo, setPhoto] = useState<SelectedPhoto | null>(null);
  const [photoError, setPhotoError] = useState<PhotoError | null>(null);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [libraryPermission, requestLibraryPermission] =
    ImagePicker.useMediaLibraryPermissions();
  const submitted = useRef(false);
  const pickingPhoto = useRef(false);
  const nameRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);

  async function pickPhoto() {
    if (pickingPhoto.current) return;
    pickingPhoto.current = true;
    setPicking(true);
    setPhotoError(null);
    try {
      // Skip the prompt once access is granted; requesting again when it is not
      // returns the current answer, including a permanent denial.
      const permission = libraryPermission?.granted
        ? libraryPermission
        : await requestLibraryPermission();
      if (!permission.granted) {
        setPhotoError(
          permission.canAskAgain
            ? {
                message:
                  "We need access to your photos before you can choose one.",
              }
            : {
                message: "Photo access is turned off for this app.",
                offerSettings: true,
              },
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
      });
      // Backing out of the picker leaves an earlier selection untouched.
      if (result.canceled) return;
      const [asset] = result.assets;
      if (!asset) {
        setPhotoError({
          message: "That photo could not be read. Please try another one.",
        });
        return;
      }
      const mimeType = resolvePhotoMimeType(asset);
      if (!isAcceptedPhotoMimeType(mimeType)) {
        const format = photoFormatLabel(mimeType);
        setPhotoError({
          message: format
            ? `${format} photos are not supported yet. Choose a JPG or PNG instead.`
            : "Choose a JPG or PNG photo.",
        });
        return;
      }
      setPhoto({
        asset: photoAssetFromPick(asset),
        fileName: asset.fileName ?? null,
        mimeType,
        format: PHOTO_FORMAT_LABELS[mimeType],
      });
    } catch (error) {
      console.warn("[add-product] Choosing a photo failed.", error);
      setPhotoError({
        message: "Something went wrong opening your photos. Please try again.",
      });
    } finally {
      pickingPhoto.current = false;
      setPicking(false);
    }
  }

  async function openSettings() {
    try {
      await Linking.openSettings();
    } catch {
      setPhotoError({
        message: "Allow photo access for this app in your device settings.",
      });
    }
  }

  async function saveProduct() {
    if (submitted.current) return;
    const nextErrors: Errors = {};
    const normalizedPrice = price.trim();
    const amount = Number(normalizedPrice);
    if (!name.trim()) nextErrors.name = "Give your product a name.";
    if (
      !/^\d+(\.\d{1,2})?$/.test(normalizedPrice) ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 99999
    ) {
      nextErrors.price =
        "Enter a price from $0.01 to $99,999, with up to two decimal places.";
    }
    if (!description.trim())
      nextErrors.description = "Add a short description.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      if (nextErrors.name) nameRef.current?.focus();
      else if (nextErrors.price) priceRef.current?.focus();
      else descriptionRef.current?.focus();
      return;
    }
    submitted.current = true;
    setSaving(true);
    setSaveError(null);

    // The product keeps the hosted ImageKit copy, not the on-device file.
    let uploadedPhoto: MediaAsset | undefined;
    if (photo) {
      try {
        uploadedPhoto = await uploadProductMedia({
          uri: photo.asset.url,
          fileName:
            photo.fileName ??
            `product.${photo.mimeType === "image/png" ? "png" : "jpg"}`,
          mimeType: photo.mimeType,
        });
      } catch (error) {
        // Log the underlying failure; the UI shows the friendly message.
        console.warn(
          "[add-product] Uploading the photo failed.",
          error instanceof Error && error.cause ? error.cause : error,
        );
        setSaveError(
          error instanceof Error
            ? error.message
            : "The photo could not be uploaded. Please try again.",
        );
        submitted.current = false;
        setSaving(false);
        return;
      }
    }

    const product = addProduct({
      name: name.trim(),
      price: amount,
      category,
      description: description.trim(),
      colorName: colorName.trim() || "Not specified",
      material: material.trim() || "Not specified",
      placeholder: PLACEHOLDER_BY_CATEGORY[category],
      photo: uploadedPhoto,
    });
    router.replace({ pathname: "/product/[id]", params: { id: product.id } });
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Page narrow>
        <View style={styles.topbar}>
          <BackButton />
          <Eyebrow>YOUR COLLECTION</Eyebrow>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Something new.
        </Text>
        <Text style={[ui.body, styles.subtitle]}>
          Add a little more to the everyday.
        </Text>
        <View style={styles.photoCard}>
          <View style={styles.preview}>
            <ProductMedia
              placeholder={PLACEHOLDER_BY_CATEGORY[category]}
              photo={photo?.asset}
              label={
                photo
                  ? "Selected product photo"
                  : "Selected product placeholder"
              }
              style={styles.previewImage}
            />
            <View style={styles.previewText}>
              <Text style={styles.label}>Product photo</Text>
              <Text style={styles.help}>
                {photo
                  ? photoDetails(photo)
                  : "A placeholder for now. Choose a category below to change the preview."}
              </Text>
              <View style={[styles.tag, photo && styles.tagSelected]}>
                <Text style={[styles.tagText, photo && styles.tagSelectedText]}>
                  {photo ? photo.format : "PLACEHOLDER"}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={photo ? "Replace photo" : "Choose photo"}
                accessibilityState={{
                  busy: picking,
                  disabled: picking || saving,
                }}
                disabled={picking || saving}
                onPress={pickPhoto}
                style={({ pressed }) => [
                  styles.photoButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.photoButtonText,
                    picking && styles.photoButtonTextBusy,
                  ]}
                >
                  {picking
                    ? "Opening…"
                    : photo
                      ? "Replace photo"
                      : "Choose photo"}
                </Text>
              </Pressable>
            </View>
          </View>
          {photoError && (
            <View style={styles.photoErrorBlock}>
              <Text accessibilityRole="alert" style={styles.error}>
                {photoError.message}
              </Text>
              {photoError.offerSettings && (
                <Pressable
                  accessibilityRole="button"
                  onPress={openSettings}
                  style={({ pressed }) => [
                    styles.settingsButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.settingsText}>Open settings →</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Product name</Text>
            <TextInput
              ref={nameRef}
              accessibilityLabel="Product name"
              placeholder="e.g. Weekend Tote"
              value={name}
              onChangeText={setName}
              maxLength={80}
              returnKeyType="next"
              onSubmitEditing={() => priceRef.current?.focus()}
              placeholderTextColor={palette.muted}
              style={[styles.input, errors.name && styles.inputError]}
            />
            {errors.name && (
              <Text accessibilityRole="alert" style={styles.error}>
                {errors.name}
              </Text>
            )}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>
              Price <Text style={styles.optional}>(USD)</Text>
            </Text>
            <TextInput
              ref={priceRef}
              accessibilityLabel="Price in USD"
              placeholder="0.00"
              value={price}
              onChangeText={setPrice}
              inputMode="decimal"
              maxLength={10}
              placeholderTextColor={palette.muted}
              style={[styles.input, errors.price && styles.inputError]}
            />
            {errors.price && (
              <Text accessibilityRole="alert" style={styles.error}>
                {errors.price}
              </Text>
            )}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categories}>
              {PRODUCT_CATEGORIES.map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected: item === category }}
                  onPress={() => setCategory(item)}
                  style={[
                    styles.category,
                    item === category && styles.categorySelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      item === category && styles.categoryTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              ref={descriptionRef}
              accessibilityLabel="Description"
              placeholder="What makes this product special?"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={600}
              placeholderTextColor={palette.muted}
              style={[
                styles.input,
                styles.textarea,
                errors.description && styles.inputError,
              ]}
            />
            {errors.description && (
              <Text accessibilityRole="alert" style={styles.error}>
                {errors.description}
              </Text>
            )}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>
              Color <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              accessibilityLabel="Color"
              placeholder="e.g. Natural canvas"
              value={colorName}
              onChangeText={setColorName}
              maxLength={50}
              style={styles.input}
              placeholderTextColor={palette.muted}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>
              Material <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              accessibilityLabel="Material"
              placeholder="e.g. Cotton canvas"
              value={material}
              onChangeText={setMaterial}
              maxLength={60}
              style={styles.input}
              placeholderTextColor={palette.muted}
            />
          </View>
          <Text style={styles.sessionNote}>
            Products are saved for this session. Reloading restores the sample
            collection.
          </Text>
          {saveError && (
            <Text accessibilityRole="alert" style={styles.error}>
              {saveError}
            </Text>
          )}
          <Button
            title={
              saving
                ? photo
                  ? "Uploading photo…"
                  : "Saving…"
                : "Add to collection  ↗"
            }
            onPress={saveProduct}
            disabled={saving}
          />
        </View>
      </Page>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: palette.background },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 26,
  },
  title: {
    color: palette.ink,
    fontFamily: displayFont,
    fontSize: 39,
    lineHeight: 47,
    letterSpacing: -1.4,
  },
  subtitle: { marginTop: 8, marginBottom: 28 },
  photoCard: {
    backgroundColor: "#EFEFE8",
    borderRadius: 18,
    padding: 16,
    gap: 14,
    marginBottom: 30,
  },
  preview: { flexDirection: "row", alignItems: "center", gap: 18 },
  previewImage: { width: 92, height: 105, borderRadius: 12 },
  previewText: { flex: 1, gap: 8 },
  label: { color: palette.ink, fontWeight: "600", fontSize: 14 },
  help: { color: palette.muted, fontSize: 12, lineHeight: 18 },
  tag: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: "#DFE4D5",
  },
  tagText: {
    color: "#59664D",
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: "600",
  },
  tagSelected: { backgroundColor: palette.ink },
  tagSelectedText: { color: "#FFFFFF" },
  photoButton: {
    alignSelf: "flex-start",
    marginTop: 2,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  photoButtonText: { color: palette.ink, fontSize: 13, fontWeight: "600" },
  photoButtonTextBusy: { color: palette.muted },
  photoErrorBlock: { gap: 6 },
  settingsButton: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
  },
  settingsText: { color: palette.ink, fontSize: 13, fontWeight: "600" },
  pressed: { opacity: 0.65 },
  form: { gap: 24 },
  field: { gap: 10 },
  input: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: palette.ink,
  },
  inputError: { borderColor: palette.error },
  error: { color: palette.error, fontSize: 12, lineHeight: 18 },
  textarea: { minHeight: 120, textAlignVertical: "top" },
  optional: { color: palette.muted, fontWeight: "400" },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  category: {
    minHeight: 44,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: palette.line,
  },
  categorySelected: { borderColor: palette.ink, backgroundColor: palette.ink },
  categoryText: { color: palette.muted, fontSize: 13 },
  categoryTextSelected: { color: "#FFFFFF" },
  sessionNote: { color: palette.muted, fontSize: 12, lineHeight: 19 },
});
