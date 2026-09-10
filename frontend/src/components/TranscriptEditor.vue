<script setup lang="ts">
import { ref, watch } from "vue"

const props = defineProps<{ audioId: string }>()
const emit = defineEmits<{ saved: [] }>()

const originalText = ref("")
const correctedText = ref("")
const loading = ref(false)
const saving = ref(false)

async function fetchTranscript() {
  loading.value = true
  const res = await fetch(`http://localhost:3000/api/transcripts/${props.audioId}`)
  if (res.ok) {
    const data = await res.json()
    originalText.value = data.originalText
    correctedText.value = data.correctedText
  } else {
    originalText.value = ""
    correctedText.value = ""
  }
  loading.value = false
}

async function save() {
  saving.value = true
  await fetch(`http://localhost:3000/api/transcripts/${props.audioId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correctedText: correctedText.value })
  })
  saving.value = false
  emit("saved")
}

watch(() => props.audioId, fetchTranscript, { immediate: true })

defineExpose({ correctedText, refresh: fetchTranscript })
</script>

<template>
  <div>
    <h3 class="text-h6 mb-3">Transcript</h3>

    <v-progress-circular v-if="loading" indeterminate />

    <template v-else>
      <v-textarea
          :model-value="originalText"
          label="Original (read-only)"
          readonly
          rows="3"
          variant="filled"
          density="comfortable"
          class="mb-2"
      />

      <v-textarea
          v-model="correctedText"
          label="Corrected"
          rows="3"
          variant="outlined"
          density="comfortable"
          class="mb-2"
      />

      <v-btn color="primary" :loading="saving" @click="save">Save Correction</v-btn>
    </template>
  </div>
</template>