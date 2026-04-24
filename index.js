import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import { Message } from './utils/Messages.js';
import router from './routes/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from "socket.io";
import http from "http";
import https from "https";
import fs from "fs";
import { startPayoutScheduler } from "./services/payoutScheduler.js";
const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
import initSocket from "./socket/index.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;
const profileDirectory = path.join(__dirname, "public/profile");

app.set('view engine', 'ejs');
app.set('view', path.join(__dirname, 'view'));

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/api/profile/:fileName", (req, res) => {
    res.sendFile(path.join(profileDirectory, req.params.fileName), (error) => {
        if (!error) return;

        if (error.code === "ENOENT") {
            return res.status(404).json({ message: "Image not found" });
        }

        return res.status(500).json({ message: "Unable to load image" });
    });
});
app.use(
    "/api/profile",
    express.static(path.join(__dirname, "public/profile"), { fallthrough: false })
);
app.use('/api', router);
// static image access
app.use('/api', express.static('public'));

app.use("/", (req, res) => {
    res.send(`server is runing at port ${PORT}`);
})
const today = new Date().toISOString().split("T")[0];
console.log(today);

// app.listen(PORT, () => {
//     console.log(`${Message.serverRunning} ${PORT}`)
// });

// https
//     .createServer(
//         {
//             ca: fs.readFileSync("/var/www/html/ssl/ca_bundle.crt"),
//             key: fs.readFileSync("/var/www/html/ssl/private.key"),
//             cert: fs.readFileSync("/var/www/html/ssl/certificate.crt"),
//         },
//         app
//     )
//     .listen(PORT, () => {
//         console.log(`serever is runing at port ${PORT}`);
//     });


// HTTP Server
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
    cors: { origin: "*" },
});

initSocket(io);

// ONLY THIS LISTEN
server.listen(PORT, () => {
    console.log(`${Message.serverRunning}--> ${PORT}`);
    startPayoutScheduler();
});
