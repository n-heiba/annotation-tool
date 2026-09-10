<script setup lang="ts">
import { ref, onMounted, computed } from "vue"

interface QueueItem {
  id: string
  filename: string
  status: string
  durationSeconds: number | null
}

const emit = defineEmits<{ select: [id: string] }>()

const items = ref<QueueItem[]>([])
const statusFilter = ref("")
const sortBy = ref("")
const loading = ref(false)
const selectedId = ref<string | null>(null)
const expanded = ref(true)

const statusOptions = [
  { title: "All", value: "" },
  { title: "Pending", value: "pending" },
  { title: "Rejected", value: "rejected" },
  { title: "In Progress", value: "in_progress" },
  { title: "Done", value: "done" }
]

const sortOptions = [
  { title: "Default", value: "" },
  { title: "Duration", value: "duration" }
]

const statusColor: Record<string, string> = {
  pending: "primary",
  rejected: "grey",
  in_progress: "warning",
  done: "success"
}

const selectedItem = computed(() => items.value.find((i) => i.id === selectedId.value))

async function fetchQueue() {
  loading.value = true
  const params = new URLSearchParams()
  if (statusFilter.value) params.set("status", statusFilter.value)
  if (sortBy.value) params.set("sort", sortBy.value)

  const res = await fetch(`http://localhost:3000/api/queue?${params}`)
  const data = await res.json()
  items.value = data.items
  loading.value = false
}

function selectItem(id: string) {
  selectedId.value = id
  expanded.value = false
  emit("select", id)
}

onMounted(fetchQueue)

defineExpose({ refresh: fetchQueue })
</script>

<template>
  <div>
    <!-- Collapsed bar: shown once something is selected -->
    <div
        v-if="!expanded && selectedItem"
        class="d-flex align-center justify-space-between pa-3"
        style="border: 1px solid #e0e0e0; border-radius: 8px; background: #f9f9f9;"
    >
      <div class="d-flex align-center ga-3">
        <span class="text-caption text-grey">Queue:</span>
        <span class="text-body-2 font-weight-medium">{{ selectedItem.filename }}</span>
        <v-chip :color="statusColor[selectedItem.status]" size="small">{{ selectedItem.status }}</v-chip>
      </div>
      <v-btn size="small" variant="text" @click="expanded = true">Change item</v-btn>
    </div>

    <!-- Expanded view: full list with filters -->
    <div v-else>
      <div class="d-flex align-center justify-space-between mb-4">
        <h3 class="text-subtitle-1">Work Queue</h3>
        <v-btn v-if="selectedItem" size="small" variant="text" @click="expanded = false">Collapse</v-btn>
      </div>

      <div class="d-flex align-center ga-4 mb-4">
        <v-select
            v-model="statusFilter"
            :items="statusOptions"
            label="Status"
            density="compact"
            variant="outlined"
            hide-details
            style="max-width: 180px;"
            @update:model-value="fetchQueue"
        />
        <v-select
            v-model="sortBy"
            :items="sortOptions"
            label="Sort by"
            density="compact"
            variant="outlined"
            hide-details
            style="max-width: 180px;"
            @update:model-value="fetchQueue"
        />
      </div>

      <v-progress-circular v-if="loading" indeterminate />

      <div v-else style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div
            v-for="(item, i) in items"
            :key="item.id"
            @click="selectItem(item.id)"
            class="d-flex align-center justify-space-between pa-3"
            style="cursor: pointer;"
            :style="{
            borderBottom: i < items.length - 1 ? '1px solid #eee' : 'none',
            background: item.id === selectedId ? '#e8f0fe' : 'white'
          }"
            @mouseover="($event.currentTarget as HTMLElement).style.background = item.id === selectedId ? '#e8f0fe' : '#f5f5f5'"
            @mouseleave="($event.currentTarget as HTMLElement).style.background = item.id === selectedId ? '#e8f0fe' : 'white'"
        >
          <span class="text-body-2">{{ item.filename }}</span>
          <div class="d-flex align-center ga-3">
            <v-chip :color="statusColor[item.status]" size="small">{{ item.status }}</v-chip>
            <span class="text-caption text-grey" style="min-width: 40px; text-align: right;">
              {{ item.durationSeconds?.toFixed(1) }}s
            </span>
          </div>
        </div>
      </div>

      <p v-if="!loading && items.length === 0" class="text-body-2 text-grey mt-2">No items in queue.</p>
    </div>
  </div>
</template>