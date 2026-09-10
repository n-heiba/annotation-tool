<script setup lang="ts">
import { ref } from "vue"

const emit = defineEmits<{ uploaded: [] }>()

const dialogOpen = ref(false)
const tab = ref("audio")

const audioFiles = ref<File[]>([])
const audioUploading = ref(false)
const audioResultText = ref("")

const transcriptFile = ref<File[]>([])
const pastedPath = ref("")
const pastedLabel = ref("")
const transcriptUploading = ref(false)
const transcriptResultText = ref("")

async function uploadAudio() {
  if (audioFiles.value.length === 0) return
  audioUploading.value = true

  const form = new FormData()
  for (const file of audioFiles.value) form.append("files", file)

  const res = await fetch("http://localhost:3000/api/audio/upload", { method: "POST", body: form })
  const data = await res.json()
  const okCount = data.results.filter((r: { status: string }) => r.status !== "rejected").length
  audioResultText.value = `Uploaded ${data.results.length} file(s) — ${okCount} accepted, ${data.results.length - okCount} rejected.`
  audioFiles.value = []
  audioUploading.value = false
  emit("uploaded")
}

async function uploadTranscriptFile() {
  if (transcriptFile.value.length === 0) return
  transcriptUploading.value = true

  const text = await transcriptFile.value[0].text()
  const transcripts = JSON.parse(text)

  const res = await fetch("http://localhost:3000/api/transcripts/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcripts })
  })
  const data = await res.json()
  transcriptResultText.value = `Matched ${data.matched.length}, unmatched ${data.unmatchedTranscripts.length}, invalid ${data.invalid.length}.`
  transcriptFile.value = []
  transcriptUploading.value = false
  emit("uploaded")
}

async function uploadPastedTranscript() {
  if (!pastedPath.value || !pastedLabel.value) return
  transcriptUploading.value = true

  const res = await fetch("http://localhost:3000/api/transcripts/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcripts: [{ path: pastedPath.value, label: pastedLabel.value }] })
  })
  const data = await res.json()
  transcriptResultText.value = data.matched.length > 0 ? "Transcript added." : "No matching audio file found for that path."
  pastedPath.value = ""
  pastedLabel.value = ""
  transcriptUploading.value = false
  emit("uploaded")
}
</script>

<template>
  <v-btn color="primary" variant="tonal" @click="dialogOpen = true">Upload</v-btn>

  <v-dialog v-model="dialogOpen" max-width="520">
    <v-card>
      <v-card-title>Upload Audio & Transcripts</v-card-title>

      <v-tabs v-model="tab" color="primary">
        <v-tab value="audio">Audio</v-tab>
        <v-tab value="transcript">Transcript</v-tab>
      </v-tabs>

      <v-card-text>
        <v-window v-model="tab">

          <v-window-item value="audio">
            <p class="text-body-2 text-grey mb-4">Add new recordings. Accepted formats: .wav, .mp3, .m4a.</p>
            <v-file-input
                v-model="audioFiles"
                multiple
                accept=".wav,.mp3,.m4a"
                label="Choose audio files"
                density="comfortable"
            />
            <v-btn color="primary" :loading="audioUploading" :disabled="audioFiles.length === 0" @click="uploadAudio">
              Upload
            </v-btn>
            <p v-if="audioResultText" class="text-body-2 mt-2">{{ audioResultText }}</p>
          </v-window-item>

          <v-window-item value="transcript">
            <p class="text-body-2 text-grey mb-4">
              Add the AI-generated text for one or more audio files already uploaded.
              Matched automatically by filename.
            </p>

            <v-file-input
                v-model="transcriptFile"
                accept=".json"
                label="Transcript JSON file (multiple items)"
                density="comfortable"
            />
            <v-btn color="primary" :loading="transcriptUploading" :disabled="transcriptFile.length === 0" @click="uploadTranscriptFile" class="mb-4">
              Upload File
            </v-btn>

            <v-divider class="mb-4">or add a single one</v-divider>

            <v-text-field v-model="pastedPath" label="Audio filename" placeholder="e.g. german-tts.wav" density="comfortable" />
            <v-textarea v-model="pastedLabel" label="Transcript text" rows="2" density="comfortable" />
            <v-btn color="primary" :loading="transcriptUploading" :disabled="!pastedPath || !pastedLabel" @click="uploadPastedTranscript">
              Add
            </v-btn>

            <p v-if="transcriptResultText" class="text-body-2 mt-2">{{ transcriptResultText }}</p>
          </v-window-item>

        </v-window>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="dialogOpen = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>