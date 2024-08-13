import { DmStore } from "#store";
import { jQueryInternalsType, TradeOngoingResponse } from "#types";
import { after, instead } from "spitroast";

declare global {
    interface Window {
        // cba to type the global, death might be releasing his typing for bbv3 soon
        blacket: any;
        bb: any | undefined;
    }
}

const store = new DmStore();

// best way i could come up with to run after blacket's defined :/
let getHooked = false;
let appendChatHooked = false;
let isCreatingDm = false;
const BBPresent = window.bb?.plugins?.active?.includes("Better Chat");

const hook = async () => {
    if (!window.blacket) return setTimeout(hook, 1);

    if (!getHooked) {
        // show our dms in the room switcher
        instead("get", window.blacket.requests, (args, oFunc) => {
            if (args[0] === "/worker/my-rooms") {
                return oFunc(args[0], async (oFuncRes: any) => {
                    if (oFuncRes.error) return args[1](oFuncRes);
                    return args[1]({
                        error: false,
                        rooms: {
                            ...oFuncRes.rooms,
                            ...(await store.getFormattedDmObject())
                        }
                    });
                });
                // dont show the inital dm in the chat later when going into the dm, (the one we use to tell the recipient to create the dm on their side)
            } else if (args[0].startsWith("/worker2/messages/") && !args[0].startsWith("/worker2/messages/0")) {
                return oFunc(args[0], async (oFuncRes: any) => {
                    if (oFuncRes.error || oFuncRes.messages.length == 0) return args[1](oFuncRes);
                    if (oFuncRes.messages.at(-1).message.content.startsWith("BDM-")) oFuncRes.messages.pop();

                    return args[1]({
                        error: false,
                        messages: oFuncRes.messages
                    });
                });
            }

            return oFunc(...args);
        });
        getHooked = true;
    }
    if (!window.blacket.appendChat) return setTimeout(hook, 1);

    if (!appendChatHooked) {
        // aids, essiently just hooking the context menu of every message, had to mess with jquery stuff to find the listeners
        after("appendChat", window.blacket, async (args) => {
            if (window.blacket.config.path === "trade" || args[0].room.name === "trade" || args[0].room.id !== window.blacket.chat.room) return;
            const elem = $(`#message-${args[0].message.id}`);
            let jQueryInternals: jQueryInternalsType;
            if (BBPresent) {
                // betterblacket chat plugin
                jQueryInternals = Object.entries(elem.siblings()[1].children[0].children[0]!).find((x) => x[0].includes("jQuery"))![1];
            } else {
                // normal
                jQueryInternals = Object.entries(elem.siblings()[1]).find((x) => x[0].includes("jQuery"))![1];
            }
            after("handler", jQueryInternals.events.contextmenu[0], async () => {
                $(".styles__contextMenuContainer___3jAmv-camelCase").append("<div class=\"styles__contextMenuItemContainer___m3Xa3-camelCase\" id=\"user-context-message\"><div class=\"styles__contextMenuItemName___vj9a3-camelCase\">Message</div><i class=\"styles__contextMenuItemIcon___2Zq3a-camelCase fas fa-message\"></i></div>")
                    .on("click", "#user-context-message", async () => {
                        // they should always be cached, but just to be safe.
                        const user: any = window.blacket.chat.cached.users[elem[0].getAttribute("data-user-id")!] ?? await store.getUser(elem[0].getAttribute("data-user-id")!);
                        const dmWithUser = store.getDmWithUser(user.id);
                        if (dmWithUser) return window.blacket.switchToRoom("[DM] " + user.username, parseInt(dmWithUser.id));
                        isCreatingDm = true;
                        window.blacket.createToast({
                            title: "Info",
                            message: "User is not in your DMs, attempting to create DM.",
                            icon: "/content/blooks/Info.webp",
                            time: 6000
                        });
                        // send the trade, rest of logic is in the socket listeners
                        window.blacket.requests.post("/worker/trades/requests/send", {
                            user: elem[0].getAttribute("data-user-id")
                        });
                    });
            });
        });
        appendChatHooked = true;
    }
    if (!window.blacket.socket.listeners["trading-requests-accepted"] || !window.blacket.socket.listeners["messages-create"]) return setTimeout(hook, 1);

    // listen for the intial message to add a dm to your store (could probably be done better)
    after("messages-create", window.blacket.socket.listeners, (args) => {
        if (args[0].data.message.content.startsWith("BDM-") && args[0].data.room.name === "trade" && args[0].data.message.user !== window.blacket.user.id) {
            const [room, user] = atob(args[0].data.message.content.split("BDM-")[1]).split("|");
            store.openDm(room, user);
        }
    });
    // listen for the trade request being accepted, then create the dm
    instead("trading-requests-accepted", window.blacket.socket.listeners, (args, oFunc) => {
        if (isCreatingDm) {
            window.blacket.requests.get("/worker/trades/ongoing", (res: TradeOngoingResponse) => {
                store.openDm(res.trade.room.toString(), Object.keys(res.trade.users).find((x) => x !== window.blacket.user.id)!);
                // the timing here is to wait for the reciept to connect to the socket, could probably be tweaked.
                setTimeout(() => {
                    window.blacket.socket.emit("messages-create", {
                        room: res.trade.room,
                        content: `BDM-${btoa(`${res.trade.room}|${window.blacket.user.id}`)}`
                    });
                    setTimeout(() => {
                        window.blacket.socket.emit("trading-ongoing-decline");
                        isCreatingDm = false;
                        window.blacket.createToast({
                            title: "Success",
                            message: "User accepted the trade request, DM created, reload to see the room.",
                            icon: "/content/blooks/Success.webp",
                            time: 6000
                        });
                    }, 1000);
                }, 4500);
            });
            return;
        }

        return oFunc(...args);
    });
    instead("trading-requests-declined", window.blacket.socket.listeners, (args, oFunc) => {
        if (isCreatingDm) {
            isCreatingDm = false;
            window.blacket.createToast({
                title: "Error",
                message: "User declined the trade request, failed to create DM.",
                icon: "/content/blooks/Error.webp",
                time: 6000
            });
            return;
        }

        return oFunc(...args);
    });

    // for our userscript settings
    if (window.blacket.config.path == "settings") {
        $(".styles__mainContainer___4TLvi-camelCase").append("<div class=\"styles__infoContainer___2uI-S-camelCase\"><div class=\"styles__headerRow___1tdPa-camelCase\"><i class=\"fas fa-message styles__headerIcon___1ykdN-camelCase\" aria-hidden=\"true\"></i><div class=\"styles__infoHeader___1lsZY-camelCase\">BlacketDMs</div></div><div><a id=\"backupDmsBtn\" class=\"styles__link___5UR6_-camelCase\">Backup DMs</a></div><div><a id=\"importDmsBtn\" class=\"styles__link___5UR6_-camelCase\">Import DMs</a></div><div><a id=\"clearDmsBtn\" class=\"styles__link___5UR6_-camelCase\">Clear DMs</a></div><p style=\"padding: 0;margin: 0;font-size: 0.7rem;color: #c2bbbb;\">made by zastix, <a href=\"https://zastix.club/\" target=\"_blank\">https://zastix.club/</a></p></div>");

        const downloadText = async (text: string, filename: string) => {
            const blob = new Blob([text], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
        };

        $("#backupDmsBtn").on("click", async () => {
            const dms = JSON.stringify(store.getDms());
            downloadText(dms, `blacketDmsBackup-${Date.now()}.json`);
        });

        $("#importDmsBtn").on("click", async () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".json";
            input.click();
            input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async () => {
                    const dms = JSON.parse(reader.result as string);
                    store.setDms(dms);
                    window.blacket.createToast({
                        title: "Success",
                        message: "DMs imported successfully, reload to see the changes.",
                        icon: "/content/blooks/Success.webp",
                        time: 6000
                    });
                };
                reader.readAsText(file);
            };
        });

        $("#clearDmsBtn").on("click", async () => {
            if (!confirm("Are you sure you want to clear all DMs? This is irreversible")) return;

            store.setDms([]);
            window.blacket.createToast({
                title: "Success",
                message: "DMs cleared successfully, reload to see the changes.",
                icon: "/content/blooks/Success.webp",
                time: 6000
            });
        });
    }
};

hook();