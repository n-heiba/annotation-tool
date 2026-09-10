<script setup lang="ts">
import { ref, computed, watch } from "vue"

const props = defineProps<{ transcriptId: string, text: string }>()

interface Span {
  id: string
  startOffset: number
  endOffset: number
  type: string
  attributes: Record<string, unknown>
}

const spans = ref<Span[]>([])
const selectionStart = ref<number | null>(null)
const selectionEnd = ref<number | null>(null)
const selectedType = ref("MEDICAL_TERM")

const attrCategory = ref("anatomy")
const attrValue = ref(0)
const attrUnit = ref("mg")
const attrNormalizedValue = ref(0)
const attrRendering = ref<"digits" | "words">("words")
const attrNormalized = ref(0)
const attrCommand = ref("newline")
const attrIsCommand = ref(true)
const attrResolvedWord = ref("")
const attrEntityType = ref("person")

const typeOptions = [
  { title: "Medical Term", value: "MEDICAL_TERM" },
  { title: "Measurement", value: "MEASUREMENT" },
  { title: "Number", value: "NUMBER" },
  { title: "Formatting Command", value: "FORMATTING_COMMAND" },
  { title: "Spelled Out", value: "SPELLED_OUT" },
  { title: "Named Entity", value: "NAMED_ENTITY" }
]

const categoryOptions = ["anatomy", "procedure", "diagnosis", "drug", "device"]
const unitOptions = ["g", "mg", "ug", "kg", "ml", "l", "mmHg", "IE", "mm", "cm", "Ch"]
const commandOptions = ["newline", "paragraph", "period", "comma", "colon", "dash", "bracket_open", "bracket_close"]
const entityOptions = ["person", "organisation", "place", "date"]

const tokens = computed(() => {
  const result: { text: string, start: number, end: number }[] = []
  const regex = /\S+/g
  let match
  while ((match = regex.exec(props.text)) !== null) {
    result.push({ text: match[0], start: match.index, end: match.index + match[0].length })
  }
  return result
})

function isTagged(tokenStart: number, tokenEnd: number) {
  return spans.value.find((s) => tokenStart >= s.startOffset && tokenEnd <= s.endOffset)
}

function handleTokenClick(index: number, shiftKey: boolean) {
  if (!shiftKey || selectionStart.value === null) {
    selectionStart.value = index
    selectionEnd.value = index
  } else {
    selectionEnd.value = index
  }
}

const selectionRange = computed(() => {
  if (selectionStart.value === null || selectionEnd.value === null) return null
  const from = Math.min(selectionStart.value, selectionEnd.value)
  const to = Math.max(selectionStart.value, selectionEnd.value)
  return { from, to }
})

async function fetchSpans() {
  const res = await fetch(`http://localhost:3000/api/spans?transcriptId=${props.transcriptId}`)
  const data = await res.json()
  spans.value = data.spans
}

function buildAttributes(): Record<string, unknown> {
  switch (selectedType.value) {
    case "MEDICAL_TERM": return { category: attrCategory.value }
    case "MEASUREMENT": return { value: attrValue.value, unit: attrUnit.value, normalizedValue: attrNormalizedValue.value }
    case "NUMBER": return { rendering: attrRendering.value, normalized: attrNormalized.value }
    case "FORMATTING_COMMAND": return { command: attrCommand.value, isCommand: attrIsCommand.value }
    case "SPELLED_OUT": return { resolvedWord: attrResolvedWord.value }
    case "NAMED_ENTITY": return { entityType: attrEntityType.value }
    default: return {}
  }
}

async function createSpan() {
  if (!selectionRange.value) return
  const startOffset = tokens.value[selectionRange.value.from].start
  const endOffset = tokens.value[selectionRange.value.to].end

  await fetch("http://localhost:3000/api/spans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcriptId: props.transcriptId,
      startOffset,
      endOffset,
      type: selectedType.value,
      attributes: buildAttributes()
    })
  })

  selectionStart.value = null
  selectionEnd.value = null
  await fetchSpans()
}

async function deleteSpan(id: string) {
  await fetch(`http://localhost:3000/api/spans/${id}`, { method: "DELETE" })
  await fetchSpans()
}

watch(() => props.transcriptId, fetchSpans, { immediate: true })
</script>

<template>
  <div>
    <h3 class="text-h6 mb-1">Annotate</h3>
    <p class="text-body-2 text-grey mb-3">Click a word to select it, Shift+Click to extend the selection.</p>

    <p class="mb-4 pa-4" style="line-height: 2.4; border: 1px solid #ddd; border-radius: 8px; background: #fafafa; overflow-wrap: normal;">
      <span
          v-for="(token, i) in tokens"
          :key="i"
          @click="handleTokenClick(i, $event.shiftKey)"
          class="px-1 rounded"
          style="display: inline-block; white-space: nowrap;"
          :style="{
          cursor: 'pointer',
          background: isTagged(token.start, token.end) ? '#ffe08a'
            : (selectionRange && i >= selectionRange.from && i <= selectionRange.to) ? '#cde6ff'
            : 'transparent'
        }"
      >{{ token.text }}</span>
      <span> </span>
    </p>

    <v-card v-if="selectionRange" variant="tonal" class="pa-4 mb-4">
      <v-select v-model="selectedType" :items="typeOptions" label="Type" density="compact" class="mb-2" />

      <v-select v-if="selectedType === 'MEDICAL_TERM'" v-model="attrCategory" :items="categoryOptions" label="Category" density="compact" />

      <template v-else-if="selectedType === 'MEASUREMENT'">
        <v-text-field v-model.number="attrValue" type="number" label="Value" density="compact" />
        <v-select v-model="attrUnit" :items="unitOptions" label="Unit" density="compact" />
        <v-text-field v-model.number="attrNormalizedValue" type="number" label="Normalized value" density="compact" />
      </template>

      <template v-else-if="selectedType === 'NUMBER'">
        <v-select v-model="attrRendering" :items="['words', 'digits']" label="Rendering" density="compact" />
        <v-text-field v-model.number="attrNormalized" type="number" label="Normalized" density="compact" />
      </template>

      <template v-else-if="selectedType === 'FORMATTING_COMMAND'">
        <v-select v-model="attrCommand" :items="commandOptions" label="Command" density="compact" />
        <v-checkbox v-model="attrIsCommand" label="Is a spoken instruction (unchecked = literal word)" density="compact" />
      </template>

      <v-text-field v-else-if="selectedType === 'SPELLED_OUT'" v-model="attrResolvedWord" label="Resolved word" placeholder="e.g. Cefuroxim" density="compact" />

      <v-select v-else-if="selectedType === 'NAMED_ENTITY'" v-model="attrEntityType" :items="entityOptions" label="Entity type" density="compact" />

      <v-btn color="primary" @click="createSpan" class="mt-2">Tag Selection</v-btn>
    </v-card>

    <h4 class="text-subtitle-1 mb-2">Existing spans</h4>
    <v-list density="compact">
      <v-list-item v-for="span in spans" :key="span.id">
        <v-chip size="small" class="mr-2">{{ span.type }}</v-chip>
        <span class="text-body-2">"{{ props.text.slice(span.startOffset, span.endOffset) }}"</span>
        <span class="text-caption text-grey ml-2">{{ JSON.stringify(span.attributes) }}</span>
        <template #append>
          <v-btn size="x-small" variant="text" color="error" @click="deleteSpan(span.id)">Delete</v-btn>
        </template>
      </v-list-item>
    </v-list>
  </div>
</template>