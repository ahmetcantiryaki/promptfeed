"use client";

import { useState } from "react";
import { useInteractions } from "@/components/providers/interactions-provider";
import { FolderCreateDialog } from "./folder-create-dialog";
import { FolderPickerDialog } from "./folder-picker-dialog";

export function SaveFolderModalsHost() {
  const {
    folders,
    pendingSavePostId,
    pickerPostId,
    saveByPostId,
    closePicker,
    cancelPendingSave,
    createFirstFolderAndSave,
    addFolder,
    movePostToFolder,
  } = useInteractions();
  const [createOpenForPicker, setCreateOpenForPicker] = useState(false);

  const pickerFolderId = pickerPostId
    ? saveByPostId.get(pickerPostId) ?? null
    : null;

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
