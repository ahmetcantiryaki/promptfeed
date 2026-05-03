"use client";

import { useState } from "react";
import { useInteractions } from "@/components/providers/interactions-provider";
import { FolderCreateDialog } from "./folder-create-dialog";
import { FolderPickerDialog } from "./folder-picker-dialog";
import { SaveDialog } from "./save-dialog";

export function SaveFolderModalsHost() {
  const {
    folders,
    pendingSavePostId,
    pickerPostId,
    saveDialogPost,
    lastFolderId,
    saveByPostId,
    closePicker,
    closeSaveDialog,
    cancelPendingSave,
    createFirstFolderAndSave,
    addFolder,
    saveToFolder,
    movePostToFolder,
  } = useInteractions();
  const [createOpenForPicker, setCreateOpenForPicker] = useState(false);
  const [createOpenForSave, setCreateOpenForSave] = useState(false);

  const pickerFolderId = pickerPostId
    ? saveByPostId.get(pickerPostId) ?? null
    : null;

  const saveDialogInitialFolderId =
    lastFolderId && folders.some((f) => f.id === lastFolderId)
      ? lastFolderId
      : folders.find((f) => f.is_default)?.id ?? folders[0]?.id ?? null;

  return (
    <>
      <FolderCreateDialog
        open={pendingSavePostId !== null}
        onOpenChange={(next) => {
          if (!next) cancelPendingSave();
        }}
        forced
        title="Create your first folder"
        description="Group your saves like a board. You can add more folders later."
        submitLabel="Create & save"
        defaultMakeDefault
        onSubmit={async (name) => {
          await createFirstFolderAndSave(name);
        }}
      />

      <SaveDialog
        open={saveDialogPost !== null && !createOpenForSave}
        onOpenChange={(next) => {
          if (!next) closeSaveDialog();
        }}
        post={saveDialogPost}
        folders={folders}
        initialFolderId={saveDialogInitialFolderId}
        onSave={async (folderId) => {
          if (saveDialogPost) {
            await saveToFolder(saveDialogPost.id, folderId);
          }
        }}
        onCreateNew={() => setCreateOpenForSave(true)}
      />

      <FolderCreateDialog
        open={createOpenForSave}
        onOpenChange={setCreateOpenForSave}
        title="New folder"
        description="Group your saves into a new folder."
        submitLabel="Create folder"
        defaultMakeDefault={false}
        onSubmit={async (name, makeDefault) => {
          const created = await addFolder(name, makeDefault);
          if (saveDialogPost) {
            await saveToFolder(saveDialogPost.id, created.id);
          }
          setCreateOpenForSave(false);
          closeSaveDialog();
        }}
      />

      <FolderPickerDialog
        open={pickerPostId !== null && !createOpenForPicker}
        onOpenChange={(next) => {
          if (!next) closePicker();
        }}
        folders={folders}
        currentFolderId={pickerFolderId}
        onPick={async (folderId) => {
          if (pickerPostId) {
            await movePostToFolder(pickerPostId, folderId);
          }
        }}
        onCreateNew={() => setCreateOpenForPicker(true)}
      />

      <FolderCreateDialog
        open={createOpenForPicker}
        onOpenChange={setCreateOpenForPicker}
        title="New folder"
        description="Saves you move here will live in this folder."
        submitLabel="Create folder"
        defaultMakeDefault={false}
        onSubmit={async (name, makeDefault) => {
          const created = await addFolder(name, makeDefault);
          if (pickerPostId) {
            await movePostToFolder(pickerPostId, created.id);
          }
          setCreateOpenForPicker(false);
          closePicker();
        }}
      />
    </>
  );
}
