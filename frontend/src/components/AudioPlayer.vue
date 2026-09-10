<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue"

const props = defineProps<{ audioPath: string }>()

const audioRef = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const playbackRate = ref(1)

const speedOptions = [
  { title: "0.5x", value: 0.5 },
  { title: "1x", value: 1 },
  { title: "1.5x", value: 1.5 },
  { title: "2x", value: 2 }
]

const audioUrl = () => `http://localhost:3000/${props.audioPath}`

function togglePlay() {
  if (!audioRef.value) return
  if (isPlaying.value) audioRef.value.pause()
  else audioRef.value.play()
}

function seek(deltaSeconds: number) {
  if (!audioRef.value) return
  audioRef.value.currentTime += deltaSeconds
}

function setSpeed(rate: number) {
  playbackRate.value = rate
  if (audioRef.value) audioRef.value.playbackRate = rate
}

function jumpTo(seconds: number) {
  if (!audioRef.value) return
  audioRef.value.currentTime = seconds
  audioRef.value.play()
}

defineExpose({ jumpTo })

function handleKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") return

  if (e.code === "Space") {
    e.preventDefault()
    togglePlay()
  } else if (e.code === "ArrowRight") {
    seek(5)
  } else if (e.code === "ArrowLeft") {
    seek(-5)
  }
}

onMounted(() => window.addEventListener("keydown", handleKeydown))
onUnmounted(() => window.removeEventListener("keydown", handleKeydown))

watch(() => props.audioPath, () => { isPlaying.value = false })
</script>

<template>
  <div>
    <h3 class="text-h6 mb-3">Audio</h3>
    <audio
        ref="audioRef"
        :src="audioUrl()"
        @play="isPlaying = true"
        @pause="isPlaying = false"
        controls
        style="width: 100%;"
        class="mb-3"
    />

    <div class="d-flex align-center ga-2 flex-wrap">
      <v-btn size="small" variant="tonal" @click="togglePlay">{{ isPlaying ? "Pause" : "Play" }}</v-btn>
      <v-btn size="small" variant="text" @click="seek(-5)">« 5s</v-btn>
      <v-btn size="small" variant="text" @click="seek(5)">5s »</v-btn>
      <v-select
          :model-value="playbackRate"
          :items="speedOptions"
          density="compact"
          style="max-width: 100px;"
          hide-details
          @update:model-value="setSpeed"
      />
    </div>

    <p class="text-body-2 text-grey mt-2">Shortcuts: Space = play/pause, ← / → = seek 5s</p>  </div>
</template>