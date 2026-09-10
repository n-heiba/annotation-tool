import "./env.js"
import express from "express"
import cors from "cors"
import audioRoutes from "./routes/audio.js"
import transcriptRoutes from "./routes/transcripts.js"
import queueRoutes from "./routes/queue.js"
import spanRoutes from "./routes/spans.js"
import exportRoutes from "./routes/export.js"

const app = express()
app.use(cors())

const PORT = process.env.PORT || 3000

app.use(express.json())

app.get("/health", (req, res) => {
  res.json({ status: "ok" })
})

app.use("/api/audio", audioRoutes)
app.use("/api/transcripts", transcriptRoutes)
app.use("/api/queue", queueRoutes)
app.use("/api/spans", spanRoutes)
app.use("/api/export", exportRoutes)

app.use("/uploads", express.static("uploads"))

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
