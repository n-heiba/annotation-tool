<script setup lang="ts">
import { ref, computed } from "vue"
import Queue from "./components/Queue.vue"
import AudioPlayer from "./components/AudioPlayer.vue"
import TranscriptEditor from "./components/TranscriptEditor.vue"
import Annotator from "./components/Annotator.vue"
import Upload from "./components/Upload.vue"

interface AudioDetail {
  id: string
  path: string
  transcriptId: string
}

const selectedAudioId = ref<string | null>(null)
const audioDetail = ref<AudioDetail | null>(null)
const transcriptEditorRef = ref<InstanceType<typeof TranscriptEditor> | null>(null)
const queueRef = ref<InstanceType<typeof Queue> | null>(null)

const currentText = computed(() => transcriptEditorRef.value?.correctedText ?? "")

async function handleSelect(audioId: string) {
  const res = await fetch(`http://localhost:3000/api/transcripts/${audioId}`)
  if (!res.ok) {
    audioDetail.value = null
    selectedAudioId.value = audioId
    return
  }
  const data = await res.json()

  const queueRes = await fetch("http://localhost:3000/api/queue")
  const queueData = await queueRes.json()
  const item = queueData.items.find((i: { id: string }) => i.id === audioId)

  selectedAudioId.value = audioId
  audioDetail.value = {
    id: audioId,
    path: item ? item.path : "",
    transcriptId: data.id
  }
}

function handleExportAll() {
  window.open("http://localhost:3000/api/export", "_blank")
}
</script>

<template>
  <v-app>
    <v-main>
      <v-container style="max-width: 900px;">
        <h1 class="text-h4 mb-6">Clinical Transcript Annotation Tool</h1>

        <div class="d-flex ga-6 mb-6">
          <v-btn color="teal" variant="outlined" @click="handleExportAll">Export All (JSONL)</v-btn>
          <Upload @uploaded="queueRef?.refresh()" />
        </div>

        <v-card class="mb-4" variant="outlined">
          <v-card-text>
            <Queue ref="queueRef" @select="handleSelect" />
          </v-card-text>
        </v-card>

        <template v-if="selectedAudioId && audioDetail">
          <v-card class="mb-4" variant="outlined">
            <v-card-text>
              <AudioPlayer :audio-path="audioDetail.path" />
            </v-card-text>
          </v-card>
          <v-card class="mb-4" variant="outlined">
            <v-card-text>
              <TranscriptEditor
                  ref="transcriptEditorRef"
                  :audio-id="selectedAudioId"
                  @saved="queueRef?.refresh()"
              />
            </v-card-text>
          </v-card>
          <v-card class="mb-4" variant="outlined">
            <v-card-text>
              <Annotator
                  v-if="audioDetail.transcriptId"
                  :transcript-id="audioDetail.transcriptId"
                  :text="currentText"
              />
            </v-card-text>
          </v-card>
        </template>

        <p v-else-if="selectedAudioId">No transcript uploaded yet for this item.</p>
      </v-container>
    </v-main>
  </v-app>
</template>