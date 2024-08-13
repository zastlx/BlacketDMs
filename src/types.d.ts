export interface Trade {
    users: unknown[];
    room: number;
}

export interface TradeOngoingResponse {
    error: boolean;
    requests: Request;
    trade: Trade;
}

export interface Mouseover {
    type: string;
    origType: string;
    data?: any;
    guid: number;
    namespace: string;
    handler: Function;
}

export interface Mouseout {
    type: string;
    origType: string;
    data?: any;
    guid: number;
    namespace: string;
    handler: Function;
}

export interface Contextmenu {
    type: string;
    origType: string;
    guid: number;
    namespace: string;
    handler: Function;
}

export interface Event {
    mouseover: Mouseover[];
    mouseout: Mouseout[];
    contextmenu: Contextmenu[];
}

export interface jQueryInternalsType {
    events: Event;
    handle: Function;
}