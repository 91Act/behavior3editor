import { app, BrowserWindow, Menu, MenuItem, dialog, nativeTheme, ipcMain } from "electron";
import AppMenu from "./AppMenu";
import Settings from "./Settings";
import MainEventType from "../common/MainEventType";
import electronLocalshortcut from "electron-localshortcut";
import http from "http";
import * as WebSocket from "ws";
import { AIHotReloadInfo, BehaviorTreeModel } from "../common/BehaviorTreeModel";

// 一些暴露给render-process的全局变量
export interface Global {
    settings: Settings;
}
declare var global: Global;

export class MainProcess {
    mainWindow: BrowserWindow;
    appMenu: AppMenu;
    settings: Settings;
    listeners: string[]
    constructor() {
        nativeTheme.themeSource = "dark";
        app.on("ready", () => {
            this.createWindow();
            electronLocalshortcut.register(this.mainWindow, "Ctrl+C", () => {
                this.mainWindow.webContents.send(MainEventType.COPY_NODE);
            });
            electronLocalshortcut.register(this.mainWindow, "Ctrl+V", () => {
                this.mainWindow.webContents.send(MainEventType.PASTE_NODE);
            });
        });
        app.on("window-all-closed", () => {
            if (process.platform !== "darwin") {
                app.quit();
            }
        });
        app.on("activate", () => {
            if (this.mainWindow === null) {
                this.createWindow();
            }
        });
    }

    createWindow() {
        this.settings = new Settings();
        global.settings = this.settings;
        this.listeners = [];

        this.mainWindow = new BrowserWindow({
            width: 1280,
            height: 800,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
            // fullscreenable:false,
            // maximizable:false
        });

        require("@electron/remote/main").initialize();
        require("@electron/remote/main").enable(this.mainWindow.webContents);
        this.mainWindow.maximize();
        // this.mainWindow.webContents.openDevTools();
        this.mainWindow.loadFile("index.html");
        this.mainWindow.on("closed", function () {
            this.mainWindow = null;
        });
        // console.log(this.mainWindow.webContents.getOSProcessId())
        this.appMenu = new AppMenu(this);
        this.rebuildMenu();

        this.createAIDebugServer()
    }

    createAIDebugServer() {

        this.mainWindow.webContents.once("did-finish-load", () => {

            const port = 4444;
            const server = http.createServer();
            const wss = new WebSocket.Server({ server });

            wss.on("connection", (ws: WebSocket) => {
                let hotReloadCallback = (event: any, hotReloadInfo: AIHotReloadInfo) => {
                    (hotReloadInfo as any)["typeof"] = "AIHotReloadInfo"
                    ws.send(JSON.stringify(hotReloadInfo))
                }
                let rebuildTreeCallback = (event: any, treeModel: BehaviorTreeModel) => {
                    (treeModel as any)["typeof"] = "BehaviorTreeModel"
                    ws.send(JSON.stringify(treeModel))
                }
                //connection is up, let's add a simple simple event
                ws.on("message", (message: string) => {
                    if (this.mainWindow.isDestroyed() || this.mainWindow.webContents.isDestroyed()) {
                        return;
                    }
                    //log the received message and send it back to the client
                    let jsonContent = JSON.parse(message)
                    // console.log("received: %s", json_content);
                    this.mainWindow.webContents.send(MainEventType.SEND_DEBUG_INFO, jsonContent["name"], jsonContent["frameDebugInfo"]);
                    let hotReloadName = `AI_PROP_CHANGED_${jsonContent["name"]}`
                    if (this.listeners.indexOf(hotReloadName) == -1) {
                        this.listeners.push(hotReloadName)
                        ipcMain.on(hotReloadName, hotReloadCallback)
                    }
                    let rebuildName = `AI_REBUILD_${jsonContent["name"]}`
                    if (this.listeners.indexOf(rebuildName) == -1) {
                        this.listeners.push(rebuildName)
                        ipcMain.on(rebuildName, rebuildTreeCallback)
                    }
                    // ws.send(`Hello, you sent -> ${message}`);
                });
                ws.on("close", () => {
                    if (this.mainWindow.isDestroyed() || this.mainWindow.webContents.isDestroyed()) {
                        return;
                    }
                    this.listeners.forEach((listenerName) => {
                        ipcMain.removeListener(listenerName, hotReloadCallback)
                    });
                    this.listeners.length = 0;
                })


                //send immediatly a feedback to the incoming connection
                // ws.send("Hi there, I am a WebSocket server");
            });

            //start our server
            server.listen(port, () => {
                console.log(`Data stream server started on port ${port}`);
            });
            // var http = require("http");
            const serverStartTime = new Date()
            // const httpServer = createServer((request: IncomingMessage, response: ServerResponse) => {
            //     // console.log(request.url)
            //     // if (request.url == '/123') {
            //     //     let body: any[] = [];
            //     //     request.on("end", () => {
            //     //         console.log("request body are:")
            //     //         console.log(Buffer.concat(body).toString());
            //     //     }).on("error", (err) => {
            //     //         console.error(err);
            //     //     }).on("data", (chunk) => {
            //     //         body.push(chunk);
            //     //     })
            //     //     response.end(`ah, you send 123.`);
            //     // } else {
            //     //     const remoteAddress = response.socket.remoteAddress;
            //     //     const remotePort = response.socket.remotePort;
            //     //     response.end(`Your IP address is ${remoteAddress} and your source port is ${remotePort}.`);
            //     // }
            //     if (request.url === "/status") {
            //         response.writeHead(200, { "Content-Type": "application/json" });

            //         const responseObject = {
            //             serverStarted: serverStartTime,
            //         };

            //         response.end(JSON.stringify(responseObject));
            //     } else {
            //         response.writeHead(404, { "Content-Type": "text/plain" });
            //         response.end("Sorry, unknown url");
            //     }
            // });
            // httpServer.listen(this.HTPP_PORT_LISTEN);
            // console.log("http://localhost:" + this.HTPP_PORT_LISTEN);

            // Create WebSocket server


            // Handle WebSocket clients emits
            // wsServer.on("request", (request: request) => {
            //     const connection = request.accept(request.origin);

            //     connection.on("message", (message: Message) => {
            //         if (message.type === "utf8") {
            //             console.log(`Received Message: ${message.utf8Data}`);
            //             // connection.sendUTF(message.utf8Data); // reply message to client
            //         }
            //         else if (message.type === "binary") {
            //             console.log(`Received Binary Message of ${message.binaryData.length} bytes`);
            //             // connection.sendBytes(message.binaryData); // reply message to client
            //         }
            //     });

            //     connection.on("close", (code: number, message: string) => {
            //         console.log(`Client disconnected. Reason: ${message}`);
            //     });
            // });
        });
    }

    rebuildMenu() {
        Menu.setApplicationMenu(this.appMenu.createMenu());
    }
}

export default new MainProcess();
