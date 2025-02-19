import { WebView } from "./webview2";

type Options = {
  autoInitialize?: boolean;
  timeoutMs: number;
};

type SMARTMessagingParams = {
  origin: string;
  handle: string;
};

type RequestMessage = {
  messagingHandle: string;
  messageId: string;
  messageType: string;
  payload: Record<string, unknown>;
};

type ResponseMessage = {
  messageId: string;
  responseToMessageId: string;
  additionalResponseExpected?: boolean;
  payload: Record<string, unknown>;
};

function withTimeout<T>(promise: Promise<T>, ms: number) {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Operation timed out after ${ms} ms`)),
      ms,
    ),
  );
  return Promise.race([promise, timeout]);
}

export type Status = "connecting" | "ready" | "disconnected" | "error";

export class SMARTWebMessagingConnector {
  private _isInitialized: boolean;
  private _status: Status;
  public readonly timeoutMs: number;
  public readonly params: SMARTMessagingParams;
  public readonly window: Window | WebView;
  constructor(
    window: Window,
    params: SMARTMessagingParams,
    options: Options = { timeoutMs: 500 },
  ) {
    this._isInitialized = false;
    this._status = "disconnected";
    console.debug(
      `Creating connector with handle='${params.handle}' for origin='${params.origin}'`,
    );
    this.params = params;
    this.window = window;
    this.timeoutMs = options.timeoutMs;
    if (options.autoInitialize) {
      this.initialize();
    }
  }
  get isInitialized() {
    return this._isInitialized;
  }
  static generateMessageId() {
    return Math.random().toString(36).substring(2, 15);
  }
  public async ensureInitialized(onStatusChange?: (status: Status) => void) {
    console.debug("Ensure connection is established.");
    if (!this._isInitialized) {
      await this.initialize(onStatusChange);
    }
  }
  public async sendMessage<
    TRequestMessage extends Pick<RequestMessage, "messageType" | "payload">,
    TResponseMessage extends Pick<ResponseMessage, "payload">,
  >(
    messageType: TRequestMessage["messageType"],
    payload: TRequestMessage["payload"] = {},
  ): Promise<ResponseMessage & TResponseMessage> {
    /** Message Header */
    const messageId = SMARTWebMessagingConnector.generateMessageId();
    const messagingHandle = this.params.handle;

    return new Promise<ResponseMessage & TResponseMessage>((resolve) => {
      const message = { messageType, payload, messageId, messagingHandle };
      const resonseHandler = (event: unknown) => {
        const response = (
          event as MessageEvent<ResponseMessage & TResponseMessage>
        ).data;
        if (response.responseToMessageId === messageId) {
          resolve(response);
          if (!response.additionalResponseExpected)
            this.window.removeEventListener("message", resonseHandler);
        }
      };
      this.window.postMessage(message, this.params.origin);
      this.window.addEventListener("message", resonseHandler);
    });
  }
  async initialize(onStatusChange?: (status: Status) => void) {
    if (this._status == "connecting") return;
    console.debug("Establishing connection.");
    this._status = "connecting";
    onStatusChange?.(this._status);
    try {
      await withTimeout(this.sendMessage("status.handshake"), this.timeoutMs);
    } catch {
      this._status = "error";
      onStatusChange?.(this._status);
      console.debug("Connection failed");
      return;
    }
    this._status = "ready";
    onStatusChange?.(this._status);
    this._isInitialized = true;
    console.debug("Connection established.");
  }
  get status() {
    return this._status;
  }
  close() {
    this.sendMessage("ui.close");
  }
}
