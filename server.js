require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser  = require("cookie-parser");
const mongoose = require("mongoose");
const path = require("path");

// ROUTERS
const schoolRouter = require("./router/school.router")
const studentRouter = require("./router/student.router")
const classRouter = require("./router/class.router")
const subjectRouter = require("./router/subject.router")
const teacherRouter = require('./router/teacher.router')
const examRouter =  require('./router/examination.router')
const attendanceRoutes = require('./router/attendance.router');
const periodRoutes = require("./router/period.router");
const noticeRoutes = require("./router/notice.router");
const authMiddleware = require("./auth/auth");
const { authCheck } = require("./controller/auth.controller");

const app = express();

// middleware 
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
const corsOptions = {exposedHeaders:"Authorization"}
app.use(cors(corsOptions));

// Serve uploaded images (saved in client/public/images)
app.use("/images", express.static(path.join(__dirname, "../client/public/images")));

// Health check (for Render / uptime pings)
app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// MONGODB CONNECTION
mongoose.connect(process.env.MONGODB).then(db=>{
    console.log("MongoDb is Connected Successfully.")
}).catch(e=>{
    console.log("MongoDb Error",e)
})



app.use("/api/school", schoolRouter)
app.use("/api/student", studentRouter)
app.use("/api/teacher", teacherRouter)
app.use("/api/class", classRouter)
app.use("/api/subject", subjectRouter)
app.use('/api/examination', examRouter)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/period',  periodRoutes)
app.use('/api/notices', noticeRoutes)

app.get('/api/auth/check',authCheck)


const PORT = process.env.PORT || 5001;
app.listen(PORT, ()=>{
    console.log("Server is running at port =>",PORT)
})

/**
 * Optional keep-alive ping.
 *
 * NOTE: This cannot prevent Render free-tier cold starts by itself (when the process is asleep,
 * it can't run a timer). Use an external uptime monitor to hit /api/health periodically.
 *
 * To enable internal ping (useful on hosts that don't fully suspend the process):
 * - Set KEEP_ALIVE_URL to your deployed health URL, e.g. https://your-app.onrender.com/api/health
 * - Optionally set KEEP_ALIVE_INTERVAL_MS (default 840000 = 14min)
 */
// const keepAliveUrl = process.env.KEEP_ALIVE_URL;
// const keepAliveIntervalMs = Math.max(
//   parseInt(process.env.KEEP_ALIVE_INTERVAL_MS || "840000", 10) || 840000,
//   60000
// );

// if (keepAliveUrl) {
//   const { request } = keepAliveUrl.startsWith("https:")
//     ? require("https")
//     : require("http");

//   setInterval(() => {
//     try {
//       const req = request(
//         keepAliveUrl,
//         { method: "GET", timeout: 15000, headers: { "User-Agent": "keep-alive" } },
//         (resp) => {
//           // drain data to free socket
//           resp.on("data", () => {});
//           resp.on("end", () => {});
//         }
//       );
//       req.on("timeout", () => req.destroy(new Error("keep-alive timeout")));
//       req.on("error", () => {});
//       req.end();
//     } catch {
//       // ignore
//     }
//   }, keepAliveIntervalMs).unref?.();

//   console.log(`[keep-alive] enabled: ${keepAliveUrl} every ${keepAliveIntervalMs}ms`);
// }