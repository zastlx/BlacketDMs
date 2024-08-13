interface DM {
    id: string; // room id
    person: string; // the person who the DM is with, their id
}

export interface Clan {
    id: string;
    name: string;
    color: string;
    room: number;
}

export interface Misc {
    opened: number;
    messages: number;
}

export interface Setting {
    friends: string;
    requests: string;
}

export interface User {
    id: number;
    username: string;
    created: number;
    modified: number;
    avatar: string;
    banner: string;
    badges: string[];
    blooks: Record<string, number>;
    tokens: number;
    perms: string[];
    clan: Clan;
    role: string;
    color: string;
    exp: number;
    inventory: string[];
    mute?: any;
    ban?: any;
    misc: Misc;
    friends: number[];
    blocks: any[];
    claimed: string;
    settings: Setting;
    otp: boolean;
    moneySpent: number;
}

export class DmStore {
    private dms: DM[] = [];

    constructor() {
        const _dms = localStorage.getItem("dms");

        if (_dms) {
            try {
                this.dms = JSON.parse(_dms);
            } catch (error) {
                console.error("Error parsing dms", error);
                localStorage.setItem("dms", JSON.stringify(this.dms));
            }
        }
    }

    private saveDms() {
        localStorage.setItem("dms", JSON.stringify(this.dms));
    }

    public async getUser(idOrName: string) {
        return new Promise((resolve, reject) => {
            window.blacket.requests.get("/worker2/user/" + idOrName, (res: any) => {
                if (res.error) return reject(res.error);
                resolve(res.user);
            });
        });
    }

    public getDmWithUser(userId: string): DM | undefined {
        return this.dms.find((dm) => dm.person == userId);
    }

    public closeDm(dmId: string) {
        this.dms = this.dms.filter((dm) => dm.id !== dmId);
        this.saveDms();
    }

    public openDm(id: string, person: string) {
        if (this.dms.find((dm) => dm.id === id)) return;

        this.dms.push({
            id,
            person
        });
        this.saveDms();
    }

    public getDms() {
        return this.dms;
    }

    public setDms(dms: DM[]) {
        this.dms = dms;
        this.saveDms();
    }

    public getDmsObject() {
        return this.dms.reduce((acc, dm) => {
            acc[dm.id] = dm;
            return acc;
        }, {} as Record<string, DM>);
    }

    public async getFormattedDmObject() {
        const newDms: Record<string, {
            name: string;
            date: number;
        }> = {};

        for (const dm of this.dms) {
            const user = window.blacket.chat.cached.users[dm.person] ?? await this.getUser(dm.person);
            newDms[dm.id] = {
                name: `[DM] ${user.username}`,
                date: 0
            };
        }

        return newDms;
    }
}